export type Card = { suit: string; rank: string };

// Baraja española (40 cartas, sin 8 ni 9) - usada en el Mus.
export const SPANISH_SUITS = ["oros", "copas", "espadas", "bastos"] as const;
export const SPANISH_RANKS = ["1", "2", "3", "4", "5", "6", "7", "10", "11", "12"] as const;

// Baraja francesa (52 cartas) - usada en el Cinquillo.
export const FRENCH_SUITS = ["picas", "corazones", "diamantes", "treboles"] as const;
export const FRENCH_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"] as const;

export function buildSpanishDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SPANISH_SUITS) {
    for (const rank of SPANISH_RANKS) deck.push({ suit, rank });
  }
  return deck;
}

export function buildFrenchDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of FRENCH_SUITS) {
    for (const rank of FRENCH_RANKS) deck.push({ suit, rank });
  }
  return deck;
}

/** PRNG determinista (mulberry32) para que host y clientes puedan reproducir el mismo reparto a partir de una seed. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
