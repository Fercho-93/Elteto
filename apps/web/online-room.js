import { getGame } from "./game-core/index.js";
import { connectFirebase } from "./firebase-client.js";
import { createRoomCode, inviteUrlFor } from "./room-code.js";
import {
  collection, deleteDoc, doc, getDoc, getDocFromServer, onSnapshot, runTransaction, serverTimestamp, setDoc, writeBatch,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Salas online de Elteto: el mismo modelo que las salas de Timeline (Firestore + invitados
// anónimos + reglas de seguridad + latido de presencia + relevo de anfitrión), con una
// diferencia que exigen las cartas ocultas. El anfitrión sigue siendo la autoridad de las
// reglas del juego —tiene el estado completo y valida cada jugada con el motor—, pero en
// vez de hablar con cada móvil por WebRTC lo hace a través de Firestore:
//
//   rooms/{code}                 documento público (jugadores, fase, anfitrión)
//   rooms/{code}/presence/{uid}  latido de cada participante
//   rooms/{code}/actions/{uid}   última jugada de cada participante → la lee el anfitrión
//   rooms/{code}/views/{uid}     vista privada de cada participante → la escribe el anfitrión
//   rooms/{code}/secret/state    estado completo; solo lo lee el anfitrión, y por eso quien
//                                toma el relevo puede continuar la partida
//
// Ver CONFIGURAR_ONLINE.md y firestore.rules.

const HEARTBEAT_MS = 45000;
const WATCH_MS = 5000;
// Los mismos umbrales que usan las reglas (`hostStale`): 90 s con la pantalla visible,
// 15 s si el anfitrión la tiene en segundo plano.
const HOST_STALE_VISIBLE_MS = 90000;
const HOST_STALE_HIDDEN_MS = 15000;

const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: "No existe ninguna sala con ese código.",
  ALREADY_STARTED: "La partida ya ha empezado.",
  ROOM_FULL: "La sala está completa.",
  ROOM_ENDED: "La sala ya se ha cerrado.",
  UNKNOWN_GAME: "Tu versión de Elteto no conoce este juego. Actualiza la aplicación para entrar.",
};
function roomError(error, fallback) {
  if (ERROR_MESSAGES[error?.message]) return new Error(ERROR_MESSAGES[error.message]);
  if (error?.code === "permission-denied") return new Error("Firestore rechazó la operación. Comprueba que las reglas de firestore.rules están publicadas, que la sala sigue abierta y que no has creado otra hace menos de 30 segundos.");
  if (error?.code === "unavailable" || error?.code === "failed-precondition") return new Error("Sin conexión con el servidor. Comprueba tu conexión a internet.");
  return error instanceof Error && error.message ? error : new Error(fallback);
}

const validName = (name) => typeof name === "string" && name.length >= 1 && name.length <= 24;
const millis = (timestamp) => (typeof timestamp?.toMillis === "function" ? timestamp.toMillis() : null);

export class OnlineSession {
  /** Crea una sala nueva y deja a esta persona como anfitriona. */
  static async create({ gameId, roomName, hostName }, onChange, connection = connectFirebase()) {
    try {
      const name = String(hostName || "").trim().slice(0, 24);
      if (!validName(name)) throw new Error("Indica tu nombre para abrir la sala.");
      const engine = getGame(gameId);
      const { db, uid } = await connection;
      const code = createRoomCode();
      const batch = writeBatch(db);
      batch.set(doc(db, "roomCreation", uid), { lastCreatedAt: serverTimestamp(), roomCode: code });
      batch.set(doc(db, "rooms", code), {
        roomCode: code, gameId: engine.id, roomName: String(roomName || "").trim().slice(0, 40) || `Partida de ${name}`,
        hostUid: uid, status: "lobby", version: 1, minPlayers: engine.minPlayers, maxPlayers: engine.maxPlayers,
        playerOrder: [uid], players: { [uid]: { name, joinedAt: Date.now() } },
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      await batch.commit();
      return new OnlineSession({ db, uid, code, onChange }).start();
    } catch (error) { throw roomError(error, "No se pudo crear la sala."); }
  }

  /** Entra en una sala existente (o vuelve a ella si ya estaba dentro). */
  static async join(code, playerName, onChange, connection = connectFirebase()) {
    try {
      const name = String(playerName || "").trim().slice(0, 24);
      if (!validName(name)) throw new Error("Indica tu nombre para entrar.");
      const { db, uid } = await connection;
      const reference = doc(db, "rooms", code);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error("ROOM_NOT_FOUND");
        const data = snapshot.data();
        try { getGame(data.gameId); } catch { throw new Error("UNKNOWN_GAME"); }
        if (data.playerOrder.includes(uid)) return;
        if (data.status === "ended") throw new Error("ROOM_ENDED");
        if (data.status !== "lobby") throw new Error("ALREADY_STARTED");
        if (data.playerOrder.length >= data.maxPlayers) throw new Error("ROOM_FULL");
        transaction.update(reference, {
          players: { ...data.players, [uid]: { name, joinedAt: Date.now() } },
          playerOrder: [...data.playerOrder, uid],
          version: data.version + 1,
          updatedAt: serverTimestamp(),
        });
      });
      return new OnlineSession({ db, uid, code, onChange }).start();
    } catch (error) {
      // Una sala que ya empezó solo la leen sus participantes: para quien llega tarde es
      // un permiso denegado, no un error de reglas.
      if (error?.code === "permission-denied") throw new Error("La sala no existe, está cerrada o la partida ya ha empezado.");
      throw roomError(error, "No se pudo entrar en la sala.");
    }
  }

  constructor({ db, uid, code, onChange }) {
    this.db = db;
    this.uid = uid;
    this.code = code;
    this.onChange = onChange;
    this.roomRef = doc(db, "rooms", code);
    this.room = null;
    this.engine = null;
    this.closed = false;
    this.seenSelf = false;
    this.wasPlaying = false;
    this.wasHost = null;
    // Presencia y reloj del servidor.
    this.presence = new Map();
    this.presenceLoaded = new Set();
    this.presenceStops = new Map();
    this.clockOffset = null;
    this.heartbeatBusy = false;
    this.timers = [];
    // Tareas del anfitrión.
    this.state = null;
    this.rev = 0;
    this.version = 0;
    this.acks = {};
    this.queue = Promise.resolve();
    this.actionsStop = null;
    // Tareas de quien juega.
    this.viewStop = null;
    this.viewRev = -1;
    this.lastErrorSeq = 0;
    this.seq = null;
    this.claiming = false;
    this.onVisibility = () => { if (document.visibilityState === "visible") void this.heartbeat(); };
  }

  get isHost() { return this.room?.hostUid === this.uid; }
  get playerId() { return this.uid; }
  get roomCode() { return this.code; }
  get inviteUrl() { return inviteUrlFor(this.code); }

  start() {
    this.roomStop = onSnapshot(this.roomRef, (snapshot) => this.handleRoom(snapshot), (error) => {
      if (error?.code === "permission-denied") this.disconnect("Ya no estás en esta sala.");
      else this.onChange({ kind: "error", message: "Se perdió la conexión con la sala." });
    });
    this.timers.push(setInterval(() => { if (document.visibilityState === "visible") void this.heartbeat(); }, HEARTBEAT_MS));
    this.timers.push(setInterval(() => this.watchHost(), WATCH_MS));
    document.addEventListener("visibilitychange", this.onVisibility);
    return this;
  }

  // --- Presencia y relevo ------------------------------------------------------------

  serverNow() { return this.clockOffset === null ? null : Date.now() + this.clockOffset; }

  async heartbeat() {
    // Las reglas solo dejan escribir el latido a quien ya figura en la sala.
    if (this.closed || this.heartbeatBusy || !this.seenSelf || navigator.onLine === false) return;
    this.heartbeatBusy = true;
    const reference = doc(this.db, "rooms", this.code, "presence", this.uid);
    const sent = Date.now();
    try {
      await setDoc(reference, { seenAt: serverTimestamp(), visible: document.visibilityState === "visible" });
      const confirmed = await getDocFromServer(reference);
      const server = millis(confirmed.data()?.seenAt);
      const received = Date.now();
      if (server !== null && received >= sent) this.clockOffset = server - (sent + received) / 2;
    } catch { /* sin señal: el siguiente latido lo reintenta */ }
    finally { this.heartbeatBusy = false; }
  }

  watchPresence(order) {
    for (const uid of order) {
      if (this.presenceStops.has(uid)) continue;
      const stop = onSnapshot(doc(this.db, "rooms", this.code, "presence", uid), (snapshot) => {
        const data = snapshot.data({ serverTimestamps: "estimate" });
        this.presenceLoaded.add(uid);
        if (data?.seenAt?.toMillis) this.presence.set(uid, { seenAt: data.seenAt.toMillis(), visible: data.visible });
        else this.presence.delete(uid);
        if (this.room?.status === "lobby") this.emitLobby();
      }, () => {});
      this.presenceStops.set(uid, stop);
    }
    for (const [uid, stop] of this.presenceStops) {
      if (order.includes(uid)) continue;
      stop(); this.presenceStops.delete(uid); this.presence.delete(uid); this.presenceLoaded.delete(uid);
    }
  }

  isAway(uid) {
    const now = this.serverNow();
    const record = this.presence.get(uid);
    if (now === null || !record) return false;
    return now - record.seenAt > (record.visible === false ? HOST_STALE_HIDDEN_MS : HOST_STALE_VISIBLE_MS);
  }

  hostIsStale() {
    if (!this.room || this.isHost || this.room.status === "ended") return false;
    const hostUid = this.room.hostUid;
    // Hasta no haber leído el latido del anfitrión no se puede decir que falte.
    if (!this.presenceLoaded.has(hostUid)) return false;
    return this.isAway(hostUid) || (!this.presence.has(hostUid) && this.presenceAgeFromRoom() > HOST_STALE_VISIBLE_MS);
  }

  presenceAgeFromRoom() {
    const now = this.serverNow();
    const updated = millis(this.room?.updatedAt);
    return now === null || updated === null ? 0 : now - updated;
  }

  // Si el anfitrión desaparece, la primera persona de la mesa que sigue conectada toma el
  // relevo. Las reglas solo lo permiten con el anfitrión ausente y la transacción impide
  // que lo tomen dos a la vez.
  watchHost() {
    if (this.closed || this.claiming || !this.hostIsStale()) return;
    const candidate = this.room.playerOrder.find((uid) => uid !== this.room.hostUid && (uid === this.uid || (this.presence.has(uid) && !this.isAway(uid))));
    if (candidate === this.uid) void this.claimHost();
  }

  async claimHost() {
    this.claiming = true;
    const previous = this.room.hostUid;
    try {
      await runTransaction(this.db, async (transaction) => {
        const current = (await transaction.get(this.roomRef)).data();
        if (!current.playerOrder.includes(this.uid) || current.status === "ended") throw new Error("ROOM_ENDED");
        if (current.hostUid !== previous) throw new Error("ALREADY_CLAIMED");
        transaction.update(this.roomRef, { hostUid: this.uid, version: current.version + 1, updatedAt: serverTimestamp() });
      });
      this.onChange({ kind: "notice", message: "Quien llevaba la mesa se ha ido: ahora la llevas tú." });
    } catch { /* otra persona se adelantó o el anfitrión ha vuelto */ }
    finally { this.claiming = false; }
  }

  // --- Documento de la sala ----------------------------------------------------------

  handleRoom(snapshot) {
    if (this.closed) return;
    if (!snapshot.exists()) {
      if (!this.seenSelf && snapshot.metadata.fromCache) return;
      this.disconnect("La sala ha sido cerrada.");
      return;
    }
    const room = snapshot.data({ serverTimestamps: "estimate" });
    if (room.playerOrder.includes(this.uid)) this.seenSelf = true;
    else if (!this.seenSelf && snapshot.metadata.fromCache) return; // la caché aún no incluye nuestra entrada
    else { this.disconnect("Ya no estás en esta sala."); return; }

    const firstSnapshot = !this.room;
    this.room = room;
    if (firstSnapshot) void this.heartbeat();
    try { this.engine = getGame(room.gameId); } catch { this.disconnect("Tu versión de Elteto no conoce este juego."); return; }
    if (room.status === "ended") { this.disconnect("El anfitrión ha cerrado la sala."); return; }
    this.watchPresence(room.playerOrder);

    const host = this.isHost;
    const lostHost = !host && this.wasHost === true;
    this.wasHost = host;
    if (host) this.version = Math.max(this.version, room.version);
    if (host && room.status === "playing" && !this.actionsStop) void this.enterHostDuty();
    if (lostHost) {
      this.leaveHostDuty();
      this.onChange({ kind: "notice", message: "Otra persona ha tomado el relevo de la mesa." });
    }
    if (!host && room.status === "playing") this.watchView();

    if (room.status === "lobby") this.emitLobby();
    else if (!this.wasPlaying) {
      this.wasPlaying = true;
      this.onChange({ kind: "started" });
    }
  }

  players() {
    if (!this.room) return [];
    return this.room.playerOrder.map((uid) => ({
      id: uid, name: this.room.players[uid]?.name || "Jugador", isHost: uid === this.room.hostUid, away: this.isAway(uid),
    }));
  }

  emitLobby() {
    if (!this.room || this.room.status !== "lobby") return;
    this.onChange({
      kind: "lobby", players: this.players(), gameId: this.room.gameId, roomName: this.room.roomName,
      playerId: this.uid, isHost: this.isHost, connected: true, roomCode: this.code, inviteUrl: this.inviteUrl,
    });
  }

  emitGame(view) {
    this.onChange({
      kind: "game", players: this.players(), gameId: this.room.gameId, roomName: this.room.roomName,
      playerId: this.uid, isHost: this.isHost, view,
    });
  }

  // --- Quien lleva la mesa ------------------------------------------------------------

  /** Toma las riendas de una partida en marcha: recupera el estado guardado y atiende las jugadas. */
  async enterHostDuty() {
    if (this.actionsStop) return;
    this.viewStop?.(); this.viewStop = null;
    const generation = this.hostGeneration = (this.hostGeneration || 0) + 1;
    this.hostReady = (async () => {
      const secret = await getDoc(doc(this.db, "rooms", this.code, "secret", "state"));
      if (!secret.exists()) throw new Error("No hay estado guardado de la partida.");
      const data = secret.data();
      if (generation !== this.hostGeneration || this.closed) return;
      this.state = JSON.parse(data.json);
      this.rev = data.rev;
      this.acks = { ...data.acks };
      this.emitGame(this.engine.view(this.state, this.uid));
    })();
    this.hostReady.catch((error) => this.onChange({ kind: "error", message: roomError(error, "No se pudo recuperar la partida.").message }));
    this.attachActions();
  }

  attachActions() {
    this.actionsStop?.();
    this.actionsStop = onSnapshot(collection(this.db, "rooms", this.code, "actions"), (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type === "removed") continue;
        const data = change.doc.data();
        this.enqueue(async () => {
          await this.hostReady;
          await this.processAction(change.doc.id, data);
        });
      }
    }, (error) => {
      if (error?.code !== "permission-denied") this.onChange({ kind: "error", message: "Se perdió la conexión con la sala." });
    });
  }

  leaveHostDuty() {
    this.hostGeneration = (this.hostGeneration || 0) + 1;
    this.actionsStop?.(); this.actionsStop = null;
    this.state = null;
    this.hostReady = null;
  }

  enqueue(task) {
    this.queue = this.queue.then(task).catch((error) => this.onChange({ kind: "error", message: roomError(error, "No se pudo guardar la jugada.").message }));
    return this.queue;
  }

  async processAction(playerUid, data) {
    if (!this.isHost || !this.state || !this.room.playerOrder.includes(playerUid)) return;
    const seq = Number(data.seq);
    if (!Number.isInteger(seq) || seq <= (this.acks[playerUid] || 0)) return;
    this.acks[playerUid] = seq;
    const errors = {};
    try {
      const action = JSON.parse(data.json);
      this.state = this.engine.applyAction(this.state, playerUid, action);
    } catch (error) {
      errors[playerUid] = { seq, message: String(error?.message || "Jugada no válida.").slice(0, 200) };
    }
    await this.publish(errors);
  }

  /** Guarda el estado, las vistas privadas y sube la versión de la sala, todo en una escritura. */
  async publish(errors = {}, { starting = false } = {}) {
    const rev = ++this.rev;
    const batch = writeBatch(this.db);
    batch.set(doc(this.db, "rooms", this.code, "secret", "state"), { rev, json: JSON.stringify(this.state), acks: this.acks, at: serverTimestamp() });
    for (const uid of this.room.playerOrder) {
      const view = this.engine.view(this.state, uid);
      if (uid === this.uid) { this.emitGame(view); continue; }
      batch.set(doc(this.db, "rooms", this.code, "views", uid), { rev, json: JSON.stringify(view), ack: this.acks[uid] || 0, error: errors[uid] || null, at: serverTimestamp() });
    }
    const version = this.version + 1;
    batch.update(this.roomRef, { ...(starting ? { status: "playing" } : {}), version, updatedAt: serverTimestamp() });
    await batch.commit();
    this.version = version;
    if (errors[this.uid]) this.onChange({ kind: "error", message: errors[this.uid].message });
  }

  async startGame(seed = Date.now() >>> 0) {
    if (!this.isHost || this.room.status !== "lobby") throw new Error("Solo quien abrió la sala puede empezar la partida.");
    const players = this.room.playerOrder;
    if (players.length < this.engine.minPlayers) throw new Error(`Se necesitan al menos ${this.engine.minPlayers} jugadores.`);
    if (players.length > this.engine.maxPlayers) throw new Error(`Este juego admite como máximo ${this.engine.maxPlayers} jugadores.`);
    this.state = this.engine.createInitialState(players, seed);
    this.acks = {};
    this.hostReady = Promise.resolve();
    this.hostGeneration = (this.hostGeneration || 0) + 1;
    this.attachActions();
    this.wasPlaying = true;
    try { await this.publish({}, { starting: true }); }
    catch (error) { this.state = null; this.wasPlaying = false; this.actionsStop?.(); this.actionsStop = null; throw roomError(error, "No se pudo empezar la partida."); }
  }

  async removePlayer(uid) {
    if (!this.isHost || this.room.status !== "lobby" || uid === this.uid) return;
    try {
      await runTransaction(this.db, async (transaction) => {
        const current = (await transaction.get(this.roomRef)).data();
        if (current.hostUid !== this.uid || current.status !== "lobby" || !current.playerOrder.includes(uid)) return;
        const players = { ...current.players };
        delete players[uid];
        transaction.update(this.roomRef, { players, playerOrder: current.playerOrder.filter((item) => item !== uid), version: current.version + 1, updatedAt: serverTimestamp() });
      });
    } catch (error) { throw roomError(error, "No se pudo expulsar a esa persona."); }
  }

  // --- Quien juega --------------------------------------------------------------------

  watchView() {
    if (this.viewStop) return;
    this.viewStop = onSnapshot(doc(this.db, "rooms", this.code, "views", this.uid), (snapshot) => {
      if (!snapshot.exists() || this.closed || this.isHost) return;
      const data = snapshot.data();
      if (data.error && data.error.seq > this.lastErrorSeq) {
        this.lastErrorSeq = data.error.seq;
        this.onChange({ kind: "error", message: data.error.message });
      }
      if (data.rev <= this.viewRev) return;
      this.viewRev = data.rev;
      try { this.emitGame(JSON.parse(data.json)); }
      catch { this.onChange({ kind: "error", message: "No se pudo leer el estado de la partida." }); }
    }, () => {});
  }

  /** Envía una jugada: el anfitrión la valida con el motor y devuelve la vista nueva. */
  async sendAction(action) {
    if (this.closed || !this.room || this.room.status !== "playing") return;
    if (this.isHost) {
      this.enqueue(async () => {
        await this.hostReady;
        await this.processAction(this.uid, { seq: (this.acks[this.uid] || 0) + 1, json: JSON.stringify(action) });
      });
      return;
    }
    const reference = doc(this.db, "rooms", this.code, "actions", this.uid);
    try {
      if (this.seq === null) this.seq = (await getDoc(reference)).data()?.seq || 0;
      this.seq += 1;
      await setDoc(reference, { seq: this.seq, json: JSON.stringify(action), at: serverTimestamp() });
    } catch (error) {
      this.seq = null;
      throw roomError(error, "No se pudo enviar la jugada. Comprueba tu conexión.");
    }
  }

  applyLocalAction(action) { return this.sendAction(action); }

  // --- Salir ---------------------------------------------------------------------------

  /** El anfitrión cierra la sala para todos; el resto se marcha (en el vestíbulo deja su plaza). */
  async exit() {
    if (this.closed) return;
    const room = this.room;
    const reference = doc(this.db, "rooms", this.code, "presence", this.uid);
    try {
      if (room && this.isHost && room.status !== "ended") {
        await runTransaction(this.db, async (transaction) => {
          const current = (await transaction.get(this.roomRef)).data();
          if (current.hostUid !== this.uid || current.status === "ended") return;
          transaction.update(this.roomRef, { status: "ended", version: current.version + 1, updatedAt: serverTimestamp() });
        });
      } else if (room && room.status === "lobby") {
        await runTransaction(this.db, async (transaction) => {
          const current = (await transaction.get(this.roomRef)).data();
          if (current.status !== "lobby" || !current.playerOrder.includes(this.uid) || current.hostUid === this.uid) return;
          const players = { ...current.players };
          delete players[this.uid];
          transaction.update(this.roomRef, { players, playerOrder: current.playerOrder.filter((item) => item !== this.uid), version: current.version + 1, updatedAt: serverTimestamp() });
        });
      }
      await deleteDoc(reference).catch(() => {});
    } catch { /* sin conexión: la sala caduca sola y el latido deja de renovarse */ }
    this.teardown();
  }

  close() { return this.exit(); }
  leave() { return this.exit(); }

  disconnect(message) {
    if (this.closed) return;
    this.teardown();
    this.onChange({ kind: "disconnected", message });
  }

  teardown() {
    this.closed = true;
    for (const timer of this.timers) clearInterval(timer);
    this.timers = [];
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.roomStop?.();
    this.actionsStop?.(); this.actionsStop = null;
    this.viewStop?.(); this.viewStop = null;
    for (const stop of this.presenceStops.values()) stop();
    this.presenceStops.clear();
  }
}
