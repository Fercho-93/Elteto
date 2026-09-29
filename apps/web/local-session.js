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
    this.state = null;
    this.started = false;
    this.closed = false;
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
    this.broadcast(say("lobby", { players, gameId: this.engine.id }));
  }

  broadcast(message) {
    for (const connection of this.connections.values()) connection.peer.send(message);
  }

  async createInvite() {
    if (this.closed) throw new Error("La sala está cerrada.");
    const peer = await makeOffer(
      (message) => this.handleMessage(peer.peerId, message),
      () => {},
      () => this.handleClose(peer.peerId)
    );
    this.peers.set(peer.peerId, peer);
    return peer.code;
  }

  async acceptAnswer(code) {
    const signal = decodeSignal(code);
    const peer = this.peers.get(signal.peerId);
    if (!peer) throw new Error("No encuentro esa invitación. Genera una nueva y vuelve a intentarlo.");
    await peer.acceptAnswer(code);
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
    if (this.connections.delete(peerId)) this.publishLobby();
  }

  startGame(seed = Date.now() >>> 0) {
    const players = this.players().map((player) => player.id);
    if (players.length < this.engine.minPlayers) throw new Error(`Se necesitan al menos ${this.engine.minPlayers} jugadores.`);
    if (players.length > this.engine.maxPlayers) throw new Error(`Este juego admite como máximo ${this.engine.maxPlayers} jugadores.`);
    this.state = this.engine.createInitialState(players, seed);
    this.started = true;
    this.broadcast(say("started"));
    this.sendViews();
    this.onChange({ kind: "game", players: this.players(), gameId: this.engine.id, view: this.engine.view(this.state, HOST_ID) });
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
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    this.connections.clear();
  }
}

export class LocalGuestSession {
  constructor(offerCode, playerName, onChange) {
    this.offerCode = offerCode;
    this.playerName = playerName;
    this.onChange = onChange;
    this.peer = null;
    this.answerCode = "";
    this.playerId = null;
    this.gameId = null;
    this.players = [];
  }

  async connect() {
    this.peer = await acceptOffer(
      this.offerCode,
      (message) => this.handleMessage(message),
      () => this.peer?.send(say("hello", { name: this.playerName })),
      () => this.onChange({ kind: "disconnected", message: "Se perdió la conexión con la sala. Comprueba la Wi-Fi y vuelve a pedir una invitación." })
    );
    this.answerCode = this.peer.answerCode;
    this.onChange({ kind: "lobby", players: this.players, gameId: this.gameId, answerCode: this.answerCode, connected: false });
    return this.answerCode;
  }

  handleMessage(message) {
    if (!message || typeof message.type !== "string") return;
    if (message.type === "welcome") {
      this.playerId = message.data.playerId;
      this.gameId = message.data.gameId;
      this.onChange({ kind: "lobby", playerId: this.playerId, players: this.players, gameId: this.gameId, answerCode: this.answerCode, connected: true });
    } else if (message.type === "lobby") {
      this.players = message.data.players || [];
      this.gameId = message.data.gameId;
      this.onChange({ kind: "lobby", players: this.players, gameId: this.gameId, answerCode: this.answerCode, connected: true });
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
    this.peer?.send(say("leave"));
    this.peer?.close();
    this.peer = null;
  }
}
