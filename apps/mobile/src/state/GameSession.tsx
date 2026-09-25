import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { HostServer } from "../net/hostServer";
import { GameClient } from "../net/client";
import { DiscoveredHost, startHostAnnouncer, startHostScanner } from "../net/discovery";
import { DISCOVERY_MAGIC, GAME_PORT, LobbyPlayer } from "../net/protocol";

type Role = "idle" | "host" | "client";

type SessionState = {
  role: Role;
  gameId: string | null;
  playerId: string | null;
  players: LobbyPlayer[];
  started: boolean;
  view: unknown;
  error: string | null;
  discoveredHosts: DiscoveredHost[];
};

type SessionApi = SessionState & {
  hostRoom: (gameId: string, hostName: string, roomName: string) => void;
  scanForRooms: () => () => void;
  joinRoom: (host: DiscoveredHost, playerName: string) => void;
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
    discoveredHosts: [],
  });

  const hostRef = useRef<HostServer | null>(null);
  const clientRef = useRef<GameClient | null>(null);
  const stopAnnouncerRef = useRef<(() => void) | null>(null);
  const roomInfoRef = useRef<{ hostName: string; roomName: string } | null>(null);

  const hostRoom = useCallback((gameId: string, hostName: string, roomName: string) => {
    const server = new HostServer(
      gameId,
      hostName,
      (players) => setState((s) => ({ ...s, players })),
      (view) => setState((s) => ({ ...s, view }))
    );
    server.listen();
    hostRef.current = server;
    roomInfoRef.current = { hostName, roomName };

    stopAnnouncerRef.current?.();
    stopAnnouncerRef.current = startHostAnnouncer(() => ({
      magic: DISCOVERY_MAGIC,
      hostName,
      roomName,
      gameId,
      port: GAME_PORT,
      playerCount: hostRef.current?.currentPlayerIds().length ?? 1,
    }));

    setState((s) => ({
      ...s,
      role: "host",
      gameId,
      playerId: server.hostPlayerId,
      players: [{ id: server.hostPlayerId, name: hostName, isHost: true }],
      started: false,
      error: null,
    }));
  }, []);

  const scanForRooms = useCallback(() => {
    return startHostScanner((hosts) => setState((s) => ({ ...s, discoveredHosts: hosts })));
  }, []);

  const joinRoom = useCallback((host: DiscoveredHost, playerName: string) => {
    const client = new GameClient();
    clientRef.current = client;
    client.connect(host.address, host.port, playerName, {
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
    stopAnnouncerRef.current?.();
    stopAnnouncerRef.current = null;
    hostRef.current?.close();
    hostRef.current = null;
    clientRef.current?.disconnect();
    clientRef.current = null;
    setState({ role: "idle", gameId: null, playerId: null, players: [], started: false, view: null, error: null, discoveredHosts: [] });
  }, []);

  const value = useMemo<SessionApi>(
    () => ({ ...state, hostRoom, scanForRooms, joinRoom, startGame, sendAction, leave }),
    [state, hostRoom, scanForRooms, joinRoom, startGame, sendAction, leave]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGameSession(): SessionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGameSession debe usarse dentro de GameSessionProvider.");
  return ctx;
}
