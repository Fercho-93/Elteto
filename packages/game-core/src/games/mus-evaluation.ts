import { Card } from "../deck";
export const FEM_GAME_ORDER = [31, 32, 40, 37, 36, 35, 34, 33];
export const musValue = (c: Card) =>
  c.rank === "2" ? 1 : c.rank === "3" ? 10 : Math.min(Number(c.rank), 10);
export const effectiveRank = (c: Card) =>
  c.rank === "2" ? 1 : c.rank === "3" ? 12 : Number(c.rank);
export const calculateGrande = (hand: Card[]) =>
  hand.map(effectiveRank).sort((a, b) => b - a);
export const calculateChica = (hand: Card[]) =>
  hand
    .map(effectiveRank)
    .sort((a, b) => a - b)
    .map((n) => -n);
export function calculatePairs(hand: Card[]) {
  const counts = new Map<number, number>();
  hand.forEach((c) =>
    counts.set(effectiveRank(c), (counts.get(effectiveRank(c)) || 0) + 1),
  );
  const groups = [...counts].sort((a, b) => b[0] - a[0]),
    four = groups.find((g) => g[1] === 4),
    three = groups.find((g) => g[1] === 3),
    two = groups.filter((g) => g[1] === 2).map((g) => g[0]);
  const vector = four
    ? [3, four[0], four[0]]
    : two.length === 2
      ? [3, ...two]
      : three
        ? [2, three[0]]
        : two.length
          ? [1, two[0]]
          : [0];
  return {
    hasPairs: vector[0] > 0,
    kind: ["sin pares", "pares", "medias", "duples"][vector[0]],
    points: vector[0],
    vector,
  };
}
export const calculatePunto = (hand: Card[]) =>
  hand.reduce((n, c) => n + musValue(c), 0);
export function calculateJuego(hand: Card[]) {
  const total = calculatePunto(hand);
  return {
    total,
    hasJuego: total >= 31,
    order: FEM_GAME_ORDER.indexOf(total),
    points: total === 31 ? 3 : total >= 31 ? 2 : 0,
  };
}
export function compareVectors(a: number[], b: number[]) {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1);
    if (d) return Math.sign(d);
  }
  return 0;
}
export const compareGrande = (a: Card[], b: Card[]) =>
  compareVectors(calculateGrande(a), calculateGrande(b));
export const compareChica = (a: Card[], b: Card[]) =>
  compareVectors(calculateChica(a), calculateChica(b));
export const comparePairs = (a: Card[], b: Card[]) =>
  compareVectors(calculatePairs(a).vector, calculatePairs(b).vector);
export const compareJuego = (a: Card[], b: Card[]) => {
  const x = calculateJuego(a),
    y = calculateJuego(b);
  return x.hasJuego !== y.hasJuego
    ? x.hasJuego
      ? 1
      : -1
    : x.hasJuego
      ? Math.sign(y.order - x.order)
      : comparePunto(a, b);
};
export const comparePunto = (a: Card[], b: Card[]) =>
  Math.sign(calculatePunto(a) - calculatePunto(b));
export function calculateSignals(
  hand: Card[],
  stage: string,
  firstHand: boolean,
) {
  const p = calculatePairs(hand),
    g = calculateJuego(hand),
    r = calculateGrande(hand),
    signals: { id: string; gesture: string; allowed: boolean }[] = [];
  const afterGrande = ![
      "DEALING",
      "CARDS_DEALT",
      "MUS_DECISION",
      "MUS_DISCARD",
      "MUS_REDEAL",
      "GRANDE",
    ].includes(stage),
    cut =
      !stage.startsWith("MUS") && !["DEALING", "CARDS_DEALT"].includes(stage);
  const add = (id: string, gesture: string, allowed = true) =>
    signals.push({ id, gesture, allowed: allowed && (!firstHand || cut) });
  if (p.kind === "duples") add("duples", "Levantar las cejas");
  else if (p.kind === "medias")
    add(
      r.includes(12) && p.vector[1] === 12
        ? "medias de reyes"
        : p.vector[1] === 1
          ? "medias de ases"
          : "medias",
      p.vector[1] === 1
        ? "Sacar la lengua hacia un lado"
        : "Mover los labios cerrados hacia un lado",
      p.vector[1] === 12 || afterGrande,
    );
  else if (p.kind === "pares" && p.vector[1] === 12)
    add("dos reyes", "Morderse el labio inferior");
  else if (p.kind === "pares" && p.vector[1] === 1)
    add("dos ases", "Sacar la lengua de frente");
  if (g.total === 31) add("treinta y una", "Guiñar un ojo");
  else if (g.hasJuego) add("juego", "Sacar los labios cerrados hacia fuera");
  else if (g.total === 30) add("treinta", "Levantar los dos hombros");
  else if (g.total === 29) add("veintinueve", "Levantar un hombro");
  if (!signals.length) add("ciego", "Cerrar los dos ojos");
  return signals;
}
