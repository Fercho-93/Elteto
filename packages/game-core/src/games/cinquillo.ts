import { Card, FRENCH_RANKS, buildFrenchDeck, createRng, shuffle } from "../deck";
import { GameEngine, PlayerId } from "../engine";

// Cinquillo: se reparte toda la baraja francesa entre los jugadores. Empieza quien tiene
// el 5 de corazones (rey de la mesa). En cada turno un jugador debe colocar, si puede, una
// carta que continúe una secuencia ya abierta en la mesa (a partir de un 5, hacia arriba
// hasta K o hacia abajo hasta A) en el palo correspondiente. Si no puede jugar, pasa.
// Gana quien primero se queda sin cartas en la mano.

const RANK_INDEX: Record<string, number> = Object.fromEntries(
  FRENCH_RANKS.map((r, i) => [r, i])
);
const FIVE_INDEX = RANK_INDEX["5"];

export type CinquilloTableSuit = {
  low: number; // índice más bajo colocado (<= FIVE_INDEX)
  high: number; // índice más alto colocado (>= FIVE_INDEX)
};

export type CinquilloState = {
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
  players: PlayerId[];
  handSizes: Record<PlayerId, number>;
  myHand: Card[];
  table: Record<string, CinquilloTableSuit>;
  turnPlayer: PlayerId;
  finished: boolean;
  winner: PlayerId | null;
  log: string[];
};

export type CinquilloAction = { type: "play"; card: Card } | { type: "pass" };

function canPlace(table: Record<string, CinquilloTableSuit>, card: Card): boolean {
  const idx = RANK_INDEX[card.rank];
  const entry = table[card.suit];
  if (!entry) return idx === FIVE_INDEX;
  if (idx === entry.high + 1) return true;
  if (idx === entry.low - 1) return true;
  return false;
}

function place(table: Record<string, CinquilloTableSuit>, card: Card): Record<string, CinquilloTableSuit> {
  const idx = RANK_INDEX[card.rank];
  const entry = table[card.suit];
  const next = { ...table };
  if (!entry) {
    next[card.suit] = { low: idx, high: idx };
  } else {
    next[card.suit] = {
      low: Math.min(entry.low, idx),
      high: Math.max(entry.high, idx),
    };
  }
  return next;
}

function hasAnyMove(table: Record<string, CinquilloTableSuit>, hand: Card[]): boolean {
  return hand.some((c) => canPlace(table, c));
}

export const cinquilloEngine: GameEngine<CinquilloState, CinquilloView, CinquilloAction> = {
  id: "cinquillo",
  label: "Cinquillo",
  minPlayers: 3,
  maxPlayers: 6,

  createInitialState(players, seed) {
    const rng = createRng(seed);
    const deck = shuffle(buildFrenchDeck(), rng);
    const hands: Record<PlayerId, Card[]> = {};
    players.forEach((p) => (hands[p] = []));
    deck.forEach((card, i) => hands[players[i % players.length]].push(card));

    const starter = players.findIndex((p) =>
      hands[p].some((c) => c.suit === "corazones" && c.rank === "5")
    );

    return {
      players,
      hands,
      table: {},
      turn: starter >= 0 ? starter : 0,
      passesInRow: 0,
      finished: false,
      winner: null,
      log: ["Reparto completado. Empieza quien tiene el 5 de corazones."],
    };
  },

  applyAction(state, playerId, action) {
    if (state.finished) throw new Error("La partida ya ha terminado.");
    const current = state.players[state.turn];
    if (current !== playerId) throw new Error("No es tu turno.");

    const hand = state.hands[playerId];

    if (action.type === "pass") {
      if (hasAnyMove(state.table, hand)) {
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
    if (!canPlace(state.table, card)) throw new Error("Esa carta no continúa ninguna secuencia abierta.");

    const newHand = hand.slice();
    newHand.splice(idx, 1);
    const hands = { ...state.hands, [playerId]: newHand };
    const table = place(state.table, card);
    const log = [...state.log, `${playerId} juega ${card.rank} de ${card.suit}.`];

    if (newHand.length === 0) {
      return { ...state, hands, table, finished: true, winner: playerId, passesInRow: 0, log: [...log, `${playerId} se queda sin cartas y gana la partida.`] };
    }

    return { ...state, hands, table, turn: (state.turn + 1) % state.players.length, passesInRow: 0, log };
  },

  view(state, playerId) {
    const handSizes: Record<PlayerId, number> = {};
    state.players.forEach((p) => (handSizes[p] = state.hands[p].length));
    return {
      players: state.players,
      handSizes,
      myHand: state.hands[playerId] ?? [],
      table: state.table,
      turnPlayer: state.players[state.turn],
      finished: state.finished,
      winner: state.winner,
      log: state.log.slice(-20),
    };
  },

  isOver(state) {
    return state.finished;
  },
};
