import TcpSocket from "react-native-tcp-socket";
import { ClientMessage, LobbyPlayer, ServerMessage, encodeMessage, makeLineBuffer } from "./protocol";

type Socket = ReturnType<typeof TcpSocket.createConnection>;

export type ClientCallbacks = {
  onWelcome: (playerId: string, gameId: string) => void;
  onLobby: (players: LobbyPlayer[], gameId: string) => void;
  onStarted: () => void;
  onState: (view: unknown) => void;
  onError: (message: string) => void;
  onDisconnected: () => void;
};

export class GameClient {
  private socket: Socket | null = null;

  connect(host: string, port: number, name: string, callbacks: ClientCallbacks) {
    const socket = TcpSocket.createConnection({ host, port }, () => {
      socket.write(encodeMessage({ type: "hello", name } satisfies ClientMessage));
    });
    this.socket = socket;

    const handleLine = makeLineBuffer((raw) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      switch (msg.type) {
        case "welcome":
          callbacks.onWelcome(msg.playerId, msg.gameId);
          break;
        case "lobby":
          callbacks.onLobby(msg.players, msg.gameId);
          break;
        case "started":
          callbacks.onStarted();
          break;
        case "state":
          callbacks.onState(msg.view);
          break;
        case "error":
          callbacks.onError(msg.message);
          break;
      }
    });

    socket.on("data", (data) => handleLine(data.toString()));
    socket.on("error", () => callbacks.onDisconnected());
    socket.on("close", () => callbacks.onDisconnected());
  }

  sendAction(action: unknown) {
    this.socket?.write(encodeMessage({ type: "action", action } satisfies ClientMessage));
  }

  disconnect() {
    if (!this.socket) return;
    try {
      this.socket.write(encodeMessage({ type: "leave" } satisfies ClientMessage));
      this.socket.end();
    } catch {
      // ya desconectado
    }
    this.socket = null;
  }
}
