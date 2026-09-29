import { getGame } from "./game-core/index.js";
import { acceptOffer, decodeSignal, makeOffer } from "./local-transport.js";

const HOST_ID = "host";
const say = (type, data = {}) => ({ type, data });

export class LocalHostSession {
  constructor(gameId, hostName, roomName, onChange) {
    this.engine = getGame(gameId);
    this.hostName = hostName;
    this.roomName = roomName;
    this.onChange = onChange;
    this.connections = new Map();
    this.peers = new Map();
    this.requestPeers = new Map();
    this.answerStops = new Map();
    this.handledGuests = new Set();
    this.state = null;
    this.started = false;
    this.closed = false;
    this.signalRoom = null;
    this.publishLobby();
  }

  players() {
    return [
      { id: HOST_ID, name: this.hostName, isHost: true },
      ...[...this.connections.values()].map(({ id, name }) => ({ id, name, isHost: false })),
    ];
  }

  publishLobby() {
    const players = this.players();
    this.onChange({ kind: "lobby", players, gameId: this.engine.id, roomName: this.roomName });
    this.broadcast(say("lobby", { players, gameId: this.engine.id, roomName: this.roomName }));
  }

  async createInvite() {
    if (this.closed) throw new Error("La sala está cerrada.");
    if (this.signalRoom) return this.signalRoom.inviteUrl;
    const { createSignalRoom } = await import("./firebase-signal.js");
    this.signalRoom = await createSignalRoom(
      { gameId: this.engine.id, roomName: this.roomName, hostName: this.hostName },
      (requests) => this.handleJoinRequests(requests).catch((error) => {
        this.onChange({ kind: "error", message: error.message || "No se pudo procesar la invitación." });
      })
    );
    return this.signalRoom.inviteUrl;
  }

  async createOfflineInvite() {
    if (this.closed) throw new Error("La sala está cerrada.");
    if (this.started) throw new Error("La partida ya ha empezado.");
    if (this.connections.size + 1 >= this.engine.maxPlayers) throw new Error("La sala está completa.");
    const peer = await makeOffer(
      (message) => this.handleMessage(peer.peerId, message),
      () => {},
      () => this.handleClose(peer.peerId)
    );
    this.peers.set(peer.peerId, peer);
    return peer.code;
  }

  async acceptOfflineAnswer(answerCode) {
    const answer = decodeSignal(answerCode);
    if (answer.type !== "answer") throw new Error("Escanea el QR de respuesta del invitado.");
    const peer = this.peers.get(answer.peerId);
    if (!peer) throw new Error("Esta respuesta es de otra invitación o ya caducó.");
    await peer.acceptAnswer(answerCode);
  }

  async handleJoinRequests(requests) {
    for (const [guestUid, request] of Object.entries(requests)) {
      const playerName = String(request?.join?.name || "").trim();
      if (!playerName || this.handledGuests.has(guestUid)) continue;
      this.handledGuests.add(guestUid);

      if (this.started || this.connections.size + 1 >= this.engine.maxPlayers) {
        await this.signalRoom.publishOffer(guestUid, {
          error: this.started ? "La partida ya ha empezado." : "La sala está completa.",
        });
        continue;
      }

      try {
        const peer = await makeOffer(
          (message) => this.handleMessage(peer.peerId, message),
          () => {},
          () => this.handleClose(peer.peerId)
        );
        this.peers.set(peer.peerId, peer);
        this.requestPeers.set(guestUid, { peerId: peer.peerId, name: playerName });
        await this.signalRoom.publishOffer(guestUid, { code: peer.code });
        let answerAccepted = false;
        const stop = this.signalRoom.watchAnswer(guestUid, async (answerCode) => {
          if (typeof answerCode !== "string" || answerAccepted) return;
          answerAccepted = true;
          try {
            await peer.acceptAnswer(answerCode);
          } catch (error) {
            answerAccepted = false;
            this.onChange({ kind: "error", message: error.message || "No se pudo completar la conexión del invitado." });
          }
        });
        this.answerStops.set(guestUid, stop);
      } catch (error) {
        await this.signalRoom.publishOffer(guestUid, { error: error.message || "No se pudo preparar la invitación." });
      }
    }
  }

  handleMessage(peerId, message) {
    if (this.closed || !message || typeof message.type !== "string") return;
    const connection = this.connections.get(peerId);
    if (message.type === "hello" && !connection) {
      const name = String(message.data?.name || "").trim();
      if (!name) {
        this.peers.get(peerId)?.send(say("error", { message: "Indica tu nombre para entrar." }));
        return;
      }
      if (this.started || this.connections.size + 1 >= this.engine.maxPlayers) {
        this.peers.get(peerId)?.send(say("error", { message: this.started ? "La partida ya ha empezado." : "La sala está completa." }));
        this.peers.get(peerId)?.close();
        this.peers.delete(peerId);
        return;
      }
      this.connections.set(peerId, { id: peerId, name, peer: this.peers.get(peerId) });
      this.peers.get(peerId)?.send(say("welcome", { playerId: peerId, gameId: this.engine.id }));
      this.publishLobby();
      if (this.started) this.sendViews();
      return;
    }
    if (!connection) return;
    if (message.type === "action") {
      this.applyAction(peerId, message.data?.action);
    } else if (message.type === "leave") {
      this.peers.get(peerId)?.close();
      this.handleClose(peerId);
    }
  }

