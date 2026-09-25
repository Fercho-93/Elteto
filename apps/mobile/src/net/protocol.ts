export const DISCOVERY_PORT = 57123;
export const GAME_PORT = 57124;
export const DISCOVERY_MAGIC = "elteto-host-v1";

export type LobbyPlayer = { id: string; name: string; isHost: boolean };

export type HostAnnouncement = {
  magic: typeof DISCOVERY_MAGIC;
  hostName: string;
  roomName: string;
  gameId: string;
  port: number;
  playerCount: number;
};

/** Mensajes cliente -> host. */
export type ClientMessage =
  | { type: "hello"; name: string }
  | { type: "action"; action: unknown }
  | { type: "leave" };

/** Mensajes host -> cliente. */
export type ServerMessage =
  | { type: "welcome"; playerId: string; gameId: string }
  | { type: "lobby"; players: LobbyPlayer[]; gameId: string }
  | { type: "started" }
  | { type: "state"; view: unknown }
  | { type: "error"; message: string };

/** Los sockets TCP entregan un stream de bytes: delimitamos cada mensaje JSON con '\n'. */
export function encodeMessage(msg: unknown): string {
  return JSON.stringify(msg) + "\n";
}

export function makeLineBuffer(onMessage: (raw: string) => void) {
  let buffer = "";
  return (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.trim().length > 0) onMessage(line);
    }
  };
}
