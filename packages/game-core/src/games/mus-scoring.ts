export type MusTeam = "A" | "B";
export type MusLance = "grande" | "chica" | "pares" | "juego" | "punto";
export type ScoreCause =
  | "paso"
  | "envite"
  | "negada"
  | "reenvite rechazado"
  | "pares propios"
  | "juego propio"
  | "punto"
  | "órdago";
export type ScoreEntry = {
  sequence: number;
  hand: number;
  lance: MusLance;
  team: MusTeam;
  cause: ScoreCause;
  points: number;
  before: number;
  after: number;
  player?: string;
  amarracosBefore: number;
  amarracosAfter: number;
};
export const applyAmarraco = (total: number, target: number) => ({
  total,
  amarracos: Math.floor(total / 5),
  piedras: total % 5,
  remaining: Math.max(0, target - total),
  inside: total < target && target - total <= 4,
});
export const applyNegada = (previousAmount: number) => previousAmount || 1;
export const applyEnvite = (amount: number) => amount;
export function calculateScore(
  scores: Record<MusTeam, number>,
  entries: ScoreEntry[],
  target: number,
) {
  return {
    A: {
      ...applyAmarraco(scores.A, target),
      breakdown: entries.filter((e) => e.team === "A"),
    },
    B: {
      ...applyAmarraco(scores.B, target),
      breakdown: entries.filter((e) => e.team === "B"),
    },
  };
}