  handleClose(peerId) {
    this.peers.delete(peerId);
    const requestEntry = [...this.requestPeers.entries()].find(([, entry]) => entry.peerId === peerId);
    if (requestEntry) {
      const [guestUid] = requestEntry;
      this.requestPeers.delete(guestUid);
      this.answerStops.get(guestUid)?.();
      this.answerStops.delete(guestUid);
      this.handledGuests.delete(guestUid);
      this.signalRoom?.removeGuest(guestUid).catch(() => {});
    }
    if (this.connections.delete(peerId)) this.publishLobby();
  }

  startGame(seed = Date.now() >>> 0) {
    const players = this.players().map((player) => player.id);
    if (players.length < this.engine.minPlayers) throw new Error("Se necesitan al menos " + this.engine.minPlayers + " jugadores.");
    if (players.length > this.engine.maxPlayers) throw new Error("Este juego admite como máximo " + this.engine.maxPlayers + " jugadores.");
    this.state = this.engine.createInitialState(players, seed);
    this.started = true;
    this.broadcast(say("started"));
    this.sendViews();
    this.onChange({ kind: "game", players: this.players(), gameId: this.engine.id, view: this.engine.view(this.state, HOST_ID) });
  }

  broadcast(message) {
    for (const connection of this.connections.values()) connection.peer.send(message);
  }

  sendViews() {
    if (!this.state) return;
    const players = this.players();
    for (const player of players) {
      const view = this.engine.view(this.state, player.id);
      if (player.id === HOST_ID) this.onChange({ kind: "game", players, gameId: this.engine.id, view });
      else this.connections.get(player.id)?.peer.send(say("state", { view }));
    }
  }

  applyLocalAction(action) {
    this.applyAction(HOST_ID, action);
  }

  applyAction(playerId, action) {
    if (!this.started || !this.state) return;
    try {
      this.state = this.engine.applyAction(this.state, playerId, action);
      this.sendViews();
    } catch (error) {
      if (playerId === HOST_ID) this.onChange({ kind: "error", message: error.message });
      else this.connections.get(playerId)?.peer.send(say("error", { message: error.message }));
    }
  }

  close() {
    this.closed = true;
    for (const stop of this.answerStops.values()) stop();
    this.answerStops.clear();
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    this.connections.clear();
    this.requestPeers.clear();
    this.signalRoom?.close().catch(() => {});
  }
}

export class LocalGuestSession {
  constructor(roomId, playerName, onChange) {
    this.roomId = roomId;
    this.playerName = playerName;
    this.onChange = onChange;
    this.peer = null;
    this.signal = null;
    this.stopOffer = null;
    this.playerId = null;
    this.gameId = null;
    this.players = [];
  }

  async connect() {
    const { requestRoomJoin } = await import("./firebase-signal.js");
    this.signal = await requestRoomJoin(this.roomId, this.playerName);
    this.gameId = this.signal.meta.gameId;
    this.roomName = this.signal.meta.roomName;
    this.stopOffer = this.signal.watchOffer((offer) => {
      if (!offer || this.peer) return;
      if (offer.error) {
        this.onChange({ kind: "error", message: offer.error });
        return;
      }
      if (typeof offer.code === "string") {
        this.acceptInvite(offer.code).catch((error) => {
          this.onChange({ kind: "error", message: error.message || "No se pudo entrar en la sala." });
        });
      }
    });
    this.onChange({
      kind: "lobby", players: this.players, gameId: this.gameId,
      roomName: this.roomName, connected: false,
    });
  }

  async connectOffline(offerCode) {
    const peer = await acceptOffer(
      offerCode,
      (message) => this.handleMessage(message),
      () => this.peer?.send(say("hello", { name: this.playerName })),
      () => this.onChange({ kind: "disconnected", message: "Se perdió la conexión local. Comprueba que ambos móviles siguen en la misma Wi-Fi." })
    );
    this.peer = peer;
    this.answerCode = peer.answerCode;
    this.roomName = "Sala sin internet";
    this.onChange({ kind: "lobby", players: [], roomName: this.roomName, connected: false });
    return peer.answerCode;
  }

  async acceptInvite(offerCode) {
    const peer = await acceptOffer(
      offerCode,
      (message) => this.handleMessage(message),
      () => this.peer?.send(say("hello", { name: this.playerName })),
      () => this.onChange({ kind: "disconnected", message: "Se perdió la conexión con la sala. Escanea de nuevo el QR del anfitrión." })
    );
    this.peer = peer;
    await this.signal.publishAnswer(peer.answerCode);
  }

  handleMessage(message) {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "welcome") {
      this.playerId = message.data.playerId;
      this.gameId = message.data.gameId;
      this.onChange({ kind: "lobby", playerId: this.playerId, players: this.players, gameId: this.gameId, roomName: this.roomName, connected: true });
    } else if (message.type === "lobby") {
      this.players = message.data.players || [];
      this.gameId = message.data.gameId;
      this.onChange({ kind: "lobby", playerId: this.playerId, players: this.players, gameId: this.gameId, roomName: this.roomName, connected: true });
    } else if (message.type === "started") {
      this.onChange({ kind: "started" });
    } else if (message.type === "state") {
      this.onChange({ kind: "game", playerId: this.playerId, players: this.players, gameId: this.gameId, view: message.data.view });
    } else if (message.type === "error") {
      this.onChange({ kind: "error", message: message.data?.message || "No se pudo completar la acción." });
    }
  }

  sendAction(action) {
    if (!this.peer?.send(say("action", { action }))) throw new Error("Se perdió la conexión con quien creó la sala.");
  }

  leave() {
    this.stopOffer?.();
    this.peer?.send(say("leave"));
    this.peer?.close();
    this.peer = null;
  }
}
