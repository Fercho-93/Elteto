import { Card, SPANISH_RANKS, FRENCH_RANKS, buildSpanishDeck, createRng, shuffle } from "../deck";
import { GameEngine, PlayerId } from "../engine";

// Classic Spanish forty-card rules supplied in reglas_juegos/cinquillo.html.
// Four-player source; existing 2–6-player tables use the same scoring as an extension.
export type CinquilloTableSuit = {
  low: number; // índice más bajo colocado (<= FIVE_INDEX)
  high: number; // índice más alto colocado (>= FIVE_INDEX)
};

export type CinquilloState = {
  seed: number;
  handNumber: number;
  targetScore: number;
  scores: Record<PlayerId, number>;
  handWinner: PlayerId | null;
  ruleset: "spanish-40" | "legacy-french-52";
  players: PlayerId[];
  hands: Record<PlayerId, Card[]>;
  table: Record<string, CinquilloTableSuit>; // por palo
  turn: number; // índice en players
  passesInRow: number;
  finished: boolean;
  winner: PlayerId | null;
  log: string[];
};

export type CinquilloView = {
  handNumber: number;
  targetScore: number;
  scores: Record<PlayerId, number>;
  handWinner: PlayerId | null;
  ruleset: "spanish-40" | "legacy-french-52";
  players: PlayerId[];
  handSizes: Record<PlayerId, number>;
  myHand: Card[];
  table: Record<string, CinquilloTableSuit>;
  turnPlayer: PlayerId;
  finished: boolean;
  winner: PlayerId | null;
  log: string[];
};

export type CinquilloAction = { type: "play"; card: Card } | { type: "pass" } | { type: "next-hand" };

export function canPlaceCinquillo(table: Record<string, CinquilloTableSuit>, card: Card, ruleset: CinquilloState["ruleset"] = "spanish-40"): boolean {
  const ranks: readonly string[] = ruleset === "spanish-40" ? SPANISH_RANKS : FRENCH_RANKS;
  const suits = ruleset === "spanish-40" ? ["oros","copas","espadas","bastos"] : ["picas","corazones","diamantes","treboles"];
  const idx = ranks.indexOf(card.rank);
  if (idx < 0 || !suits.includes(card.suit)) return false;
  if (!Object.keys(table).length) return card.suit === (ruleset === "spanish-40" ? "oros" : "corazones") && card.rank === "5";
  const entry = table[card.suit];
  return entry ? idx === entry.high+1 || idx === entry.low-1 : card.rank === "5";
}
function place(table: Record<string, CinquilloTableSuit>, card: Card, ruleset: CinquilloState["ruleset"]): Record<string, CinquilloTableSuit> {
  const ranks: readonly string[] = ruleset === "spanish-40" ? SPANISH_RANKS : FRENCH_RANKS;
  const idx = ranks.indexOf(card.rank), entry = table[card.suit];
  return {...table,[card.suit]:entry ? {low:Math.min(entry.low,idx),high:Math.max(entry.high,idx)} : {low:idx,high:idx}};
}
function normalizeLegacy(state: CinquilloState): CinquilloState {
  if (state.ruleset) return state;
  return {...state, ruleset:"legacy-french-52", seed:0, handNumber:1, targetScore:1,
    scores:Object.fromEntries(state.players.map(p=>[p,0])), handWinner:state.finished ? state.winner : null};
}

