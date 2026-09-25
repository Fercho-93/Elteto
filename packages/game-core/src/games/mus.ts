import { Card, SPANISH_RANKS, buildSpanishDeck, createRng, shuffle } from "../deck";
import { GameEngine, PlayerId } from "../engine";

// Mus para 4 jugadores en 2 parejas sentadas alternas: equipo A = asientos 0 y 2,
// equipo B = asientos 1 y 3. Implementación fiel al flujo real (descarte, envites de
// Grande/Chica/Pares/Juego-Punto, quiero/no quiero, órdago) con algunas simplificaciones
// documentadas junto a cada función: una única ronda de descarte (en vez del bucle
// "hay mus / no hay mus" repetido) y una tabla fija para el orden del Juego.

export type Team = "A" | "B";

const RANK_INDEX: Record<string, number> = Object.fromEntries(SPANISH_RANKS.map((r, i) => [r, i]));
const MUS_VALUE: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "10": 10, "11": 10, "12": 10 };
const JUEGO_ORDER = [31, 32, 40, 39, 38, 37, 36, 35, 34, 33]; // mejor -> peor

export type MusPhaseName = "grande" | "chica" | "pares" | "juego";

export type BettingState = {
  turnSeat: number;
  pendingBet: { team: Team; amount: number; ordago?: boolean } | null;
  previousAmount: number;
  consecutivePasses: number;
};

export type MusState = {
  players: PlayerId[]; // 4 asientos, [0,2]=equipo A, [1,3]=equipo B
  hands: Record<PlayerId, Card[]>;
  stock: Card[];
  mano: number; // asiento
  handNumber: number;
  targetScore: number;
  scores: Record<Team, number>;
  phase: "discard" | MusPhaseName | "finished";
  pendingDiscard: Record<PlayerId, Card[] | null>;
  betting: BettingState | null;
  phaseOrder: MusPhaseName[];
  phaseIndex: number;
  phaseResults: Partial<Record<MusPhaseName, string>>;
  finished: boolean;
  winnerTeam: Team | null;
  log: string[];
};

export type MusView = {
  players: PlayerId[];
  myHand: Card[];
  handSizes: Record<PlayerId, number>;
  mano: PlayerId;
  scores: Record<Team, number>;
  targetScore: number;
  phase: MusState["phase"];
  betting: BettingState | null;
  turnPlayer: PlayerId | null;
  awaitingDiscardFrom: PlayerId[];
  finished: boolean;
  winnerTeam: Team | null;
  log: string[];
};

export type MusAction =
  | { type: "discard"; cards: Card[] }
  | { type: "pass" }
  | { type: "bet"; amount: number }
  | { type: "ordago" }
  | { type: "accept" }
  | { type: "reject" };

function teamOfSeat(seat: number): Team {
  return seat % 2 === 0 ? "A" : "B";
}
function teamOfPlayer(state: MusState, playerId: PlayerId): Team {
  return teamOfSeat(state.players.indexOf(playerId));
}

function dealHand(state: MusState, seed: number): MusState {
  const rng = createRng(seed);
  const deck = shuffle(buildSpanishDeck(), rng);
  const hands: Record<PlayerId, Card[]> = {};
  state.players.forEach((p, i) => (hands[p] = deck.slice(i * 4, i * 4 + 4)));
  const stock = deck.slice(state.players.length * 4);
  const pendingDiscard: Record<PlayerId, Card[] | null> = {};
  state.players.forEach((p) => (pendingDiscard[p] = null));
  return {
    ...state,
    hands,
    stock,
    phase: "discard",
    pendingDiscard,
    betting: null,
    phaseIndex: 0,
    phaseResults: {},
    log: [...state.log, `Reparto de la mano ${state.handNumber}.`],
  };
}

function pairCategory(hand: Card[]): { category: 0 | 1 | 2 | 3; rank: number } {
  const counts = new Map<number, number>();
  for (const c of hand) counts.set(RANK_INDEX[c.rank], (counts.get(RANK_INDEX[c.rank]) ?? 0) + 1);
  let best: { category: 0 | 1 | 2 | 3; rank: number } = { category: 0, rank: -1 };
  for (const [rank, count] of counts) {
    if (count === 4 && best.category < 3) best = { category: 3, rank };
    else if (count === 3 && best.category < 2) best = { category: 2, rank };
    else if (count === 2 && best.category < 1) best = { category: 1, rank };
  }
  return best;
}

function juegoInfo(hand: Card[]): { sum: number; isJuego: boolean; score: number } {
  const sum = hand.reduce((acc, c) => acc + MUS_VALUE[c.rank], 0);
  const isJuego = sum >= 31;
  const score = isJuego ? JUEGO_ORDER.length - JUEGO_ORDER.indexOf(sum > 40 ? 40 : sum) : sum;
  return { sum, isJuego, score };
}

