import {
  Card,
  SPANISH_RANKS,
  buildSpanishDeck,
  createRng,
  shuffle,
} from "../deck";
import { GameEngine, PlayerId } from "../engine";

// Explicit house variant: four kings, forty points, no real juego or mus corrido.
export type Team = "A" | "B";
export type MusPhaseName = "grande" | "chica" | "pares" | "juego";
export type BettingState = {
  turnSeat: number;
  pendingBet: { team: Team; amount: number; ordago?: boolean } | null;
  previousAmount: number;
  consecutivePasses: number;
};
type PhaseResult = { winnerTeam: Team; points: number; bonus: number };
export type MusState = {
  players: PlayerId[];
  hands: Record<PlayerId, Card[]>;
  stock: Card[];
  discarded: Card[];
  seed: number;
  discardNumber: number;
  musTurn: number;
  musVotes: number;
  mano: number;
  handNumber: number;
  targetScore: number;
  scores: Record<Team, number>;
  phase: "mus" | "discard" | MusPhaseName | "showdown" | "finished";
  pendingDiscard: Record<PlayerId, Card[] | null>;
  betting: BettingState | null;
  phaseOrder: MusPhaseName[];
  phaseIndex: number;
  phaseResults: Partial<Record<MusPhaseName, PhaseResult>>;
  finished: boolean;
  winnerTeam: Team | null;
  log: string[];
};
export type MusView = {
  players: PlayerId[];
  myHand: Card[];
  handSizes: Record<PlayerId, number>;
  mano: PlayerId;
  handNumber: number;
  scores: Record<Team, number>;
  targetScore: number;
  phase: MusState["phase"];
  betting: BettingState | null;
  turnPlayer: PlayerId | null;
  awaitingDiscardFrom: PlayerId[];
  isPunto: boolean;
  revealedHands?: Record<PlayerId, Card[]>;
  finished: boolean;
  winnerTeam: Team | null;
  log: string[];
};
export type MusAction =
  | { type: "mus"; wantsMus: boolean }
  | { type: "discard"; cards: Card[] }
  | { type: "next-hand" }
  | { type: "pass" }
  | { type: "bet"; amount: number }
  | { type: "ordago" }
  | { type: "accept" }
  | { type: "reject" };
const rankIndex = Object.fromEntries(SPANISH_RANKS.map((rank, i) => [rank, i]));
const teamOfSeat = (seat: number): Team => (seat % 2 === 0 ? "A" : "B");
const sumOf = (hand: Card[]) =>
  hand.reduce((sum, c) => sum + Math.min(10, Number(c.rank)), 0);
