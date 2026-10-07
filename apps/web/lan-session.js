import { LocalHostSession } from './local-session.js';

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
}

// The Android server routes messages. The existing engine in the host WebView
// validates actions and sends only each player's own view.
export class LanSession {
  static async create(options, onChange) {
    if (!window.ELTETO_LAN?.hostKey) throw new Error('La mesa se crea desde la app Android anfitriona.');
    // Cada cierre rota el código en el servidor. Un enlace anterior nunca abre la
    // siguiente mesa, aunque siga abierta la misma app anfitriona.
    Object.assign(window.ELTETO_LAN, await fetch('./lan-config', { cache: 'no-store' }).then(r => { if (!r.ok) throw new Error('No se pudo abrir la mesa.'); return r.json(); }));
    const session = new LanSession(onChange, true);
    session.local = new LocalHostSession(options.gameId, options.hostName, options.roomName, change => session.emitHost(change));
    session.local.canRunBots = () => [...session.local.connections.values()].every(c => c.peer.connected);
    await session.connect();
    session.local.publishLobby();
    return session;
  }
  static async join(code, name, onChange) {
    if (code !== window.ELTETO_LAN.roomCode) throw new Error('El código pertenece a otra mesa. Abre el enlace del anfitrión.');
    const session = new LanSession(onChange, false);
    session.name = String(name).trim().slice(0, 24) || 'Invitado';
    const key = `elteto.lan.${location.host}.${code}`;
    session.resume = sessionStorage.getItem(key) || randomToken();
    sessionStorage.setItem(key, session.resume);
    session.sequenceKey = key + ".seq";
    session.seq = Number(sessionStorage.getItem(session.sequenceKey)) || 0;
    await session.connect();
    return session;
  }
  constructor(onChange, host) {
    this.onChange = onChange;
    this.isHost = host;
    this.closed = false;
    this.playerId = host ? 'host' : null;
    this.roomCode = window.ELTETO_LAN.roomCode;
    this.inviteUrl = `${window.ELTETO_LAN.inviteBase}/?join=${this.roomCode}`;
    this.players = [];
    this.timer = null;
    this.pending = false;
    this.seq = 0;
    this.acks = new Map();
  }
  emitHost(change) {
    if (change.kind === 'lobby' || change.kind === 'game') {
      change.players = change.players.map(player => ({ ...player, away: !player.isBot && player.id !== 'host' && !this.local.connections.get(player.id)?.peer.connected }));
      this.onChange({ ...change, isHost: true, playerId: 'host', roomCode: this.roomCode, inviteUrl: this.inviteUrl });
    } else this.onChange(change);
  }
  async connect() {
    const params = new URLSearchParams(this.isHost ? { host: window.ELTETO_LAN.hostKey } : { code: this.roomCode, resume: this.resume });
    return new Promise((resolve, reject) => {
      let accepted = false;
      const ws = this.ws = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/socket?${params}`);
      const timeout = setTimeout(() => { ws.close(); reject(new Error('No se pudo conectar en 10 segundos. Comprueba la Wi-Fi y que la app anfitriona está abierta.')); }, 10000);
      ws.onmessage = event => {
        let packet;
        try { packet = JSON.parse(event.data); } catch { return; }
        if (packet.type === 'connected') {
          accepted = true;
          clearTimeout(timeout);
          if (!this.isHost) this.send({ type: 'hello', data: { name: this.name } });
          resolve();
        } else if (packet.type === 'fatal') {
          clearTimeout(timeout);
          this.closed = true;
          reject(new Error(packet.message));
          this.onChange({ kind: 'disconnected', message: packet.message });
          ws.close();
        } else if (this.isHost) this.handleHostPacket(packet);
        else this.handleGuestPacket(packet);
      };
      ws.onclose = () => {
        clearTimeout(timeout);
        if (!accepted) reject(new Error('El anfitrión no está disponible. Abre la mesa en su Android.'));
        if (this.closed) return;
        this.pending = false;
        if (this.isHost) {
          this.closed = true;
          this.local?.close();
          this.onChange({ kind: 'disconnected', message: 'Se cerró el servidor local. Vuelve a abrir la mesa.' });
        } else {
          this.onChange({ kind: 'error', message: 'Sin conexión. Intentando volver a tu plaza…' });
          this.timer = setTimeout(() => { if (!this.closed) this.connect().catch(() => {}); }, 2000);
        }
      };
      ws.onerror = () => {}; // close or timeout reports the usable error
    });
  }
  send(message) {
    if (this.ws?.readyState !== WebSocket.OPEN) throw new Error('Sin conexión con la mesa.');
    this.ws.send(JSON.stringify(message));
  }
  handleHostPacket(packet) {
    const id = packet.playerId;
    if (packet.type === 'guest-left') {
      const connection = this.local.connections.get(id);
      if (connection) connection.peer.connected = false;
      this.local.publishLobby();
      if (this.local.started) this.local.sendViews();
      return;
    }
    if (packet.type !== 'guest-message') return;
    const message = packet.message;
    if (message.type === 'hello') {
      const peer = { connected: true, send: data => { this.send({ target: id, message: data }); return true; }, close: () => { if (this.ws?.readyState === WebSocket.OPEN) this.send({ target: id, close: true }); } };
      this.local.peers.set(id, peer);
      const existing = this.local.connections.get(id);
      if (existing) {
        existing.peer = peer;
        peer.send({ type: 'welcome', data: { playerId: id, gameId: this.local.engine.id } });
        this.local.publishLobby();
        this.local.sendViews();
      } else this.local.handleMessage(id, message);
    } else if (message.type === 'action') {
      if (!this.local.connections.get(id)?.peer.connected) return;
      const previous = this.acks.get(id) || 0;
      if (Number.isInteger(message.seq) && message.seq > previous) {
        this.acks.set(id, message.seq);
        try { this.assertConnected(); this.local.applyAction(id, message.data?.action); }
        catch (error) { this.local.peers.get(id)?.send({ type: 'error', data: { message: error.message } }); }
      }
      this.local.peers.get(id)?.send({ type: 'ack', seq: message.seq });
    } else if (message.type === 'leave') {
      if (this.local.started) this.local.connections.get(id).peer.connected = false;
      else this.local.handleMessage(id, message);
    }
  }
  assertConnected() {
    if ([...this.local.connections.values()].some(c => !c.peer.connected)) throw new Error('Partida en pausa: falta un jugador. Puede volver a entrar con el mismo navegador.');
  }
  handleGuestPacket(message) {
    if (this.closed) return;
    const data = message.data || {};
    if (message.type === 'closed') {
      this.closed = true; clearTimeout(this.timer); this.ws?.close();
      this.onChange({kind:'disconnected',message:data.message || 'La sala ha terminado.'});
    } else if (message.type === 'welcome') {
      this.playerId = data.playerId; this.gameId = data.gameId;
    } else if (message.type === 'lobby') {
      this.players = data.players; this.gameId = data.gameId; this.roomName = data.roomName;
      this.onChange({ kind: 'lobby', ...data, playerId: this.playerId, isHost: false, roomCode: this.roomCode });
    } else if (message.type === 'state') {
      this.onChange({ kind: 'game', players: this.players, gameId: this.gameId, roomName: this.roomName, playerId: this.playerId, isHost: false, view: data.view });
    } else if (message.type === 'error') this.onChange({ kind: 'error', message: data.message });
    else if (message.type === 'ack') this.pending = false;
  }
  async startGame() { this.assertConnected(); this.local.startGame(); }
  async fillWithBots() { if (this.isHost) this.local.fillWithBots(); }
  async sendAction(action) {
    if (this.isHost) { this.assertConnected(); this.local.applyLocalAction(action); return; }
    if (this.pending) throw new Error('Espera la confirmación de tu jugada.');
    sessionStorage.setItem(this.sequenceKey, String(++this.seq));
    this.send({ type: 'action', seq: this.seq, data: { action } });
    this.pending = true;
  }
  async removePlayer(id) {
    if (!this.isHost || this.local.started) return;
    if (this.local.bots.some(p => p.id === id)) { this.local.removePlayer(id); return; }
    this.local.peers.get(id)?.close(); this.local.handleClose(id);
  }
  async exit() {
    if (this.closed) return;
    try { if (!this.isHost) this.send({ type: 'leave' }); } catch {}
    this.closed = true; clearTimeout(this.timer); this.local?.close(); this.ws?.close();
  }
  close() { return this.exit(); }
}
