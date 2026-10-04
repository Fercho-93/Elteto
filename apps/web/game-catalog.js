// Presentation metadata only. Playable games still come from the shared engine.
export const GAME_CATALOG = [
  { id: "cinquillo", label: "Cinquillo", category: "cards", mascot: "aubergine", icon: "cards", players: "2–6 jugadores", accent: "cyan" },
  { id: "parchis", label: "Parchís", category: "boards", mascot: "avocado", icon: "dice", players: "2–4 jugadores", accent: "citrus" },
  { id: "oca", label: "La oca", category: "boards", mascot: "peach", icon: "goose", players: "2–6 jugadores", accent: "pink" },
  { id: "domino", label: "Dominó", category: "boards", mascot: "poop", icon: "domino", players: "2–4 jugadores", accent: "orange" },
  { id: "mus", label: "Mus", category: "cards", mascot: "banana", icon: "cards", players: "4 jugadores", accent: "citrus" },
  { id: "dados", label: "Dados", category: "boards", mascot: "water", icon: "dice", players: "2–6 jugadores", accent: "cyan" },
];

export function icon(name) {
  const shapes = {
    cards: '<rect x="4" y="5" width="12" height="17" rx="2" transform="rotate(-18 10 13)"/><rect x="11" y="2" width="12" height="18" rx="2" transform="rotate(12 17 11)"/>',
    dice: '<rect x="3" y="3" width="22" height="22" rx="5"/><g fill="currentColor" stroke="none"><circle cx="9" cy="9" r="1.5"/><circle cx="19" cy="9" r="1.5"/><circle cx="14" cy="14" r="1.5"/><circle cx="9" cy="19" r="1.5"/><circle cx="19" cy="19" r="1.5"/></g>',
    domino: '<rect x="6" y="2" width="16" height="24" rx="3"/><path d="M6 14h16"/><g fill="currentColor" stroke="none"><circle cx="11" cy="7" r="1.5"/><circle cx="17" cy="10" r="1.5"/><circle cx="11" cy="19" r="1.5"/><circle cx="17" cy="22" r="1.5"/></g>',
    goose: '<path d="M7 20c-5-6 1-9 7-8V7c0-5 7-5 7-1v3l4 2-5 1v5c0 5-7 7-13 3Zm3 2v4m7-4v4"/>',
    home: '<path d="m3 13 11-10 11 10M6 11v14h6v-8h5v8h5V11"/>',
    join: '<circle cx="10" cy="8" r="4"/><path d="M2 25v-4c0-8 16-8 16 0v4m1-13h8m-4-4 4 4-4 4"/>',
    plus: '<path d="M14 5v18M5 14h18"/>',
    arrow: '<path d="m11 6 8 8-8 8"/>',
  };
  return `<svg viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.cards}</svg>`;
}

// The supplied photograph is used unchanged; CSS frames each original character.
export function mascot(name, className = "") {
  return `<span class="mascot mascot-${name} ${className}" aria-hidden="true"><img src="./assets/elteto-characters.jpg" alt="" draggable="false"></span>`;
}