export const cinquilloEngine: GameEngine<CinquilloState, CinquilloView, CinquilloAction> = {
  id: "cinquillo",
  label: "Cinquillo",
  minPlayers: 2,
  maxPlayers: 6,

  createInitialState(players, seed) {
    if (players.length < this.minPlayers || players.length > this.maxPlayers || new Set(players).size !== players.length) {
      throw new Error(`El Cinquillo requiere entre ${this.minPlayers} y ${this.maxPlayers} jugadores distintos.`);
    }
    const rng = createRng(seed);
    const deck = shuffle(buildSpanishDeck(), rng);
    const hands: Record<PlayerId, Card[]> = {};
    players.forEach((p) => (hands[p] = []));
    deck.forEach((card, i) => hands[players[i % players.length]].push(card));

    const starter = players.findIndex((p) =>
      hands[p].some((c) => c.suit === "oros" && c.rank === "5")
    );

    return {
      players: [...players],
      ruleset: "spanish-40",
      seed,
      handNumber: 1,
      targetScore: 30,
      scores: Object.fromEntries(players.map(p => [p, 0])),
      handWinner: null,
      hands,
      table: {},
      turn: starter >= 0 ? starter : 0,
      passesInRow: 0,
      finished: false,
      winner: null,
      log: ["Reparto completado. Empieza quien tiene el 5 de oros."],
    };
  },

  applyAction(state, playerId, action) {
    state = normalizeLegacy(state);
    if (state.finished) throw new Error("La partida ya ha terminado.");
    if (state.handWinner) {
      if (action.type !== "next-hand" || playerId !== state.handWinner) throw new Error("El ganador de la mano debe iniciar el siguiente reparto.");
      const next = this.createInitialState(state.players, state.seed + state.handNumber * 104729);
      return {...next, seed: state.seed, handNumber: state.handNumber + 1, scores: {...state.scores}, targetScore: state.targetScore, log: [...state.log, ...next.log]};
    }
    if (action.type === "next-hand") throw new Error("La mano todavía no ha terminado.");
    const current = state.players[state.turn];
    if (current !== playerId) throw new Error("No es tu turno.");

    const hand = state.hands[playerId];

    if (action.type === "pass") {
      if (hand.some(c => canPlaceCinquillo(state.table, c, state.ruleset))) {
        throw new Error("Tienes una jugada posible, no puedes pasar.");
      }
      const passesInRow = state.passesInRow + 1;
      const log = [...state.log, `${playerId} pasa.`];
      if (passesInRow >= state.players.length) {
        return { ...state, passesInRow, finished: true, winner: null, log: [...log, "Nadie puede jugar. Partida bloqueada."] };
      }
      return { ...state, turn: (state.turn + 1) % state.players.length, passesInRow, log };
    }

    const card = action.card;
    const idx = hand.findIndex((c) => c.suit === card.suit && c.rank === card.rank);
    if (idx === -1) throw new Error("No tienes esa carta.");
    if (!canPlaceCinquillo(state.table, card, state.ruleset)) throw new Error("Esa carta no continúa ninguna secuencia abierta.");

    const newHand = hand.slice();
    newHand.splice(idx, 1);
    const hands = { ...state.hands, [playerId]: newHand };
    const table = place(state.table, card, state.ruleset);
    const log = [...state.log, `${playerId} juega ${card.rank} de ${card.suit}.`];

    if (newHand.length === 0) {
      const scores = {...state.scores};
      const remaining = Object.entries(hands).reduce((n,[id,cards]) => {
        if (id !== playerId) scores[id] -= cards.length;
        return n + cards.length;
      },0);
      scores[playerId] += 5 + remaining;
      const finished = scores[playerId] >= state.targetScore;
      return { ...state, hands, table, scores, handWinner: playerId, finished, winner: finished ? playerId : null, passesInRow: 0,
        log: [...log, `${playerId} gana la mano y suma ${5 + remaining} puntos.${finished ? " Gana la partida." : " Nuevo reparto pendiente."}`] };

    }

    return { ...state, hands, table, turn: (state.turn + 1) % state.players.length, passesInRow: 0, log };
  },

  view(state, playerId) {
    state = normalizeLegacy(state);
    const handSizes: Record<PlayerId, number> = {};
    state.players.forEach((p) => (handSizes[p] = state.hands[p].length));
    return {
      players: state.players,
      ruleset: state.ruleset,
      handNumber: state.handNumber,
      targetScore: state.targetScore,
      scores: {...state.scores},
      handWinner: state.handWinner,
      handSizes,
      myHand: state.hands[playerId] ?? [],
      table: state.table,
      turnPlayer: state.handWinner ?? state.players[state.turn],
      finished: state.finished,
      winner: state.winner,
      log: state.log.slice(-20),
    };
  },

  isOver(state) {
    return state.finished;
  },
};
