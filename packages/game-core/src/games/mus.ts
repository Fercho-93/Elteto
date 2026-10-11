import { Card, buildSpanishDeck, createRng, shuffle } from "../deck";
import { GameEngine, PlayerId } from "../engine";
import { legacyMusEngine } from "./mus-legacy";
import {
  calculateGrande,
  calculateChica,
  calculatePairs,
  calculateJuego,
  calculatePunto,
  compareGrande,
  compareChica,
  comparePairs,
  compareJuego,
  comparePunto,
  calculateSignals,
} from "./mus-evaluation";
import {
  MusTeam as Team,
  MusLance as Lance,
  ScoreEntry,
  ScoreCause,
  applyAmarraco,
  calculateScore,
  applyNegada,
} from "./mus-scoring";
export { musRank, musCardValue, legacyMusEngine } from "./mus-legacy";
export * from "./mus-evaluation";
export * from "./mus-scoring";
export type MusPhase =
  | "dealing"
  | "cards-dealt"
  | "mus"
  | "discard"
  | "redeal"
  | "grande"
  | "chica"
  | "pares-declaration"
  | "pares"
  | "juego-declaration"
  | "juego"
  | "punto"
  | "showing"
  | "counting"
  | "showdown"
  | "finished";
const STAGES: Record<MusPhase, string> = {
  dealing: "DEALING",
  "cards-dealt": "CARDS_DEALT",
  mus: "MUS_DECISION",
  discard: "MUS_DISCARD",
  redeal: "MUS_REDEAL",
  grande: "GRANDE",
  chica: "CHICA",
  "pares-declaration": "PARES_DECLARATION",
  pares: "PARES",
  "juego-declaration": "JUEGO_DECLARATION",
  juego: "JUEGO",
  punto: "PUNTO",
  showing: "SHOWING_CARDS",
  counting: "COUNTING",
  showdown: "HAND_OVER",
  finished: "GAME_OVER",
};
export type MusAction = {
  type: string;
  wantsMus?: boolean;
  cards?: Card[];
  amount?: number;
  has?: boolean;
  targetScore?: number;
  expectedRevision?: number;
  expectedDiscardRound?: string;
  at?: number;
};
type Betting = {
  turnSeat: number;
  pendingBet: {
    team: Team;
    player: PlayerId;
    amount: number;
    ordago: boolean;
  } | null;
  previousAmount: number;
  consecutivePasses: number;
  history: { player: PlayerId; type: string; amount: number }[];
  status: string;
};
type Result = {
  lance: Lance;
  kind: "paso" | "accepted" | "rejected" | "only-team" | "none";
  amount: number;
  winnerTeam?: Team;
  winnerPlayer?: PlayerId;
  counted: boolean;
};
type Event = {
  sequence: number;
  hand: number;
  stage: string;
  lance: Lance | null;
  type: string;
  player?: PlayerId;
  amount?: number;
  team?: Team;
  text: string;
  at: number | null;
};
export type MusState = {
  version: 2;
  ruleset: "eight-kings";
  players: PlayerId[];
  hands: Record<PlayerId, Card[]>;
  stock: Card[];
  discarded: Card[];
  seed: number;
  mano: number;
  dealer: number;
  handNumber: number;
  targetScore: number;
  scores: Record<Team, number>;
  phase: MusPhase;
  stage: string;
  revision: number;
  musTurn: number;
  musVotes: number;
  musDecisions: Record<PlayerId, "mus" | "corta" | null>;
  discardNumber: number;
  pendingDiscard: Record<PlayerId, Card[] | null>;
  discardCounts: Record<PlayerId, number | null>;
  declarations: {
    pares: Record<PlayerId, boolean | null>;
    juego: Record<PlayerId, boolean | null>;
  };
  declarationTurn: number;
  betting: Betting | null;
  lance: Lance | null;
  phaseOrder: Lance[];
  phaseIndex: number;
  phaseResults: Partial<Record<Lance, Result>>;
  countIndex: number;
  ledger: ScoreEntry[];
  events: Event[];
  log: string[];
  lastResult: Record<string, unknown> | null;
  finished: boolean;
  winnerTeam: Team | null;
  eventTime: number | null;
  timers: {
    enabled: boolean;
    musMs: number;
    betMs: number;
    ordagoMs: number;
    discardMs: number | null;
    deadline: number | null;
  };
};
export type MusView = ReturnType<typeof publicMusView>;
const team = (seat: number): Team => (seat % 2 ? "B" : "A");
const other = (t: Team): Team => (t === "A" ? "B" : "A");
const map = <T>(
  s: { players: PlayerId[] },
  fn: (p: PlayerId, i: number) => T,
) => Object.fromEntries(s.players.map((p, i) => [p, fn(p, i)]));
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const cardKey = (c: Card) => `${c.suit}:${c.rank}`;
function event(
  s: MusState,
  type: string,
  text: string,
  extra: Partial<Event> = {},
) {
  s.events.push({
    sequence: s.events.length + 1,
    hand: s.handNumber,
    stage: s.stage,
    lance: s.lance,
    type,
    text,
    at: s.eventTime,
    ...extra,
  });
  s.log.push(text);
}
function transition(s: MusState, phase: MusPhase) {
  s.phase = phase;
  s.stage = STAGES[phase];
  event(s, "transition", s.stage);
}
function eligible(s: MusState, lance = s.lance) {
  return s.players
    .map((_, i) => i)
    .filter((i) =>
      lance === "pares"
        ? calculatePairs(s.hands[s.players[i]]).hasPairs
        : lance === "juego"
          ? calculateJuego(s.hands[s.players[i]]).hasJuego
          : true,
    );
}
function nextSeat(s: MusState, from: number, t?: Team) {
  const seats = eligible(s);
  for (let offset = 1; offset <= 4; offset++) {
    const seat = (from + offset) % 4;
    if (seats.includes(seat) && (!t || team(seat) === t)) return seat;
  }
  throw new Error("No hay jugador habilitado para este lance.");
}
function winner(s: MusState, lance: Lance) {
  const compare = {
    grande: compareGrande,
    chica: compareChica,
    pares: comparePairs,
    juego: compareJuego,
    punto: comparePunto,
  }[lance];
  let best = -1;
  for (let n = 0; n < 4; n++) {
    const seat = (s.mano + n) % 4;
    if (!eligible(s, lance).includes(seat)) continue;
    if (
      best < 0 ||
      compare(s.hands[s.players[seat]], s.hands[s.players[best]]) > 0
    )
      best = seat;
  }
  return { winnerTeam: team(best), winnerPlayer: s.players[best] };
}
function ownPoints(s: MusState, lance: Lance, t: Team) {
  return s.players.reduce(
    (n, p, i) =>
      n +
      (team(i) !== t
        ? 0
        : lance === "pares"
          ? calculatePairs(s.hands[p]).points
          : lance === "juego"
            ? calculateJuego(s.hands[p]).points
            : 0),
    0,
  );
}
function finish(s: MusState, t: Team) {
  s.finished = true;
  s.winnerTeam = t;
  s.betting = null;
  transition(s, "finished");
  event(s, "game-over", `¡¡PARTIDA GANADA!! Pareja ${t}.`, { team: t });
}
function score(
  s: MusState,
  lance: Lance,
  t: Team,
  points: number,
  cause: ScoreCause,
  player?: PlayerId,
) {
  if (points <= 0 || s.finished) return;
  const before = s.scores[t],
    after = before + points;
  s.scores[t] = after;
  s.ledger.push({
    sequence: s.ledger.length + 1,
    hand: s.handNumber,
    lance,
    team: t,
    cause,
    points,
    before,
    after,
    player,
    amarracosBefore: Math.floor(before / 5),
    amarracosAfter: Math.floor(after / 5),
  });
  event(s, "score", `${lance}: pareja ${t}, +${points} (${cause}).`, {
    team: t,
    amount: points,
    player,
  });
  if (after >= s.targetScore) finish(s, t);
}
function prepareDeal(s: MusState) {
  const deck = shuffle(
    buildSpanishDeck(),
    createRng(s.seed + s.handNumber * 104729),
  );
  s.hands = map(s, (_, i) =>
    Array.from(
      { length: 4 },
      (_, round) => deck[round * 4 + ((i - s.mano + 4) % 4)],
    ),
  );
  s.stock = deck.slice(16);
  s.discarded = [];
  s.dealer = (s.mano + 3) % 4;
  s.pendingDiscard = map(s, () => null);
  s.discardCounts = map(s, () => null);
  s.musDecisions = map(s, () => null);
  s.musTurn = s.mano;
  s.musVotes = 0;
  s.discardNumber = 0;
  s.declarations = { pares: map(s, () => null), juego: map(s, () => null) };
  s.betting = null;
  s.lance = null;
  s.phaseIndex = 0;
  s.phaseResults = {};
  s.countIndex = 0;
  s.lastResult = null;
  transition(s, "dealing");
  event(s, "deal", `Repartiendo la mano ${s.handNumber}.`);
}
function startLance(s: MusState, lance: Lance) {
  s.lance = lance;
  s.phaseIndex = lance === "punto" ? 3 : s.phaseOrder.indexOf(lance);
  s.betting = null;
  if (lance === "pares" || lance === "juego") {
    s.declarationTurn = s.mano;
    transition(
      s,
      lance === "pares" ? "pares-declaration" : "juego-declaration",
    );
    event(
      s,
      "declaration",
      lance === "pares"
        ? "Declaramos pares, sin mostrar cartas."
        : "¿Tienes juego? Sin revelar su valor.",
    );
    return;
  }
  openBetting(s, lance);
}
function openBetting(s: MusState, lance: Lance) {
  s.lance = lance;
  transition(s, lance as MusPhase);
  const seats = eligible(s, lance),
    teams = new Set(seats.map(team));
  if (!seats.length) {
    s.phaseResults[lance] = { lance, kind: "none", amount: 0, counted: false };
    event(s, "closed", `Nadie tiene ${lance}.`);
    continueLance(s);
    return;
  }
  if (teams.size === 1) {
    s.phaseResults[lance] = {
      lance,
      kind: "only-team",
      amount: 0,
      ...winner(s, lance),
      counted: false,
    };
    event(
      s,
      "closed",
      `Solo la pareja ${team(seats[0])} tiene ${lance}; no hay envite.`,
    );
    continueLance(s);
    return;
  }
  const first = seats.includes(s.mano) ? s.mano : nextSeat(s, s.mano);
  s.betting = {
    turnSeat: first,
    pendingBet: null,
    previousAmount: 1,
    consecutivePasses: 0,
    history: [],
    status: "WAITING_FOR_TURN",
  };
  event(s, "lance", `Lance de ${lance}.`);
}
function continueLance(s: MusState) {
  s.betting = null;
  if (s.lance === "grande") startLance(s, "chica");
  else if (s.lance === "chica") startLance(s, "pares");
  else if (s.lance === "pares") startLance(s, "juego");
  else {
    transition(s, "showing");
    event(s, "reveal", "ENSEÑANDO CARTAS. Todos muestran sus cuatro cartas.");
  }
}
function closeLance(s: MusState, kind: Result["kind"], amount = 0, t?: Team) {
  const lance = s.lance!;
  s.phaseResults[lance] = {
    lance,
    kind,
    amount,
    ...(t ? { winnerTeam: t } : {}),
    counted: false,
  };
  s.lastResult = {
    lance,
    kind,
    amount,
    ...(t ? { winnerTeam: t } : {}),
    pending: kind === "accepted" || kind === "paso",
  };
  event(
    s,
    "RESOLVE",
    `${lance.toUpperCase()} cerrada${kind === "accepted" ? `: envite de ${amount} aceptado, pendiente del recuento` : kind === "rejected" ? " por no quiero" : ": en paso"}.`,
  );
  continueLance(s);
}
function countLance(s: MusState) {
  const lance = s.phaseOrder[s.countIndex++],
    r =
      s.phaseResults[lance] ||
      (lance === "juego" ? s.phaseResults.punto : undefined);
  s.lance = r?.lance || lance;
  if (r?.kind === "none") { r.counted = true; s.lastResult = {...r}; }
  if (r && r.kind !== "none") {
    const actual = r.lance,
      win = r.winnerTeam
        ? { winnerTeam: r.winnerTeam, winnerPlayer: r.winnerPlayer }
        : winner(s, actual);
    Object.assign(r, win, { counted: true });
    if (r.kind === "accepted")
      score(s, actual, win.winnerTeam, r.amount, "envite", win.winnerPlayer);
    else if (r.kind === "paso" && (actual === "grande" || actual === "chica"))
      score(s, actual, win.winnerTeam, 1, "paso", win.winnerPlayer);
    if (!s.finished) {
      const bonus = ownPoints(s, actual, win.winnerTeam);
      if (bonus)
        score(
          s,
          actual,
          win.winnerTeam,
          bonus,
          actual === "pares" ? "pares propios" : "juego propio",
          win.winnerPlayer,
        );
      else if (actual === "punto")
        score(s, actual, win.winnerTeam, 1, "punto", win.winnerPlayer);
    }
    s.lastResult = { ...r };
  }
  if (!s.finished && s.countIndex >= 4) {
    transition(s, "showdown");
    event(
      s,
      "hand-over",
      "Recuento terminado. Comprueba el detalle antes de la siguiente mano.",
    );
  }
}
function refill(s: MusState) {
  const pending = s.pendingDiscard;
  let stock = [...s.stock],
    discards = [...s.discarded, ...s.players.flatMap((p) => pending[p]!)];
  const hands = map(s, (p) =>
    s.hands[p].filter(
      (c) => !pending[p]!.some((d) => cardKey(d) === cardKey(c)),
    ),
  );
  // All 40 cards are retained. Art.21 recycles the complete discard, with a seeded shuffle.
  for (let offset = 0; offset < 4; offset++) {
    const p = s.players[(s.mano + offset) % 4];
    for (let n = 0; n < pending[p]!.length; n++) {
      if (!stock.length) {
        stock = shuffle(
          discards,
          createRng(
            s.seed + s.handNumber * 1009 + s.discardNumber * 17 + offset,
          ),
        );
        discards = [];
      }
      if (!stock.length)
        throw new Error("No hay cartas para completar el reparto.");
      hands[p].push(stock.shift()!);
    }
  }
  s.hands = hands;
  s.stock = stock;
  s.discarded = discards;
  s.pendingDiscard = map(s, () => null);
  s.discardNumber++;
  s.musVotes = 0;
  s.musDecisions = map(s, () => null);
  if (s.handNumber === 1) {
    s.mano = (s.mano + 1) % 4;
    s.dealer = (s.mano + 3) % 4;
  }
  s.musTurn = s.mano;
  transition(s, "cards-dealt");
  event(
    s,
    "redealt",
    "CARTAS REPARTIDAS. Las nuevas cartas ya están en tu mano.",
  );
}
export function canCutMus(s: MusState, p: PlayerId) {
  if (
    !s.players.includes(p) ||
    !["mus", "dealing", "redeal", "cards-dealt"].includes(s.phase)
  )
    return false;
  if (Object.values(s.scores).some((n) => s.targetScore - n <= 5)) return true;
  if (s.phase !== "mus") return false;
  const offset = (s.players.indexOf(p) - s.mano + 4) % 4;
  return (
    s.players[s.musTurn] === p ||
    offset === 2 ||
    (offset === 3 &&
      s.musDecisions[s.players[s.mano]] === "mus" &&
      s.musDecisions[s.players[(s.mano + 2) % 4]] === "mus")
  );
}
function forbiddenOrdago(s: MusState, p: PlayerId) {
  const seats = eligible(s).filter(
      (i) => team(i) === team(s.players.indexOf(p)),
    ),
    firstRival = eligible(s).find(
      (i) => team(i) !== team(s.players.indexOf(p)),
    );
  const relative = (i: number) => (i - s.mano + 4) % 4;
  const isPostre =
    firstRival !== undefined &&
    seats.every(
      (i) =>
        relative(i) >
        Math.min(
          ...eligible(s)
            .filter((j) => team(j) !== team(i))
            .map(relative),
        ),
    );
  if (!isPostre) return false;
  if (s.lance === "pares")
    return seats.every((i) => {
      const v = calculatePairs(s.hands[s.players[i]]).vector;
      return v[0] === 1 && v[1] === 1;
    });
  if (s.lance === "juego")
    return seats.every(
      (i) => calculateJuego(s.hands[s.players[i]]).total === 33,
    );
  return false;
}
export function getAvailableActions(
  s: MusState,
  p: PlayerId,
): {
  type: string;
  label: string;
  min?: number;
  max?: number;
  has?: boolean;
  wantsMus?: boolean;
}[] {
  if (s.finished || !s.players.includes(p)) return [];
  const out: {
    type: string;
    label: string;
    min?: number;
    max?: number;
    has?: boolean;
    wantsMus?: boolean;
  }[] = [];
  if (
    ["dealing", "redeal", "cards-dealt", "showing", "counting"].includes(
      s.phase,
    )
  ) {
    if (p === s.players[0])
      out.push({ type: "advance", label: "Continuar transición" });
    if (canCutMus(s, p))
      out.push({ type: "mus", wantsMus: false, label: "CORTAR MUS" });
    return out;
  }
  if (s.phase === "showdown")
    return p === s.players[s.mano]
      ? [{ type: "next-hand", label: "SIGUIENTE MANO" }]
      : [];
  if (s.phase === "mus") {
    if (p === s.players[s.musTurn])
      out.push({ type: "mus", wantsMus: true, label: "MUS" });
    if (canCutMus(s, p))
      out.push({ type: "mus", wantsMus: false, label: "CORTAR MUS" });
    return out;
  }
  if (s.phase === "discard")
    return s.pendingDiscard[p] === null
      ? [{ type: "discard", label: "CONFIRMAR DESCARTE", min: 1, max: 4 }]
      : [];
  if (s.phase === "pares-declaration" || s.phase === "juego-declaration")
    return p === s.players[s.declarationTurn]
      ? [
          {
            type:
              s.phase === "pares-declaration"
                ? "declare-pairs"
                : "declare-juego",
            has:
              s.phase === "pares-declaration"
                ? calculatePairs(s.hands[p]).hasPairs
                : calculateJuego(s.hands[p]).hasJuego,
            label:
              s.phase === "pares-declaration"
                ? calculatePairs(s.hands[p]).hasPairs
                  ? "TIENE PARES"
                  : "NO TIENE"
                : calculateJuego(s.hands[p]).hasJuego
                  ? "JUEGO"
                  : "NO JUEGO",
          },
        ]
      : [];
  const b = s.betting;
  if (!b || s.players[b.turnSeat] !== p) return [];
  if (b.pendingBet) {
    if (!b.pendingBet.ordago || !forbiddenOrdago(s, p))
      out.push({
        type: "accept",
        label: b.pendingBet.ordago ? "QUIERO EL ÓRDAGO" : "QUIERO",
      });
    out.push({ type: "reject", label: "NO QUIERO" });
    if (b.pendingBet.ordago) return out;
  } else out.push({ type: "pass", label: "PASO" });
  out.push(
    {
      type: "bet",
      label: b.pendingBet ? "REENVÍO" : "ENVIDO",
      min: b.pendingBet ? b.pendingBet.amount + 1 : 2,
      max: 1000000,
    },
    { type: "ordago", label: "ÓRDAGO" },
  );
  return out;
}
export function validateMusState(s: MusState) {
  if (s.players.length !== 4 || new Set(s.players).size !== 4)
    throw new Error("El Mus necesita cuatro jugadores distintos.");
  if (s.targetScore !== 30 && s.targetScore !== 40)
    throw new Error("Elige 30 o 40 tantos.");
  if (s.stage !== STAGES[s.phase])
    throw new Error("La fase de la mesa no es válida.");
  const cards = [...Object.values(s.hands).flat(), ...s.stock, ...s.discarded];
  if (
    s.players.some((p) => s.hands[p]?.length !== 4) ||
    cards.length !== 40 ||
    new Set(cards.map(cardKey)).size !== 40
  )
    throw new Error(
      "El reparto debe conservar las 40 cartas y cuatro por jugador.",
    );
  if (s.ledger.length) {
    for (const t of ["A", "B"] as Team[]) {
      const entries = s.ledger.filter((e) => e.team === t);
      if (entries.length && entries[entries.length - 1].after !== s.scores[t])
        throw new Error("El marcador no coincide con el libro de tanteo.");
    }
  }
  if (s.finished && (!s.winnerTeam || s.scores[s.winnerTeam] < s.targetScore))
    throw new Error("La pareja ganadora aún no ha alcanzado el objetivo.");
}
function invalidAction(s: MusState, p: PlayerId, a: MusAction): never {
  if (s.betting?.pendingBet && a.type === "pass")
    throw new Error(
      `No puedes pasar. ${s.betting.pendingBet.player} tiene un envite pendiente: responde quiero, no quiero o reenvía.`,
    );
  if (
    a.type === "accept" &&
    s.betting?.pendingBet?.ordago &&
    forbiddenOrdago(s, p)
  )
    throw new Error(
      "No puedes aceptar este órdago con la jugada mínima de postre. Consulta la regla de órdagos en Información.",
    );
  if (a.type === "mus" && !a.wantsMus)
    throw new Error(
      `No puedes cortar el mus todavía. Falta ${s.players[s.musTurn]} por decidir.`,
    );
  throw new Error(
    `Ahora habla ${s.players[s.betting?.turnSeat ?? s.declarationTurn ?? s.musTurn]}. Espera tu turno en ${s.stage.replace(/_/g, " ")}.`,
  );
}
function applyModern(state: MusState, p: PlayerId, a: MusAction): MusState {
  if (!state.players.includes(p))
    throw new Error("No tienes una plaza en esta mesa.");
  if (state.finished) throw new Error("La partida ya ha terminado.");
  if (
    a.expectedRevision !== undefined &&
    a.expectedRevision !== state.revision &&
    !(
      a.type === "discard" &&
      state.phase === "discard" &&
      a.expectedDiscardRound === `${state.handNumber}:${state.discardNumber}`
    )
  )
    throw new Error(
      "La mesa ya ha avanzado. Comprueba el turno y vuelve a elegir tu acción.",
    );
  const available = getAvailableActions(state, p),
    option = available.find(
      (o) =>
        o.type === a.type &&
        (o.wantsMus === undefined || o.wantsMus === a.wantsMus),
    );
  if (!option) invalidAction(state, p, a);
  const s = clone(state);
  s.revision++;
  s.eventTime = Number.isSafeInteger(a.at) ? a.at! : null;
  if (a.type === "advance") {
    if (s.phase === "dealing") transition(s, "cards-dealt");
    else if (s.phase === "cards-dealt") {
      transition(s, "mus");
      event(s, "mus-round", "¿QUIERES MUS?");
    } else if (s.phase === "redeal") refill(s);
    else if (s.phase === "showing") {
      transition(s, "counting");
      s.countIndex = 0;
    } else if (s.phase === "counting") countLance(s);
  } else if (a.type === "next-hand") {
    s.mano = (s.mano + 1) % 4;
    s.handNumber++;
    prepareDeal(s);
  } else if (a.type === "mus") {
    s.musDecisions[p] = a.wantsMus ? "mus" : "corta";
    event(
      s,
      a.wantsMus ? "mus" : "cut",
      `${p} ${a.wantsMus ? "da MUS" : "HA CORTADO EL MUS"}.`,
      { player: p },
    );
    if (!a.wantsMus) {
      if (s.handNumber === 1) s.mano = s.players.indexOf(p);
      startLance(s, "grande");
    } else {
      s.musVotes++;
      s.musTurn = (s.musTurn + 1) % 4;
      if (s.musVotes === 4) {
        s.pendingDiscard = map(s, () => null);
        s.discardCounts = map(s, () => null);
        transition(s, "discard");
        event(
          s,
          "discard",
          "Todos dan MUS. Selecciona y confirma tu descarte.",
        );
      }
    }
  } else if (a.type === "discard") {
    const cards = a.cards;
    if (
      !Array.isArray(cards) ||
      cards.length < 1 ||
      cards.length > 4 ||
      cards.some(
        (c) => !c || !s.hands[p].some((h) => cardKey(h) === cardKey(c)),
      ) ||
      new Set(cards.map(cardKey)).size !== cards.length
    )
      throw new Error(
        "Selecciona de una a cuatro cartas de tu mano. Cero cartas no es válido en mus normal.",
      );
    s.pendingDiscard[p] = cards.map((c) =>
      s.hands[p].find((h) => cardKey(h) === cardKey(c))!,
    );
    s.discardCounts[p] = cards.length;
    event(
      s,
      "discard-confirm",
      `${p}: ${cards.length} cartas; descarte confirmado.`,
      { player: p, amount: cards.length },
    );
    if (s.players.every((id) => s.pendingDiscard[id] !== null)) {
      transition(s, "redeal");
      event(s, "redeal", "Repartiendo las cartas solicitadas.");
    }
  } else if (a.type === "declare-pairs" || a.type === "declare-juego") {
    if (typeof a.has !== "boolean" || a.has !== option!.has)
      throw new Error(
        "La declaración debe coincidir con tus cartas. La aplicación comprueba tu jugada.",
      );
    const kind = a.type === "declare-pairs" ? "pares" : "juego";
    s.declarations[kind][p] = a.has;
    event(
      s,
      "declared",
      `${p}: ${kind === "pares" ? (a.has ? "TIENE PARES" : "NO TIENE") : a.has ? "JUEGO" : "NO JUEGO"}.`,
      { player: p },
    );
    s.declarationTurn = (s.declarationTurn + 1) % 4;
    if (s.players.every((id) => s.declarations[kind][id] !== null)) {
      if (
        kind === "juego" &&
        !s.players.some((id) => s.declarations.juego[id])
      ) {
        event(s, "no-juego", "NADIE TIENE JUEGO. Jugamos PUNTO.");
        openBetting(s, "punto");
      } else openBetting(s, kind);
    }
  } else {
    const b = s.betting!,
      lance = s.lance!;
    if (a.type === "pass") {
      b.status = "PASS";
      b.consecutivePasses++;
      event(s, "pass", `${p} PASA en ${lance}.`, { player: p });
      if (b.consecutivePasses >= eligible(s).length) closeLance(s, "paso");
      else b.turnSeat = nextSeat(s, b.turnSeat);
    } else if (a.type === "bet" || a.type === "ordago") {
      const amount = a.type === "ordago" ? s.targetScore * 2 : a.amount!;
      if (
        a.type === "bet" &&
        (!Number.isSafeInteger(amount) ||
          amount < option!.min! ||
          amount > option!.max!)
      )
        throw new Error(
          `El envite debe ser un número entero de ${option!.min} a ${option!.max} tantos.`,
        );
      const pending = b.pendingBet,
        actorTeam = team(s.players.indexOf(p));
      b.status = a.type === "ordago" ? "ORDAGO" : pending ? "RAISE" : "BET";
      b.previousAmount = pending?.amount || 1;
      b.history.push({ player: p, type: b.status, amount });
      b.pendingBet = {
        team: actorTeam,
        player: p,
        amount,
        ordago: a.type === "ordago",
      };
      b.consecutivePasses = 0;
      b.turnSeat = nextSeat(s, b.turnSeat, other(actorTeam));
      event(
        s,
        b.status,
        `${p} ${a.type === "ordago" ? "HA DICHO ÓRDAGO" : pending ? `REENVÍA A ${amount}` : `ENVIDA ${amount} TANTOS`}.`,
        { player: p, amount },
      );
    } else if (a.type === "reject") {
      const pending = b.pendingBet!;
      b.status = "REJECT";
      event(
        s,
        "reject",
        `${p} NO QUIERE ${pending.ordago ? "EL ÓRDAGO" : pending.amount}.`,
        { player: p },
      );
      score(
        s,
        lance,
        pending.team,
        applyNegada(b.previousAmount),
        b.previousAmount === 1 ? "negada" : "reenvite rechazado",
      );
      if (!s.finished) closeLance(s, "rejected", 0, pending.team);
    } else if (a.type === "accept") {
      const pending = b.pendingBet!;
      b.status = "ACCEPT";
      event(
        s,
        "accept",
        `${p} QUIERE ${pending.ordago ? "EL ÓRDAGO" : pending.amount}.`,
        { player: p, amount: pending.amount },
      );
      if (pending.ordago) {
        const w = winner(s, lance);
        s.phaseResults = {};
        event(s, "reveal", "ENSEÑANDO CARTAS por órdago aceptado.");
        s.lastResult = { lance, kind: "órdago", ...w };
        score(
          s,
          lance,
          w.winnerTeam,
          Math.max(0, s.targetScore - s.scores[w.winnerTeam]),
          "órdago",
          w.winnerPlayer,
        );
      } else closeLance(s, "accepted", pending.amount);
    }
  }
  validateMusState(s);
  return s;
}
export function publicMusView(s: MusState, p: PlayerId) {
  const visible = ["showing", "counting", "showdown", "finished"].includes(
      s.phase,
    ),
    hiddenDeal = ["dealing", "redeal"].includes(s.phase);
  const actions = getAvailableActions(s, p),
    turn =
      s.phase === "mus"
        ? s.players[s.musTurn]
        : s.phase.endsWith("-declaration")
          ? s.players[s.declarationTurn]
          : s.phase === "showdown"
            ? s.players[s.mano]
            : s.betting
              ? s.players[s.betting.turnSeat]
              : null;
  return clone({
    version: 2,
    ruleset: s.ruleset,
    players: s.players,
    myHand: hiddenDeal ? [] : s.hands[p] || [],
    handSizes: map(s, () => 4),
    stockCount: s.stock.length,
    mano: s.players[s.mano],
    postre: s.players[(s.mano + 3) % 4],
    dealer: s.players[s.dealer],
    handNumber: s.handNumber,
    targetScore: s.targetScore,
    targetGames: 1,
    gamesWon: {
      A: s.finished && s.winnerTeam === "A" ? 1 : 0,
      B: s.finished && s.winnerTeam === "B" ? 1 : 0,
    },
    gameWinner: s.winnerTeam,
    scores: s.scores,
    scoreState: calculateScore(s.scores, s.ledger, s.targetScore),
    phase: s.phase,
    stage: s.stage,
    revision: s.revision,
    discardRound: `${s.handNumber}:${s.discardNumber}`,
    lance: s.lance,
    betting: s.betting,
    turnPlayer: turn,
    awaitingDiscardFrom:
      s.phase === "discard"
        ? s.players.filter((id) => s.pendingDiscard[id] === null)
        : [],
    discardCounts: s.discardCounts,
    musDecisions: s.musDecisions,
    declarations: s.declarations,
    isPunto: s.lance === "punto",
    availableActions: actions,
    ...(visible
      ? {
          revealedHands: s.hands,
          revealedAnalysis: map(s, (id) => ({
            pares: calculatePairs(s.hands[id]),
            juego: calculateJuego(s.hands[id]),
          })),
          results: s.phaseResults,
        }
      : {}),
    ledger: s.ledger,
    lastResult: s.lastResult,
    events: s.events.slice(-100),
    log: s.log.slice(-30),
    finished: s.finished,
    winnerTeam: s.winnerTeam,
    timers: s.timers,
    ...(hiddenDeal || !s.hands[p]
      ? {}
      : {
          myAnalysis: {
            grande: calculateGrande(s.hands[p]),
            chica: calculateChica(s.hands[p]),
            pares: calculatePairs(s.hands[p]),
            juego: calculateJuego(s.hands[p]),
            punto: calculatePunto(s.hands[p]),
            signals: calculateSignals(s.hands[p], s.stage, s.handNumber === 1),
          },
        }),
  });
}
export function createMusState(
  players: PlayerId[],
  seed: number,
  _ruleset = "eight-kings",
  targetScore = 40,
): MusState {
  if (_ruleset !== "eight-kings")
    throw new Error("Las nuevas partidas usan ocho reyes y ocho ases.");
  if (players.length !== 4 || new Set(players).size !== 4)
    throw new Error("El Mus necesita exactamente cuatro jugadores distintos.");
  const s: MusState = {
    version: 2,
    ruleset: "eight-kings",
    players: [...players],
    hands: {},
    stock: [],
    discarded: [],
    seed,
    mano: 0,
    dealer: 3,
    handNumber: 1,
    targetScore,
    scores: { A: 0, B: 0 },
    phase: "dealing",
    stage: "DEALING",
    revision: 0,
    musTurn: 0,
    musVotes: 0,
    musDecisions: {},
    discardNumber: 0,
    pendingDiscard: {},
    discardCounts: {},
    declarations: { pares: {}, juego: {} },
    declarationTurn: 0,
    betting: null,
    lance: null,
    phaseOrder: ["grande", "chica", "pares", "juego"],
    phaseIndex: 0,
    phaseResults: {},
    countIndex: 0,
    ledger: [],
    events: [],
    log: [],
    lastResult: null,
    finished: false,
    winnerTeam: null,
    eventTime: null,
    timers: {
      enabled: false,
      musMs: 60000,
      betMs: 30000,
      ordagoMs: 120000,
      discardMs: null,
      deadline: null,
    },
  };
  prepareDeal(s);
  validateMusState(s);
  return s;
}
export const musEngine: GameEngine<any, any, MusAction> = {
  id: "mus",
  label: "Mus",
  minPlayers: 4,
  maxPlayers: 4,
  createInitialState: createMusState,
  applyAction: (s, p, a) =>
    s.version === 2
      ? applyModern(s, p, a)
      : legacyMusEngine.applyAction(s, p, a as any),
  view: (s, p) =>
    s.version === 2 ? publicMusView(s, p) : legacyMusEngine.view(s, p),
  isOver: (s) => s.finished,
};
