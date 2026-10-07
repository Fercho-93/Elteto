import {
  Card,
  SPANISH_RANKS,
  buildSpanishDeck,
  createRng,
  shuffle,
} from "../deck";
import { GameEngine, PlayerId } from "../engine";

// Fournier: eight kings/aces, forty stones per game, first team to three games.
// Old states retain their four-kings, single-game variant.
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
  ruleset: "eight-kings" | "four-kings";
  gamesWon: Record<Team, number>;
  targetGames: number;
  gameWinner: Team | null;
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
  ruleset: MusState["ruleset"];
  gamesWon: Record<Team, number>;
  targetGames: number;
  gameWinner: Team | null;
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
export function musRank(rank: string, ruleset: MusState["ruleset"]): number {
 return rankIndex[ruleset === "eight-kings" ? rank === "3" ? "12" : rank === "2" ? "1" : rank : rank];
}
export function musCardValue(rank: string, ruleset: MusState["ruleset"]): number {
 return ruleset === "eight-kings" && rank === "3" ? 10 : ruleset === "eight-kings" && rank === "2" ? 1 : Math.min(10, Number(rank));
}
const sumOf = (hand: Card[], ruleset: MusState["ruleset"]) => hand.reduce((sum,c)=>sum+musCardValue(c.rank,ruleset),0);
const gameOrder = [31, 32, 40, 39, 38, 37, 36, 35, 34, 33];
function pairs(hand: Card[], ruleset: MusState["ruleset"]): number[] {
  const counts = new Map<number, number>();
  for (const c of hand)
    counts.set(musRank(c.rank, ruleset), (counts.get(musRank(c.rank, ruleset)) || 0) + 1);
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
  const hasGame = state.players.some((p) => sumOf(state.hands[p], state.ruleset) >= 31);
  return state.players
    .map((_, i) => i)
    .filter((i) =>
      phase === "pares"
        ? pairs(state.hands[state.players[i]], state.ruleset)[0] > 0
        : phase === "juego" && hasGame
          ? sumOf(state.hands[state.players[i]], state.ruleset) >= 31
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
    if (phase === "pares") return pairs(hand, state.ruleset);
    if (phase === "juego") {
      const sum = sumOf(hand, state.ruleset);
      return [sum >= 31 ? 100 - gameOrder.indexOf(sum) : sum];
    }
    const ranks = hand.map((c) => musRank(c.rank, state.ruleset));
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
        total + (teamOfSeat(i) === team ? pairs(state.hands[p], state.ruleset)[0] : 0),
      0,
    );
  if (phase === "juego")
    return state.players.reduce(
      (total, p, i) =>
        total +
        (teamOfSeat(i) === team && sumOf(state.hands[p], state.ruleset) >= 31
          ? sumOf(state.hands[p], state.ruleset) === 31
            ? 3
            : 2
          : 0),
      0,
    );
  return 0;
}
function finished(state: MusState, team: Team): MusState {
 const gamesWon = {...state.gamesWon, [team]:state.gamesWon[team]+1};
 const matchOver = gamesWon[team] >= state.targetGames;
 return {...state, gamesWon, gameWinner:team, phase:matchOver ? "finished" : "showdown", finished:matchOver,
  winnerTeam:matchOver ? team : null, betting:null,
  log:[...state.log, `Pareja ${team} gana el juego completo (${gamesWon[team]}/${state.targetGames}).${matchOver ? " Gana la partida." : " Cartas a la vista."}`]};
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
      `Lance de ${phase === "juego" && !state.players.some((p) => sumOf(state.hands[p], state.ruleset) >= 31) ? "punto" : phase}.`,
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
    createRng(state.seed + (state.gamesWon.A + state.gamesWon.B) * 1000003 + state.handNumber * 104729),
  );
  const hands: Record<PlayerId, Card[]> = {},
    pendingDiscard: Record<PlayerId, Card[] | null> = {};
  state.players.forEach((p, i) => {
    hands[p] = Array.from({length:4},(_,round)=>deck[round*4+(i-state.mano+4)%4]);
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
  state = {...state, ruleset: state.ruleset ?? "four-kings", gamesWon: state.gamesWon ?? {A:0,B:0}, targetGames:state.targetGames ?? 1, gameWinner:state.gameWinner ?? null};
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
      ruleset: "eight-kings",
      gamesWon: {A:0,B:0},
      targetGames: 3,
      gameWinner: null,
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
      log: ["Mus: 8 reyes y 8 ases, 40 tantos, primero en ganar 3 juegos completos."],
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
        handNumber: state.gameWinner ? 1 : state.handNumber + 1,
        scores: state.gameWinner ? {A:0,B:0} : state.scores,
        gameWinner: null,
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
      if (!action.wantsMus) return startPhase({ ...state, mano: state.handNumber === 1 && state.ruleset === "eight-kings" ? state.musTurn : state.mano, log });
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
      let stock = [...state.stock];
      let discarded = [...state.discarded, ...state.players.flatMap(p => pendingDiscard[p]!)];
      const hands = Object.fromEntries(state.players.map(p => [p,state.hands[p].filter(c => !pendingDiscard[p]!.some(d => d.suit === c.suit && d.rank === c.rank))]));
      const discardMano = state.handNumber === 1 && state.ruleset === "eight-kings" ? (state.mano + 1) % 4 : state.mano;
      for (let offset = 0; offset < 4; offset++) {
        const p = state.players[(discardMano + offset) % 4];
        for (let draw=0; draw<pendingDiscard[p]!.length; draw++) {
          if (!stock.length) {
            // Fournier: recycle everyone's discards, except the last recipient's
            // current discard when that player alone still needs cards.
            const alone = !state.players.slice().some((_,i)=>i>offset && pendingDiscard[state.players[(discardMano+i)%4]]!.length>0);
            const ownDiscard = (c:Card) => alone && pendingDiscard[p]!.some(d => d.suit===c.suit && d.rank===c.rank);
            const recycle = discarded.filter(c => !ownDiscard(c));
            discarded = discarded.filter(ownDiscard);
            stock = shuffle(recycle,createRng(state.seed + state.handNumber*1009 + state.discardNumber*17 + offset));
            if (!stock.length) throw new Error("No hay cartas disponibles para completar el descarte.");
          }
          hands[p].push(stock.shift()!);
        }
      }
      return {
        ...state,
        hands,
        stock,
        discarded,
        pendingDiscard: Object.fromEntries(state.players.map((p) => [p, null])),
        discardNumber: state.discardNumber + 1,
        musVotes: 0,
        mano: state.handNumber === 1 && state.ruleset === "eight-kings" ? (state.mano + 1) % 4 : state.mano,
        musTurn: state.handNumber === 1 && state.ruleset === "eight-kings" ? (state.mano + 1) % 4 : state.mano,
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
          !state.players.some((p) => sumOf(state.hands[p], state.ruleset) >= 31);
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
        const point = phase === "juego" && !state.players.some(p=>sumOf(state.hands[p],state.ruleset)>=31) ? 1 : 0;
        return closePhase(next, pending.team, point);
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
        !state.players.some((p) => sumOf(state.hands[p], state.ruleset) >= 31)
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
      ruleset: state.ruleset,
      gamesWon: {...state.gamesWon},
      targetGames: state.targetGames,
      gameWinner: state.gameWinner,
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
        !state.players.some((p) => sumOf(state.hands[p], state.ruleset) >= 31),
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

/** Explicit engine profile for the alternative described by Fournier; no room protocol change. */
export function createMusState(players: PlayerId[], seed: number, ruleset: MusState["ruleset"] = "eight-kings"): MusState {
 const state = musEngine.createInitialState(players,seed);
 return {...state,ruleset,log:[`Mus: ${ruleset === "eight-kings" ? "8 reyes y 8 ases" : "4 reyes y 4 ases"}, 40 tantos, primero en ganar 3 juegos completos.`]};
}
