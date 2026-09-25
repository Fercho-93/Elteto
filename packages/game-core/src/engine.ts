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
  registry.set(engine.id, engine);
}

export function getGame(id: string): AnyEngine {
  const engine = registry.get(id);
  if (!engine) throw new Error(`Juego desconocido: ${id}`);
  return engine;
}

export function listGames(): AnyEngine[] {
  return Array.from(registry.values());
}
