import { getGamePlan } from "./catalog";

export type PlayerId = string;

/** Ficha de reglas de un juego concreto (Mus, Cinquillo, ...). TState es el estado completo
 * (autoridad del host); TView es lo que ve cada jugador (con la info de otros ocultada);
 * TAction es la unión de jugadas posibles. */
export interface GameEngine<TState, TView, TAction> {
  id: string;
  label: string;
  minPlayers: number;
  maxPlayers: number;
  createInitialState(players: PlayerId[], seed: number): TState;
  /** Aplica una acción de un jugador. Debe lanzar un Error con mensaje legible si la acción no es válida. */
  applyAction(state: TState, playerId: PlayerId, action: TAction): TState;
  /** Vista redactada del estado para un jugador concreto (oculta cartas ajenas, etc). */
  view(state: TState, playerId: PlayerId): TView;
  isOver(state: TState): boolean;
}

export type AnyEngine = GameEngine<any, any, any>;

const registry = new Map<string, AnyEngine>();

export function registerGame(engine: AnyEngine): void {
  const plan = getGamePlan(engine.id);
  if (plan.status !== "playable") throw new Error(`Motor pendiente de validación: ${engine.id}`);
  if (!plan.players.includes(engine.minPlayers) || !plan.players.includes(engine.maxPlayers)) throw new Error(`Jugadores incompatibles con la ficha: ${engine.id}`);
  // Una partida ganada por abandono lo anuncia en la vista de todos los jugadores.
  const view = engine.view.bind(engine);
  engine.view = (state, playerId) => {
    const result = view(state, playerId);
    const departed = state?.departed ? { departed: state.departed, ...(state.expelled ? { expelled: state.expelled } : {}) } : {};
    return state?.forfeit ? { ...result, ...departed, forfeitBy: state.forfeit, forfeitName: state.forfeitName } : { ...result, ...departed };
  };
  registry.set(engine.id, engine);
}

/** Juegos con un recuento propio de manos y fichas, donde una victoria por abandono no tiene sentido. */
const NO_FORFEIT = new Set(["mus", "texas-holdem"]);

/**
 * Si alguien se marcha de una mesa de dos, la partida termina y gana quien se queda.
 * Devuelve null cuando no procede (más de dos jugadores, partida ya terminada o juego con
 * recuento propio): en ese caso la persona queda ausente y puede volver a su plaza.
 */
export function forfeitGame(engineId: string, state: any, leaver: PlayerId, leaverName = ""): any | null {
  if (!state || state.finished || NO_FORFEIT.has(engineId.replace(/_/g, "-")) || !Array.isArray(state.players) || !state.players.includes(leaver)) return null;
  // Quien ya se había ido antes no cuenta: si solo queda una persona en la mesa, gana.
  const rest: PlayerId[] = state.players.filter((id: PlayerId) => id !== leaver && !state.departed?.[id]);
  if (rest.length !== 1) return null;
  const name = leaverName || leaver;
  return {
    ...state, finished: true, phase: "finished", winner: rest[0], handWinner: rest[0], loser: undefined,
    drawOffer: null, forfeit: leaver, forfeitName: name,
    log: [...(state.log || []), `${name} ha salido de la partida. Gana ${rest[0]}.`],
  };
}

/**
 * Alguien sale a propósito de una partida en marcha. Queda anotado en `departed`, que llega
 * en la vista de todos los jugadores para que toda la mesa reciba el aviso. En una mesa de dos
 * gana quien se queda; el póker además retira su mano y deja de repartirle.
 */
export function departGame(engineId: string, state: any, leaver: PlayerId, leaverName = "", expelled = false): any {
  if (!state || !Array.isArray(state.players) || !state.players.includes(leaver) || state.departed?.[leaver]) return state;
  const name = leaverName || leaver;
  const marked = { ...state, departed: { ...(state.departed || {}), [leaver]: name }, ...(expelled ? { expelled: { ...(state.expelled || {}), [leaver]: true } } : {}) };
  if (state.finished) return marked;
  const id = engineId.replace(/_/g, "-");
  if (id === "texas-holdem") return getGame(id).applyAction(marked, leaver, { type: "leave" });
  // En Parchís las fichas de quien se va salen del tablero y su asiento deja de jugar.
  const left = id === "parchis" ? getGame(id).applyAction(marked, leaver, { type: "leave" }) : marked;
  return forfeitGame(id, left, leaver, name) || left;
}

export function getGame(id: string): AnyEngine {
  const engine = registry.get(id.replace(/_/g,"-"));
  if (!engine) throw new Error(`Juego desconocido: ${id}`);
  return engine;
}

export function listGames(): AnyEngine[] {
  return Array.from(registry.values());
}