function bestCard(hand: Card[], wantHighest: boolean): number {
  const idxs = hand.map((c) => RANK_INDEX[c.rank]).sort((a, b) => (wantHighest ? b - a : a - b));
  // Comparación lexicográfica de las 4 cartas ordenadas (de mejor a peor para ese criterio).
  let score = 0;
  for (let i = 0; i < idxs.length; i++) {
    const v = wantHighest ? idxs[i] : SPANISH_RANKS.length - 1 - idxs[i];
    score += v * Math.pow(20, idxs.length - i);
  }
  return score;
}

function phaseApplies(state: MusState, phase: MusPhaseName): boolean {
  if (phase === "pares") return state.players.some((p) => pairCategory(state.hands[p]).category > 0);
  if (phase === "juego") return true; // si nadie tiene juego se juega "de punto"
  return true;
}

function compareForPhase(state: MusState, phase: MusPhaseName): Team {
  const scoreOf = (playerId: PlayerId): number => {
    const hand = state.hands[playerId];
    if (phase === "grande") return bestCard(hand, true);
    if (phase === "chica") return bestCard(hand, false);
    if (phase === "pares") {
      const p = pairCategory(hand);
      return p.category * 1000 + p.rank;
    }
    return juegoInfo(hand).score;
  };
  let bestPlayer = state.players[0];
  let bestScore = -Infinity;
  for (const p of state.players) {
    const s = scoreOf(p);
    if (s > bestScore) {
      bestScore = s;
      bestPlayer = p;
    }
  }
  return teamOfPlayer(state, bestPlayer);
}

function startBettingPhase(state: MusState): MusState {
  let idx = state.phaseIndex;
  while (idx < state.phaseOrder.length && !phaseApplies(state, state.phaseOrder[idx])) {
    idx++;
  }
  if (idx >= state.phaseOrder.length) {
    return finishHand(state);
  }
  const phase = state.phaseOrder[idx];
  const skippedLog =
    idx > state.phaseIndex
      ? [`Nadie tiene pares: se salta esa ronda.`]
      : [];
  return {
    ...state,
    phaseIndex: idx,
    phase,
    betting: { turnSeat: state.mano, pendingBet: null, previousAmount: 1, consecutivePasses: 0 },
    log: [...state.log, ...skippedLog, `Ronda de ${phase}.`],
  };
}

function resolvePhase(state: MusState, winnerTeam: Team, points: number, mode: "compare" | "fold"): MusState {
  const scores = { ...state.scores, [winnerTeam]: state.scores[winnerTeam] + points };
  const phase = state.phase as MusPhaseName;
  const log = [
    ...state.log,
    mode === "fold"
      ? `Equipo ${winnerTeam} gana ${points} punto(s) de ${phase} (el rival se retiró).`
      : `Equipo ${winnerTeam} gana ${points} punto(s) de ${phase} tras comparar manos.`,
  ];
  if (scores[winnerTeam] >= state.targetScore) {
    return { ...state, scores, phase: "finished", finished: true, winnerTeam, betting: null, log: [...log, `¡Equipo ${winnerTeam} gana la partida!`] };
  }
  const next = { ...state, scores, phaseIndex: state.phaseIndex + 1, betting: null, log };
  return startBettingPhase(next);
}

function finishHand(state: MusState): MusState {
  const nextMano = (state.mano + 1) % state.players.length;
  const next: MusState = {
    ...state,
    mano: nextMano,
    handNumber: state.handNumber + 1,
    phaseOrder: ["grande", "chica", "pares", "juego"],
    phaseIndex: 0,
    log: [...state.log, "Fin de la mano."],
  };
  return dealHand(next, state.handNumber * 104729 + 17);
}

