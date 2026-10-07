import { getGame, fillBotSeats, BotRunner, botTurnDelay, nextBotMove } from "./game-core/index.js";
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
    this.bots = [];
    this.botRunner = new BotRunner(() => this.closed || this.canRunBots?.() === false ? null : nextBotMove(this.engine, this.state, this.bots.map(p => p.id)),
      ({playerId, action}) => { this.state = this.engine.applyAction(this.state, playerId, action); this.sendViews(); },
      error => this.onChange({kind: 'error', message: String(error.message || error)}), botTurnDelay(this.engine.id));
    this.publishLobby();
  }

  players() {
    return [
      { id: HOST_ID, name: this.hostName, isHost: true },
      ...[...this.connections.values()].map(({ id, name }) => ({ id, name, isHost: false })),
      ...this.bots,
    ];
  }

  publishLobby() {
    const players = this.players();
    this.onChange({ kind: "lobby", players, gameId: this.engine.id, roomName: this.roomName });
    this.broadcast(say("lobby", { players, gameId: this.engine.id, roomName: this.roomName }));
  }

  fillWithBots() {
    if (this.closed || this.started) throw new Error('La mesa ya no admite jugadores.');
    this.bots.push(...fillBotSeats(this.players(), this.engine.maxPlayers));
    this.publishLobby();
  }

  removePlayer(id) {
    if (this.started || !this.bots.some(p => p.id === id)) return;
    this.bots = this.bots.filter(p => p.id !== id);
    this.publishLobby();
  }

  async createOfflineInvite() {
    if (this.closed) throw new Error("La sala está cerrada.");
    if (this.started) throw new Error("La partida ya ha empezado.");
    if (this.players().length >= this.engine.maxPlayers) throw new Error("La sala está completa.");
    const peer = await makeOffer(
      (message) => this.handleMessage(peer.peerId, message),
      () => {},
      () => this.handleClose(peer.peerId)
    );
    this.peers.set(peer.peerId, peer);
    return peer.code;
  }

  async acceptOfflineAnswer(answerCode) {
    const answer = await decodeSignal(answerCode);
    if (answer.type !== "answer") throw new Error("Escanea el QR de respuesta del invitado.");
    const peer = this.peers.get(answer.peerId);
    if (!peer) throw new Error("Esta respuesta es de otra invitación o ya caducó.");
    await peer.acceptAnswer(answerCode);
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
      if (this.started || this.players().length >= this.engine.maxPlayers) {
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
    if (this.closed || this.started) throw new Error('La partida ya ha empezado o la sala está cerrada.');
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
      if (player.isBot) continue;
      const view = this.engine.view(this.state, player.id);
      if (player.id === HOST_ID) this.onChange({ kind: "game", players, gameId: this.engine.id, view });
      else this.connections.get(player.id)?.peer.send(say("state", { view }));
    }
    this.botRunner.schedule();
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
    this.botRunner.stop();
    this.broadcast(say('closed', { message: 'El anfitrión ha cerrado la sala.' }));
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    this.connections.clear();
  }
}

export class LocalGuestSession {
  constructor(playerName, onChange) {
    this.playerName = playerName;
    this.onChange = onChange;
    this.peer = null;
    this.playerId = null;
    this.gameId = null;
    this.players = [];
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

  handleMessage(message) {
    if (this.closed) return;
    if (!message || typeof message.type !== "string") return;
    if (message.type === 'closed') {
      this.closed = true;
      this.onChange({ kind: 'disconnected', message: message.data?.message || 'La sala ha terminado.' });
      this.peer?.close();
    } else if (message.type === "welcome") {
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
    this.peer?.send(say("leave"));
    this.peer?.close();
    this.peer = null;
  }
}
