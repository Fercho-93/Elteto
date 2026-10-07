import TcpSocket from "react-native-tcp-socket";
import { AnyEngine, getGame, fillBotSeats, BotPlayer, BotRunner, nextBotMove } from "game-core";
import { GAME_PORT, ClientMessage, LobbyPlayer, ServerMessage, encodeMessage, makeLineBuffer } from "./protocol";

type ConnectionListener = Extract<Parameters<typeof TcpSocket.createServer>[0], (...args: any[]) => any>;
type Socket = Parameters<ConnectionListener>[0];
type Connection = { id: string; name: string; socket: Socket };

/**
 * El móvil que hace de host mantiene la partida como autoridad: recibe acciones de cada
 * jugador, las valida con el motor de reglas (game-core) y reenvía a cada dispositivo su
 * vista redactada del estado (sin ver la mano de los demás). El propio host juega también
 * como un jugador más usando este mismo objeto desde la UI (loopback local, sin red).
 */
export class HostServer {
  private server: ReturnType<typeof TcpSocket.createServer> | null = null;
  private connections = new Map<string, Connection>();
  private engine: AnyEngine;
  private state: unknown = null;
  private started = false;
  private closed = false;
  private bots: BotPlayer[] = [];
  private botRunner: BotRunner;
  readonly hostPlayerId: string;

  constructor(
    gameId: string,
    private readonly hostName: string,
    private readonly onLobbyChange: (players: LobbyPlayer[]) => void,
    private readonly onLocalView: (view: unknown) => void
  ) {
    this.engine = getGame(gameId);
    this.hostPlayerId = "host";
    this.botRunner = new BotRunner(() => this.closed ? null : nextBotMove(this.engine, this.state, this.bots.map(p => p.id)),
      ({playerId,action}) => { this.state = this.engine.applyAction(this.state,playerId,action); this.sendViews(); },
      () => this.onLocalView(this.engine.view(this.state,this.hostPlayerId)));
  }

  private lobbyPlayers(): LobbyPlayer[] {
    const players: LobbyPlayer[] = [{ id: this.hostPlayerId, name: this.hostName, isHost: true }];
    for (const c of this.connections.values()) players.push({ id: c.id, name: c.name, isHost: false });
    return [...players, ...this.bots];
  }

  fillWithBots() {
    if (this.started || this.closed) return;
    this.bots.push(...fillBotSeats(this.lobbyPlayers(),this.engine.maxPlayers));
    this.broadcastLobby();
  }

  removeBot(id: string) {
    if (this.started || this.closed) return;
    this.bots = this.bots.filter(p => p.id !== id);
    this.broadcastLobby();
  }

  private broadcastLobby() {
    const players = this.lobbyPlayers();
    this.onLobbyChange(players);
    this.broadcast({ type: "lobby", players, gameId: this.engine.id });
  }

  private broadcast(msg: ServerMessage) {
    const line = encodeMessage(msg);
    for (const c of this.connections.values()) c.socket.write(line);
  }

  private sendViews() {
    if (this.state === null) return;
    this.onLocalView(this.engine.view(this.state, this.hostPlayerId));
    for (const c of this.connections.values()) {
      c.socket.write(encodeMessage({ type: "state", view: this.engine.view(this.state, c.id) }));
    }
    this.botRunner.schedule();
  }

  listen() {
    this.server = TcpSocket.createServer((socket) => {
      let connId: string | null = null;
      const handleLine = makeLineBuffer((raw) => {
        let msg: ClientMessage;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        if (msg.type === "hello") {
          if (connId) return;
          if (typeof msg.name !== "string" || !msg.name.trim()) {
            socket.write(encodeMessage({ type: "error", message: "Indica un nombre para unirte." }));
            socket.end();
            return;
          }
          if (this.started || this.lobbyPlayers().length >= this.engine.maxPlayers) {
            socket.write(encodeMessage({ type: "error", message: this.started ? "La partida ya ha empezado." : "La sala está completa." }));
            socket.end();
            return;
          }
          connId = `p${Date.now()}${Math.floor(Math.random() * 1000)}`;
          this.connections.set(connId, { id: connId, name: msg.name, socket });
          socket.write(encodeMessage({ type: "welcome", playerId: connId, gameId: this.engine.id }));
          this.broadcastLobby();
          return;
        }
        if (!connId) return;
        if (msg.type === "action") {
          this.applyAction(connId, msg.action);
        } else if (msg.type === "leave") {
          this.connections.delete(connId);
          socket.end();
          this.broadcastLobby();
        }
      });
      socket.on("data", (data) => handleLine(data.toString()));
      socket.on("error", () => {
        if (connId) {
          this.connections.delete(connId);
          this.broadcastLobby();
        }
      });
      socket.on("close", () => {
        if (connId) {
          this.connections.delete(connId);
          this.broadcastLobby();
        }
      });
    });
    this.server.listen({ port: GAME_PORT, host: "0.0.0.0" });
    this.broadcastLobby();
  }

  currentPlayerIds(): string[] {
    return this.lobbyPlayers().map((p) => p.id);
  }

  startGame(seed: number) {
    if (this.started || this.closed) throw new Error('La mesa ya no admite una nueva partida.');
    const players = this.currentPlayerIds();
    if (players.length < this.engine.minPlayers) {
      throw new Error(`Se necesitan al menos ${this.engine.minPlayers} jugadores.`);
    }
    if (players.length > this.engine.maxPlayers) {
      throw new Error(`Este juego admite como máximo ${this.engine.maxPlayers} jugadores.`);
    }
    this.state = this.engine.createInitialState(players, seed);
    this.started = true;
    this.broadcast({ type: "started" });
    this.sendViews();
  }

  /** Acción enviada desde la UI del propio host (sin pasar por la red). */
  applyLocalAction(action: unknown) {
    this.applyAction(this.hostPlayerId, action);
  }

  private applyAction(playerId: string, action: unknown) {
    if (!this.started || this.state === null) return;
    try {
      this.state = this.engine.applyAction(this.state, playerId, action as never);
      this.sendViews();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Acción inválida.";
      if (playerId === this.hostPlayerId) {
        this.onLocalView(this.engine.view(this.state, this.hostPlayerId));
      } else {
        this.connections.get(playerId)?.socket.write(encodeMessage({ type: "error", message }));
      }
    }
  }

  close() {
    this.closed = true;
    this.botRunner.stop();
    for (const c of this.connections.values()) c.socket.end();
    this.connections.clear();
    this.server?.close();
    this.server = null;
  }
}
