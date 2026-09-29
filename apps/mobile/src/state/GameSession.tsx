import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { fetch as fetchNetInfo } from "@react-native-community/netinfo";
import { HostServer } from "../net/hostServer";
import { GameClient } from "../net/client";
import { GAME_PORT, LobbyPlayer } from "../net/protocol";

type Role = "idle" | "host" | "client";

type SessionState = {
  role: Role;
  gameId: string | null;
  playerId: string | null;
  players: LobbyPlayer[];
  started: boolean;
  view: unknown;
  error: string | null;
  hostAddress: string | null;
  roomName: string | null;
};

type SessionApi = SessionState & {
  hostRoom: (gameId: string, hostName: string, roomName: string) => void;
  joinRoom: (address: string, playerName: string) => void;
  startGame: () => void;
  sendAction: (action: unknown) => void;
  leave: () => void;
};

const Ctx = createContext<SessionApi | null>(null);

export function GameSessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    role: "idle",
    gameId: null,
    playerId: null,
    players: [],
    started: false,
    view: null,
    error: null,
    hostAddress: null,
    roomName: null,
  });

  const hostRef = useRef<HostServer | null>(null);
  const clientRef = useRef<GameClient | null>(null);

  const hostRoom = useCallback((gameId: string, hostName: string, roomName: string) => {
    const server = new HostServer(
      gameId,
      hostName,
      (players) => setState((s) => ({ ...s, players })),
      (view) => setState((s) => ({ ...s, view }))
    );
    server.listen();
    hostRef.current = server;

    setState((s) => ({
      ...s,
      role: "host",
      gameId,
      playerId: server.hostPlayerId,
      players: [{ id: server.hostPlayerId, name: hostName, isHost: true }],
      started: false,
      error: null,
      hostAddress: null,
      roomName,
    }));

    void fetchNetInfo()
      .then((network) => {
        const candidate = network.type === "wifi" ? network.details?.ipAddress : null;
        const address = candidate && /^\d{1,3}(?:\.\d{1,3}){3}$/.test(candidate) ? candidate : null;
        setState((s) => s.role === "host" ? { ...s, hostAddress: address } : s);
      })
      .catch(() => setState((s) => s.role === "host" ? { ...s, hostAddress: null } : s));
  }, []);

  const joinRoom = useCallback((address: string, playerName: string) => {
    const client = new GameClient();
    clientRef.current = client;
    client.connect(address, GAME_PORT, playerName, {
      onWelcome: (playerId, gameId) => setState((s) => ({ ...s, role: "client", playerId, gameId, error: null })),
      onLobby: (players, gameId) => setState((s) => ({ ...s, players, gameId })),
      onStarted: () => setState((s) => ({ ...s, started: true })),
      onState: (view) => setState((s) => ({ ...s, view })),
      onError: (message) => setState((s) => ({ ...s, error: message })),
      onDisconnected: () => setState((s) => ({ ...s, error: "Se ha perdido la conexión con el anfitrión." })),
    });
  }, []);

  const startGame = useCallback(() => {
    if (!hostRef.current) return;
    try {
      hostRef.current.startGame(Date.now() & 0xffffffff);
      setState((s) => ({ ...s, started: true, error: null }));
    } catch (err) {
      setState((s) => ({ ...s, error: err instanceof Error ? err.message : "No se pudo iniciar la partida." }));
    }
  }, []);

  const sendAction = useCallback((action: unknown) => {
    if (hostRef.current) hostRef.current.applyLocalAction(action);
    else clientRef.current?.sendAction(action);
  }, []);

  const leave = useCallback(() => {
    hostRef.current?.close();
    hostRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    setState({ role: "idle", gameId: null, playerId: null, players: [], started: false, view: null, error: null, hostAddress: null, roomName: null });
  }, []);

  const value = useMemo<SessionApi>(
    () => ({ ...state, hostRoom, joinRoom, startGame, sendAction, leave }),
    [state, hostRoom, joinRoom, startGame, sendAction, leave]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGameSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGameSession debe usarse dentro de GameSessionProvider.");
  return ctx;
}