const gameOrder = [31, 32, 40, 39, 38, 37, 36, 35, 34, 33];
function pairs(hand: Card[]): number[] {
  const counts = new Map<number, number>();
  for (const c of hand)
    counts.set(rankIndex[c.rank], (counts.get(rankIndex[c.rank]) || 0) + 1);
  const groups = [...counts].sort((a, b) => b[0] - a[0]);
  const four = groups.find(([, n]) => n === 4),
    triple = groups.find(([, n]) => n === 3);
  const doubles = groups.filter(([, n]) => n === 2).map(([r]) => r);
  return four
    ? [3, four[0], four[0]]
    : doubles.length === 2
      ? [3, ...doubles]
      : triple
        ? [2, triple[0]]
        : doubles.length
          ? [1, ...doubles]
          : [0];
}
function eligible(state: MusState, phase: MusPhaseName): number[] {
  const hasGame = state.players.some((p) => sumOf(state.hands[p]) >= 31);
  return state.players
    .map((_, i) => i)
    .filter((i) =>
      phase === "pares"
        ? pairs(state.hands[state.players[i]])[0] > 0
        : phase === "juego" && hasGame
          ? sumOf(state.hands[state.players[i]]) >= 31
          : true,
    );
}
function nextEligible(
  state: MusState,
  from: number,
  phase: MusPhaseName,
  team?: Team,
): number {
  const seats = eligible(state, phase);
  for (let offset = 1; offset <= 4; offset++) {
    const seat = (from + offset) % 4;
    if (seats.includes(seat) && (!team || teamOfSeat(seat) === team))
      return seat;
  }
  throw new Error("No hay jugador habilitado para este lance.");
}
function compareForPhase(state: MusState, phase: MusPhaseName): Team {
  const score = (seat: number): number[] => {
    const hand = state.hands[state.players[seat]];
    if (phase === "pares") return pairs(hand);
    if (phase === "juego") {
      const sum = sumOf(hand);
      return [sum >= 31 ? 100 - gameOrder.indexOf(sum) : sum];
    }
    const ranks = hand.map((c) => rankIndex[c.rank]);
    return phase === "grande"
      ? ranks.sort((a, b) => b - a)
      : ranks.sort((a, b) => a - b).map((r) => -r);
  };
  const seats = eligible(state, phase);
  let best = -1,
    bestScore: number[] = [];
  for (let offset = 0; offset < 4; offset++) {
    const seat = (state.mano + offset) % 4;
    if (!seats.includes(seat)) continue;
    const current = score(seat);
    let better = best === -1;
    for (
      let i = 0;
      best !== -1 && i < Math.max(current.length, bestScore.length);
      i++
    ) {
      const diff = (current[i] ?? -1) - (bestScore[i] ?? -1);
      if (diff) {
        better = diff > 0;
        break;
      }
    }
    if (better) {
      best = seat;
      bestScore = current;
    }
  }
  return teamOfSeat(best);
}
function bonusFor(state: MusState, phase: MusPhaseName, team: Team): number {
  if (phase === "pares")
    return state.players.reduce(
      (total, p, i) =>
        total + (teamOfSeat(i) === team ? pairs(state.hands[p])[0] : 0),
      0,
    );
  if (phase === "juego")
    return state.players.reduce(
      (total, p, i) =>
        total +
        (teamOfSeat(i) === team && sumOf(state.hands[p]) >= 31
          ? sumOf(state.hands[p]) === 31
            ? 3
            : 2
          : 0),
      0,
    );
  return 0;
}
function finished(state: MusState, team: Team): MusState {
  return {
    ...state,
    phase: "finished",
    finished: true,
    winnerTeam: team,
    betting: null,
    log: [...state.log, `¡Pareja ${team} gana la partida!`],
  };
}
function settleHand(state: MusState): MusState {
  let next = { ...state, scores: { ...state.scores }, betting: null };
  for (const phase of state.phaseOrder) {
    const result = state.phaseResults[phase];
    if (!result) continue;
    const points = result.points + result.bonus;
    next.scores[result.winnerTeam] += points;
    next.log = [
      ...next.log,
      `Recuento de ${phase}: pareja ${result.winnerTeam}, ${points} tanto(s).`,
    ];
    if (next.scores[result.winnerTeam] >= next.targetScore)
      return finished(next, result.winnerTeam);
  }
  return {
    ...next,
    phase: "showdown",
    log: [...next.log, "Fin de la mano. Cartas a la vista."],
  };
}
function startPhase(state: MusState): MusState {
  if (state.phaseIndex >= state.phaseOrder.length) return settleHand(state);
  const phase = state.phaseOrder[state.phaseIndex],
    seats = eligible(state, phase);
  const teams = new Set(seats.map(teamOfSeat));
  if (!seats.length)
    return startPhase({
      ...state,
      phaseIndex: state.phaseIndex + 1,
      log: [...state.log, "Nadie tiene pares."],
    });
  if (teams.size === 1) {
    const winnerTeam = teamOfSeat(seats[0]);
    return startPhase({
      ...state,
      phaseIndex: state.phaseIndex + 1,
      phaseResults: {
        ...state.phaseResults,
        [phase]: {
          winnerTeam,
          points: 0,
          bonus: bonusFor(state, phase, winnerTeam),
        },
      },
      log: [
        ...state.log,
        `Solo la pareja ${winnerTeam} tiene ${phase}. No hay envite.`,
      ],
    });
  }
  const turnSeat = seats.includes(state.mano)
    ? state.mano
    : nextEligible(state, state.mano, phase);
  return {
    ...state,
    phase,
    betting: {
      turnSeat,
      pendingBet: null,
      previousAmount: 1,
      consecutivePasses: 0,
    },
    log: [
      ...state.log,
      `Lance de ${phase === "juego" && !state.players.some((p) => sumOf(state.hands[p]) >= 31) ? "punto" : phase}.`,
    ],
  };
}
function closePhase(
  state: MusState,
  winnerTeam: Team,
  points: number,
): MusState {
  const phase = state.phase as MusPhaseName;
  return startPhase({
    ...state,
    phaseIndex: state.phaseIndex + 1,
    betting: null,
    phaseResults: {
      ...state.phaseResults,
      [phase]: {
        winnerTeam,
        points,
        bonus: bonusFor(state, phase, winnerTeam),
      },
    },
  });
}
function dealHand(state: MusState): MusState {
  const deck = shuffle(
    buildSpanishDeck(),
    createRng(state.seed + state.handNumber * 104729),
  );
  const hands: Record<PlayerId, Card[]> = {},
    pendingDiscard: Record<PlayerId, Card[] | null> = {};
  state.players.forEach((p, i) => {
    hands[p] = deck.slice(i * 4, i * 4 + 4);
    pendingDiscard[p] = null;
  });
  return {
    ...state,
    hands,
    pendingDiscard,
    stock: deck.slice(16),
    discarded: [],
    discardNumber: 0,
    musTurn: state.mano,
    musVotes: 0,
    phase: "mus",
    betting: null,
    phaseIndex: 0,
    phaseResults: {},
    log: [...state.log, `Reparto de la mano ${state.handNumber}. ¿Hay mus?`],
  };
}
// Saved rooms from the previous engine can be resumed without changing transport/storage.
function normalizeLegacy(state: MusState): MusState {
  if (Number.isFinite(state.seed) && Array.isArray(state.discarded))
    return state;
  const used = new Set(
    [...Object.values(state.hands).flat(), ...state.stock].map(
      (c) => `${c.suit}:${c.rank}`,
    ),
  );
  const phaseResults = Object.fromEntries(
    Object.entries(state.phaseResults || {}).filter(
      ([, value]) => typeof value === "object" && value !== null,
    ),
  ) as MusState["phaseResults"];
  let seed = 17;
  for (const c of Object.values(state.hands).flat())
    seed = (seed * 31 + rankIndex[c.rank]) >>> 0;
  return {
    ...state,
    seed,
    discarded: buildSpanishDeck().filter(
      (c) => !used.has(`${c.suit}:${c.rank}`),
    ),
    discardNumber: 0,
    musTurn: state.mano,
    musVotes: 0,
    phaseResults,
  };
}
export const musEngine: GameEngine<MusState, MusView, MusAction> = {
  id: "mus",
  label: "Mus",
  minPlayers: 4,
  maxPlayers: 4,
  createInitialState(players, seed) {
    if (players.length !== 4 || new Set(players).size !== 4)
      throw new Error("El Mus requiere exactamente 4 jugadores distintos.");
    return dealHand({
      players: [...players],
      hands: {},
      stock: [],
      discarded: [],
      seed,
      discardNumber: 0,
      musTurn: 0,
      musVotes: 0,
      mano: 0,
      handNumber: 1,
      targetScore: 40,
      scores: { A: 0, B: 0 },
      phase: "mus",
      pendingDiscard: {},
      betting: null,
      phaseOrder: ["grande", "chica", "pares", "juego"],
      phaseIndex: 0,
      phaseResults: {},
      finished: false,
      winnerTeam: null,
      log: ["Mus: 4 reyes, 40 tantos, parejas alternas."],
    });
  },
  applyAction(state, playerId, action) {
    state = normalizeLegacy(state);
    if (!state.players.includes(playerId))
      throw new Error("Jugador desconocido.");
    if (state.finished) throw new Error("La partida ya ha terminado.");
    if (state.phase === "showdown") {
      if (action.type !== "next-hand" || playerId !== state.players[state.mano])
        throw new Error("La mano debe iniciar el siguiente reparto.");
      return dealHand({
        ...state,
        mano: (state.mano + 1) % 4,
        handNumber: state.handNumber + 1,
      });
    }
    if (state.phase === "mus") {
      if (action.type !== "mus" || typeof action.wantsMus !== "boolean")
        throw new Error("Debes decir mus o no hay mus.");
      if (state.players[state.musTurn] !== playerId)
        throw new Error("No es tu turno.");
      const log = [
        ...state.log,
        `${playerId}: ${action.wantsMus ? "mus" : "no hay mus"}.`,
      ];
      if (!action.wantsMus) return startPhase({ ...state, log });
      const musVotes = state.musVotes + 1;
      return {
        ...state,
        log,
        musVotes,
        musTurn: (state.musTurn + 1) % 4,
        phase: musVotes === 4 ? "discard" : "mus",
      };
    }
    if (state.phase === "discard") {
      if (action.type !== "discard")
        throw new Error("Debes decidir tu descarte.");
      if (state.pendingDiscard[playerId] !== null)
        throw new Error("Ya has descartado.");
      const hand = state.hands[playerId],
        keys = action.cards.map((c) => `${c.suit}:${c.rank}`);
      if (!keys.length || keys.length > 4 || new Set(keys).size !== keys.length)
        throw new Error("Cambia entre una y cuatro cartas distintas.");
      if (
        action.cards.some(
          (c) => !hand.some((h) => h.suit === c.suit && h.rank === c.rank),
        )
      )
        throw new Error("No tienes esa carta.");
      const pendingDiscard = {
        ...state.pendingDiscard,
        [playerId]: action.cards,
      };
      if (!state.players.every((p) => pendingDiscard[p] !== null))
        return {
          ...state,
          pendingDiscard,
          log: [...state.log, `${playerId} confirma su descarte.`],
        };
      let stock = [...state.stock],
        discarded = [...state.discarded],
        hands = { ...state.hands };
      // Cards discarded this round enter the recycle pile only after everyone draws.
      if (
        stock.length <
        state.players.reduce((n, p) => n + pendingDiscard[p]!.length, 0)
      ) {
        stock = [
          ...stock,
          ...shuffle(
            discarded,
            createRng(
              state.seed + state.handNumber * 1009 + state.discardNumber,
            ),
          ),
        ];
        discarded = [];
      }
      for (let offset = 0; offset < 4; offset++) {
        const p = state.players[(state.mano + offset) % 4],
          remove = pendingDiscard[p]!;
        hands[p] = [
          ...hands[p].filter(
            (c) => !remove.some((d) => d.suit === c.suit && d.rank === c.rank),
          ),
          ...stock.splice(0, remove.length),
        ];
      }
      discarded.push(...state.players.flatMap((p) => pendingDiscard[p]!));
      return {
        ...state,
        hands,
        stock,
        discarded,
        pendingDiscard: Object.fromEntries(state.players.map((p) => [p, null])),
        discardNumber: state.discardNumber + 1,
        musVotes: 0,
        musTurn: state.mano,
        phase: "mus",
        log: [...state.log, "Descarte completado. ¿Hay mus otra vez?"],
      };
    }
    const betting = state.betting,
      phase = state.phase as MusPhaseName;
    if (!betting || state.players[betting.turnSeat] !== playerId)
      throw new Error("No es tu turno.");
    const myTeam = teamOfSeat(betting.turnSeat),
      pending = betting.pendingBet;
    if (action.type === "pass") {
      if (pending)
        throw new Error("Debes responder: quiero, no quiero, subir u órdago.");
      const consecutivePasses = betting.consecutivePasses + 1;
      const next = {
        ...state,
        log: [...state.log, `${playerId} pasa en ${phase}.`],
      };
      if (consecutivePasses >= eligible(state, phase).length) {
        const noGame =
          phase === "juego" &&
          !state.players.some((p) => sumOf(state.hands[p]) >= 31);
        return closePhase(
          next,
          compareForPhase(state, phase),
          phase === "grande" || phase === "chica" || noGame ? 1 : 0,
        );
      }
      return {
        ...next,
        betting: {
          ...betting,
          consecutivePasses,
          turnSeat: nextEligible(state, betting.turnSeat, phase),
        },
      };
    }
    if (action.type === "bet" || action.type === "ordago") {
      if (pending?.ordago)
        throw new Error("Un órdago solo se puede aceptar o rechazar.");
      const amount =
        action.type === "ordago" ? state.targetScore * 2 : action.amount;
      if (!Number.isSafeInteger(amount) || amount < 2 || amount > 1000000)
        throw new Error("El envite debe ser un entero de al menos 2 tantos.");
      if (pending && (pending.team === myTeam || amount <= pending.amount))
        throw new Error("Debes subir el envite rival.");
      const rival: Team = myTeam === "A" ? "B" : "A";
      return {
        ...state,
        betting: {
          turnSeat: nextEligible(state, betting.turnSeat, phase, rival),
          pendingBet: {
            team: myTeam,
            amount,
            ordago: action.type === "ordago",
          },
          previousAmount: pending?.amount || 1,
          consecutivePasses: 0,
        },
        log: [
          ...state.log,
          `${playerId} ${action.type === "ordago" ? "dice ¡órdago!" : `envida ${amount}`}.`,
        ],
      };
    }
    if (action.type === "accept" || action.type === "reject") {
      if (!pending || pending.team === myTeam)
        throw new Error("No hay envite rival.");
      if (action.type === "reject") {
        const scores = {
          ...state.scores,
          [pending.team]: state.scores[pending.team] + betting.previousAmount,
        };
        const next = {
          ...state,
          scores,
          log: [
            ...state.log,
            `${playerId}: no quiero. Pareja ${pending.team} suma ${betting.previousAmount}.`,
          ],
        };
        if (scores[pending.team] >= state.targetScore)
          return finished(next, pending.team);
        return closePhase(next, pending.team, 0);
      }
      const next = {
        ...state,
        log: [
          ...state.log,
          `${playerId}: quiero${pending.ordago ? " el órdago" : ". Envite pendiente del recuento"}.`,
        ],
      };
      if (pending.ordago) return finished(next, compareForPhase(state, phase));
      const pointBonus =
        phase === "juego" &&
        !state.players.some((p) => sumOf(state.hands[p]) >= 31)
          ? 1
          : 0;
      return closePhase(
        next,
        compareForPhase(state, phase),
        pending.amount + pointBonus,
      );
    }
    throw new Error("Acción inválida para este lance.");
  },
  view(state, playerId) {
    state = normalizeLegacy(state);
    const visible = state.phase === "showdown" || state.finished;
    return {
      players: state.players,
      myHand: state.hands[playerId] || [],
      handSizes: Object.fromEntries(
        state.players.map((p) => [p, state.hands[p].length]),
      ),
      mano: state.players[state.mano],
      handNumber: state.handNumber,
      scores: state.scores,
      targetScore: state.targetScore,
      phase: state.phase,
      betting: state.betting,
      turnPlayer:
        state.phase === "mus"
          ? state.players[state.musTurn]
          : state.phase === "showdown"
            ? state.players[state.mano]
            : state.betting
              ? state.players[state.betting.turnSeat]
              : null,
      awaitingDiscardFrom:
        state.phase === "discard"
          ? state.players.filter((p) => state.pendingDiscard[p] === null)
          : [],
      isPunto:
        state.phase === "juego" &&
        !state.players.some((p) => sumOf(state.hands[p]) >= 31),
      ...(visible ? { revealedHands: state.hands } : {}),
      finished: state.finished,
      winnerTeam: state.winnerTeam,
      log: state.log.slice(-20),
    };
  },
  isOver(state) {
    return state.finished;
  },
};
