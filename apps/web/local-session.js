import {BotPacing} from './bot-pacing.js';
import {MusFlowRunner} from './mus-flow.js';
import {characterProfile, AVATAR_TAKEN_MESSAGE} from './avatar-art.js';
import { getGame, createMusState, fillBotSeats, BotRunner, botTurnDelay, nextBotMove, departGame, absentMove, pendingActors, skipTurnState } from "./game-core/index.js";

const HOST_ID = "host";
// Quien pierde la conexión tiene este margen para volver antes de que se juegue por esa persona.
export const ABSENT_GRACE_MS = 15000;
const say = (type, data = {}) => ({ type, data });

export class LocalHostSession {
  constructor(gameId, hostName, roomName, onChange, character) {
    this.hostCharacter = characterProfile(character);
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
    this.graceMs = ABSENT_GRACE_MS;
    this.botPacing=new BotPacing();
    this.botRunner = new BotRunner(() => this.closed || this.canRunBots?.() === false ? null : nextBotMove(this.engine, this.state, this.botIds()) || absentMove(this.engine, this.state, this.autoIds()),
      ({playerId, action}) => { this.state = this.engine.applyAction(this.state, playerId, this.engine.id==='mus'?{...action,at:Date.now()}:action); this.sendViews(); },
      error => this.onChange({kind: 'error', message: String(error.message || error)}), () => this.botPacing.delay(this.nextIsAbsent() ? 1500 : botTurnDelay(this.engine.id)));
    this.musFlow=new MusFlowRunner(()=>({engine:this.engine,state:this.state,paused:this.waitingForReturn()}),action=>this.applyAction(HOST_ID,action),error=>this.onChange({kind:"error",message:error.message}));
    this.publishLobby();
  }

  players() {
    return [
      { id: HOST_ID, name: this.hostName, ...this.hostCharacter, away:Boolean(this.hostSittingOut), absent:Boolean(this.hostSittingOut), isHost: true },
      ...[...this.connections.values()].map(({ id, name, character, peer, sittingOut }) => ({ id, name, ...characterProfile(character), away:Boolean(sittingOut)||peer.connected===false||this.hasDeparted(id), absent:this.isAutoPlayed(id), isHost: false })),
      ...this.bots,
    ];
  }

  /** Ya se juega por esa persona (no solo está desconectada: se fue, se ausentó o pasó el margen). */
  isAutoPlayed(id) { return this.autoIds().includes(id); }

  hasDeparted(id) { return Boolean(this.state?.departed?.[id]); }

  /** Quién queda sin jugar: se fue de la partida, se ausentó a propósito o lleva demasiado sin conexión. */
  autoIds(now = Date.now()) {
    if (!this.state || this.state.finished) return [];
    const ids = new Set(Object.keys(this.state.departed || {}));
    if (this.hostSittingOut) ids.add(HOST_ID);
    for (const c of this.connections.values()) if (c.sittingOut || (c.peer.connected === false && c.awaySince && now - c.awaySince >= this.graceMs)) ids.add(c.id);
    return [...ids];
  }

  botIds() { return this.bots.map(p => p.id).filter(id => !this.hasDeparted(id)); }

  nextIsAbsent() { return Boolean(this.state) && !nextBotMove(this.engine, this.state, this.botIds()); }

  /** Mientras alguien acaba de perder la conexión la partida espera unos segundos a que vuelva. */
  waitingForReturn(now = Date.now()) {
    if (!this.started || this.engine.id === 'texas-holdem') return false;
    return [...this.connections.values()].some(c => c.peer.connected === false && !this.hasDeparted(c.id) && !(c.awaySince && now - c.awaySince >= this.graceMs));
  }