export const musEngine: GameEngine<MusState, MusView, MusAction> = {
  id: "mus",
  label: "Mus",
  minPlayers: 4,
  maxPlayers: 4,

  createInitialState(players, seed) {
    const base: MusState = {
      players,
      hands: {},
      stock: [],
      mano: 0,
      handNumber: 1,
      targetScore: 40,
      scores: { A: 0, B: 0 },
      phase: "discard",
      pendingDiscard: {},
      betting: null,
      phaseOrder: ["grande", "chica", "pares", "juego"],
      phaseIndex: 0,
      phaseResults: {},
      finished: false,
      winnerTeam: null,
      log: ["Comienza la partida de Mus."],
    };
    return dealHand(base, seed);
  },

  applyAction(state, playerId, action) {
    if (state.finished) throw new Error("La partida ya ha terminado.");

    if (state.phase === "discard") {
      if (action.type !== "discard") throw new Error("Debes decidir tu descarte.");
      if (state.pendingDiscard[playerId] !== null) throw new Error("Ya has descartado.");
      const hand = state.hands[playerId];
      for (const c of action.cards) {
        if (!hand.some((h) => h.suit === c.suit && h.rank === c.rank)) {
          throw new Error("No tienes esa carta para descartar.");
        }
      }
      const pendingDiscard = { ...state.pendingDiscard, [playerId]: action.cards };
      const allDone = state.players.every((p) => pendingDiscard[p] !== null);
      if (!allDone) {
        return { ...state, pendingDiscard, log: [...state.log, `${playerId} ha decidido su descarte.`] };
      }
      // Todos han decidido: se reparten cartas nuevas del stock.
      let stock = state.stock.slice();
      const hands = { ...state.hands };
      for (const p of state.players) {
        const discarded = pendingDiscard[p]!;
        if (discarded.length === 0) continue;
        const remaining = hands[p].filter((c) => !discarded.some((d) => d.suit === c.suit && d.rank === c.rank));
        const drawn = stock.slice(0, discarded.length);
        stock = stock.slice(discarded.length);
        hands[p] = [...remaining, ...drawn];
      }
      const next = { ...state, hands, stock, log: [...state.log, "Descarte completado."] };
      return startBettingPhase(next);
    }

    // Fases de envite.
    const betting = state.betting;
    if (!betting) throw new Error("No hay envite en curso.");
    const currentSeat = betting.turnSeat;
    if (state.players[currentSeat] !== playerId) throw new Error("No es tu turno.");
    const myTeam = teamOfSeat(currentSeat);
    const nextSeat = (currentSeat + 1) % state.players.length;

    if (action.type === "pass") {
      if (betting.pendingBet && betting.pendingBet.team !== myTeam) {
        throw new Error("Tu equipo debe responder al envite (quiero / no quiero / subir).");
      }
      const consecutivePasses = betting.consecutivePasses + 1;
      if (consecutivePasses >= state.players.length) {
        const winnerTeam = compareForPhase(state, state.phase as MusPhaseName);
        return resolvePhase(state, winnerTeam, betting.pendingBet ? betting.pendingBet.amount : 1, "compare");
      }
      return { ...state, betting: { ...betting, turnSeat: nextSeat, consecutivePasses } };
    }

    if (action.type === "bet" || action.type === "ordago") {
      const amount = action.type === "ordago" ? state.targetScore * 2 : action.amount;
      if (action.type === "bet" && (!Number.isFinite(amount) || amount <= 0)) {
        throw new Error("Cantidad de envite inválida.");
      }
      if (betting.pendingBet && amount <= betting.pendingBet.amount && action.type !== "ordago") {
        throw new Error("Debes subir por encima del envite actual.");
      }
      const previousAmount = betting.pendingBet ? betting.pendingBet.amount : 1;
      return {
        ...state,
        betting: {
          turnSeat: nextSeat,
          pendingBet: { team: myTeam, amount, ordago: action.type === "ordago" },
          previousAmount,
          consecutivePasses: 0,
        },
        log: [...state.log, action.type === "ordago" ? `${playerId} dice ¡órdago!` : `${playerId} envida ${amount}.`],
      };
    }

    if (action.type === "accept" || action.type === "reject") {
      if (!betting.pendingBet || betting.pendingBet.team === myTeam) {
        throw new Error("No hay envite del equipo contrario para responder.");
      }
      if (action.type === "reject") {
        const winnerTeam = betting.pendingBet.team;
        const points = betting.previousAmount;
        return resolvePhase(state, winnerTeam, points, "fold");
      }
      // Quiero.
      if (betting.pendingBet.ordago) {
        const winnerTeam = compareForPhase(state, state.phase as MusPhaseName);
        return { ...state, phase: "finished", finished: true, winnerTeam, betting: null, log: [...state.log, `Se acepta el órdago. ¡Equipo ${winnerTeam} gana la partida!`] };
      }
      const winnerTeam = compareForPhase(state, state.phase as MusPhaseName);
      return resolvePhase(state, winnerTeam, betting.pendingBet.amount, "compare");
    }

    throw new Error("Acción desconocida.");
  },

  view(state, playerId) {
    const handSizes: Record<PlayerId, number> = {};
    state.players.forEach((p) => (handSizes[p] = state.hands[p]?.length ?? 0));
    const awaitingDiscardFrom = state.phase === "discard" ? state.players.filter((p) => state.pendingDiscard[p] === null) : [];
    return {
      players: state.players,
      myHand: state.hands[playerId] ?? [],
      handSizes,
      mano: state.players[state.mano],
      scores: state.scores,
      targetScore: state.targetScore,
      phase: state.phase,
      betting: state.betting,
      turnPlayer: state.betting ? state.players[state.betting.turnSeat] : null,
      awaitingDiscardFrom,
      finished: state.finished,
      winnerTeam: state.winnerTeam,
      log: state.log.slice(-20),
    };
  },

  isOver(state) {
    return state.finished;
  },
};