  /** Una persona deja de estar conectada: figura como ausente y, pasado el margen, se juega por ella. */
  markAway(id) {
    const connection = this.connections.get(id);
    if (!connection) return;
    connection.peer.connected = false;
    connection.awaySince = Date.now();
    this.publishLobby();
    if (this.started) {
      this.sendViews();
      clearTimeout(connection.awayTimer);
      connection.awayTimer = setTimeout(() => { if (!this.closed && connection.peer.connected === false) { this.publishLobby(); this.sendViews(); } }, this.graceMs + 50);
    }
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

  handleMessage(peerId, message) {
    if (this.closed || !message || typeof message.type !== "string") return;
    const connection = this.connections.get(peerId);
    if (message.type === "hello" && !connection) {
      const name = String(message.data?.name || "").trim();
      if (!name) {
        this.peers.get(peerId)?.send(say("error", { message: "Indica tu nombre para entrar." }));
        return;
      }
      const wanted = characterProfile(message.data?.character).character;
      const taken = this.players().map(player => player.character).filter(Number.isInteger);
      if (wanted !== undefined && taken.includes(wanted)) {
        this.peers.get(peerId)?.send(say("error", { message: AVATAR_TAKEN_MESSAGE, code: "avatar-taken", taken }));
        this.peers.delete(peerId);
        return;
      }
      if (this.started || this.players().length >= this.engine.maxPlayers) {
        this.peers.get(peerId)?.send(say("error", { message: this.started ? "La partida ya ha empezado." : "La sala está completa." }));
        this.peers.get(peerId)?.close();
        this.peers.delete(peerId);
        return;
      }
      this.connections.set(peerId, { id: peerId, name, ...characterProfile(message.data?.character), peer: this.peers.get(peerId) });
      this.peers.get(peerId)?.send(say("welcome", { playerId: peerId, gameId: this.engine.id }));
      this.publishLobby();
      if (this.started) this.sendViews();
      return;
    }
    if (!connection) return;
    if(message.type==='sit-out'&&this.engine.id==='texas-holdem'){
      connection.sittingOut=Boolean(message.data?.value);this.publishLobby();this.sendViews();
    } else if (message.type === "action") {
      this.applyAction(peerId, message.data?.action);
    } else if (message.type === "leave") {
      this.leaveGame(peerId);
      this.peers.get(peerId)?.close();
      this.handleClose(peerId);
    }
  }

  notify(message) {
    this.onChange({ kind: "notice", message });
    this.broadcast(say("notice", { message }));
  }

  /** Alguien sale a propósito de una partida en marcha: se avisa y, en una mesa de dos, gana quien se queda. */
  leaveGame(peerId) {
    if (!this.started || !this.state || this.state.finished) return;
    const name = this.connections.get(peerId)?.name || "Un jugador";
    this.notify(`${name} ha salido de la partida.`);
    this.state = departGame(this.engine.id, this.state, peerId, name); this.sendViews();
  }

  /** El anfitrión echa a alguien de la partida en marcha: su asiento deja de jugar y se le avisa. */
  kickPlayer(id) {
    if (id === HOST_ID) return;
    if (!this.started) { const peer = this.peers.get(id); if (peer) { peer.close(); this.handleClose(id); } return; }
    if (!this.state || this.state.finished || !this.state.players.includes(id) || this.hasDeparted(id)) return;
    const name = this.connections.get(id)?.name || this.bots.find(p => p.id === id)?.name || 'Un jugador';
    this.notify(`${name} ha sido expulsado de la partida.`);
    this.state = departGame(this.engine.id, this.state, id, name, true);
    this.sendViews();
    // The expelled player gets the final view first, then the connection closes.
    const peer = this.peers.get(id);
    if (peer) setTimeout(() => { peer.close(); this.handleClose(id); }, 400);
  }

  /** El anfitrión salta el turno de quien juega ahora: Parchís lo pierde y en el resto juega la IA por esa persona. */
  skipTurn() {
    if (!this.started || !this.state || this.state.finished) throw new Error('No hay ninguna partida en marcha.');
    const actor = pendingActors(this.engine, this.state).find(id => id !== HOST_ID);
    if (!actor) throw new Error('Ahora solo te toca jugar a ti.');
    const name = this.players().find(p => p.id === actor)?.name || 'Un jugador';
    this.state = skipTurnState(this.engine, this.state, actor);
    this.notify(`El anfitrión ha saltado el turno de ${name}.`);
    this.sendViews();
  }

  handleClose(peerId) {
    this.peers.delete(peerId);
    if(this.started){this.markAway(peerId);return;}
    if (this.connections.delete(peerId)) this.publishLobby();
  }

  startGame(seed, options = {}) {
    seed ??= this.engine.id==='mus'?crypto.getRandomValues(new Uint32Array(1))[0]:Date.now()>>>0;
    if (this.closed || this.started) throw new Error('La partida ya ha empezado o la sala está cerrada.');
    const players = this.players().map((player) => player.id);
    if (players.length < this.engine.minPlayers) throw new Error("Se necesitan al menos " + this.engine.minPlayers + " jugadores.");
    if (players.length > this.engine.maxPlayers) throw new Error("Este juego admite como máximo " + this.engine.maxPlayers + " jugadores.");
    this.state = this.engine.id==='mus'?createMusState(players,seed,'eight-kings',options.targetScore??40):this.engine.createInitialState(players, seed);
    this.started = true;
    this.broadcast(say("started"));
    this.sendViews();
    this.onChange({ kind: "game", players: this.players(), gameId: this.engine.id, view: this.engine.view(this.state, HOST_ID) });
  }

  broadcast(message) {
    for (const connection of this.connections.values()) connection.peer.send(message);
  }

  sendViews() {
    if(this.state)this.botPacing.observe(this.engine.view(this.state,HOST_ID),this.botRunner);
    if (!this.state) return;
    const players = this.players();
    for (const player of players) {
      if (player.isBot) continue;
      const view = this.engine.view(this.state, player.id);
      if (player.id === HOST_ID) this.onChange({ kind: "game", players, gameId: this.engine.id, view });
      else this.connections.get(player.id)?.peer.send(say("state", { view }));
    }
    this.botRunner.schedule();this.musFlow?.schedule();
  }

  setSittingOut(value){this.hostSittingOut=Boolean(value);this.publishLobby();this.sendViews();}

  applyLocalAction(action) {
    this.applyAction(HOST_ID, action);
  }

  applyAction(playerId, action) {
    if (!this.started || !this.state) return;
    try {
      if (this.hasDeparted(playerId)) throw new Error('Ya no estás en esta partida.');
      if(this.engine.id==='mus'&&this.waitingForReturn())throw new Error('La mesa está en pausa. Falta un jugador por volver a su plaza.');
      this.state = this.engine.applyAction(this.state, playerId, this.engine.id==='mus'?{...action,at:Date.now()}:action);
      this.sendViews();
    } catch (error) {
      if (playerId === HOST_ID) this.onChange({ kind: "error", message: error.message });
      else this.connections.get(playerId)?.peer.send(say("error", { message: error.message }));
    }
  }

  close() {
    this.closed = true;this.musFlow?.close();
    this.botRunner.stop();
    this.broadcast(say('closed', { message: 'El anfitrión ha cerrado la sala.' }));
    for (const peer of this.peers.values()) peer.close();
    this.peers.clear();
    this.connections.clear();
  }
}
