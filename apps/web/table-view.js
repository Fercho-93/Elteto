// Presentation only: consumes a private engine view, never the host's hidden state.
import { FRENCH_RANKS, SPANISH_RANKS, SPANISH_SUITS, canPlaceCinquillo } from "./game-core/index.js";
export const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );
const esc = escapeHtml;
const symbols = {
  picas: "♠",
  corazones: "♥",
  diamantes: "♦",
  treboles: "♣",
};
const suitNames = {
  picas: "Picas",
  corazones: "Corazones",
  diamantes: "Diamantes",
  treboles: "Tréboles",
  oros: "Oros", copas: "Copas", espadas: "Espadas", bastos: "Bastos",
};
export const cardKey = (card) => `${card.suit}:${card.rank}`;
export const canPlayCinquillo = (table, card, ruleset = "spanish-40") => canPlaceCinquillo(table, card, ruleset);
function suitArt(suit) {
  if (symbols[suit]) return `<span class="suit-symbol">${symbols[suit]}</span>`;
  const art = {
    oros: '<circle cx="30" cy="30" r="21" fill="#e8b342"/><circle cx="30" cy="30" r="15" fill="none" stroke="#9c641b" stroke-width="3"/><path d="m30 19 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1z" fill="#fff1b5"/>',
    copas:
      '<path d="M15 12h30l-4 21-11 7-11-7z" fill="#c84553"/><path d="M30 38v12m-12 0h24" stroke="#a77a2c" stroke-width="5"/><path d="M19 15h22" stroke="#ffdaa0" stroke-width="3"/>',
    espadas:
      '<path d="m30 4 7 12-4 26h-6l-4-26z" fill="#b6cad6"/><path d="M18 41h24M30 43v12" stroke="#aa7b24" stroke-width="5"/>',
    bastos:
      '<path d="m25 52-5-9 11-34 10-4 3 10-10 35z" fill="#557143"/><path d="m26 42 8-26m-7 15 9-2" stroke="#b3c175" stroke-width="3"/>',
  };
  return `<svg class="suit-art" viewBox="0 0 60 60" aria-hidden="true">${art[suit] || ""}</svg>`;
}
export function cardFace(card) {
  const symbol = suitArt(card.suit),
    red = ["corazones", "diamantes"].includes(card.suit);
  const spanish = !symbols[card.suit];
  const figure = spanish
    ? { 10: "Sota", 11: "Caballo", 12: "Rey" }[card.rank]
    : { J: "Jota", Q: "Reina", K: "Rey" }[card.rank];
  const count = figure
    ? 1
    : card.rank === "A"
      ? 1
      : Math.min(10, Number(card.rank));
  const center = figure
    ? `<div class="court-art"><span>${card.rank === "11" ? "♞" : "♛"}</span>${symbol}<small>${figure}</small></div>`
    : `<div class="card-pips pips-${count}">${Array.from({ length: count }, () => symbol).join("")}</div>`;
  return `<span class="card-face ${red ? "card-red" : ""}"><span class="card-corner">${esc(card.rank)}${symbol}</span>${center}<span class="card-corner corner-bottom">${esc(card.rank)}${symbol}</span></span>`;
}
export function renderHandCard(card, options = {}) {
  return `<button class="playing-card ${options.selected ? "selected" : ""} ${options.playable ? "legal-card" : ""}" data-action="play-card" data-card-key="${esc(cardKey(card))}" ${options.disabled ? "disabled" : ""} ${options.selectable ? `aria-pressed="${Boolean(options.selected)}"` : ""} aria-label="${esc(card.rank + " de " + card.suit)}${options.playable ? ", puedes jugarla" : ""}">${cardFace(card)}<span class="hand-index ${["corazones", "diamantes"].includes(card.suit) ? "card-red" : ""}" aria-hidden="true"><b>${esc(card.rank)}</b>${suitArt(card.suit)}</span></button>`;
}
function avatar(seat) {
  const character = seat % 6;
  return `<div class="player-character" aria-hidden="true"><div class="character-sprite" data-character="${character}" style="--character-x:${(character % 3) * 50}%;--character-y:${Math.floor(character / 3) * 100}%;--motion-delay:${seat * -1.3}s"></div></div>`;
}
export function renderSeats(view, playerId, name, gameId) {
  const ownIndex = view.players.indexOf(playerId),
    n = view.players.length;
  return view.players
    .map((id, index) => {
      const relative = (index - ownIndex + n) % n,
        own = id === playerId;
      const angle =
        n === 2 ? Math.PI / 2 : (Math.PI * (relative - 1)) / (n - 2);
      const x = own ? 50 : n === 2 ? 50 : n === 6 ? [50,14,32,50,68,86][relative] : 14 + (72 * (1 - Math.cos(angle))) / 2;
      const y = own ? 91 : n === 2 ? 21 : n === 6 ? [91,40,24,14,24,40][relative] : 32 - 11 * Math.sin(angle);
      const active =
        !view.finished &&
        (view.turnPlayer === id ||
          (view.phase === "discard" && view.awaitingDiscardFrom.includes(id)));
      const team = index % 2 === 0 ? "A" : "B";
      const count = view.handSizes[id] || 0;
      return `<article class="table-seat ${own ? "own-seat" : ""} ${active ? "active-seat" : ""}" data-player-id="${esc(id)}" style="--seat-x:${x}%;--seat-y:${y}%" aria-label="${esc(name(id))}, ${count} cartas${active ? ", turno activo" : ""}">${avatar(index)}<div class="seat-label"><strong>${esc(own ? "Tú" : name(id))}</strong><small>${gameId === "mus" ? `Pareja ${team} · ` : ""}${count} cartas</small></div>${view.mano === id ? '<span class="mano-badge">Mano</span>' : ""}${!own ? `<div class="rival-hand" aria-label="${count} cartas boca abajo">${Array.from({ length: count }, (_, i) => `<i class="card-back" style="--fan-angle:${(i - (count - 1) / 2) * Math.min(10, 65 / Math.max(1, count))}deg"><span>✦</span></i>`).join("")}</div>` : ""}</article>`;
    })
    .join("");
}
export function renderCinquilloBoard(view) {
  const legacy = view.ruleset === "legacy-french-52";
  const ranks = legacy ? FRENCH_RANKS : SPANISH_RANKS;
  const suits = legacy ? Object.keys(symbols) : SPANISH_SUITS;
  return `<div class="cinquillo-board">${suits
    .map((suit) => {
      const entry = view.table[suit];
      return `<div class="suit-lane"><b class="${["corazones", "diamantes"].includes(suit) ? "card-red" : ""}" aria-label="${suitNames[suit]}">${suitArt(suit)}</b><div class="lane-cards">${ranks.map(
        (rank, index) => {
          const placed = entry && index >= entry.low && index <= entry.high;
          return `<span class="board-card ${placed ? "placed" : "empty-slot"} ${rank === "5" ? "five-slot" : ""}" ${placed ? `data-table-key="${suit}:${rank}"` : ""} aria-label="${rank} de ${suit}${placed ? ", colocada" : ", pendiente"}">${placed ? cardFace({ suit, rank }) : `<span>${rank}</span>`}</span>`;
        },
      ).join("")}</div></div>`;
    })
    .join("")}</div>`;
}
export const phaseLabels = {
  mus: "¿Hay mus?",
  discard: "Descarte",
  grande: "Grande",
  chica: "Chica",
  pares: "Pares",
  juego: "Juego",
  showdown: "Recuento",
  finished: "Fin de partida",
};
export function renderMusBoard(view) {
  const pending = view.betting?.pendingBet;
  return `<div class="mus-board"><div class="score-strip"><span>Pareja A <b>${view.scores.A}</b></span><span>Pareja B <b>${view.scores.B}</b></span></div><div class="mus-phase"><small>MANO ${view.handNumber || 1} · A ${view.targetScore} TANTOS</small><strong>${esc(view.phase === "juego" && view.isPunto ? "Punto" : phaseLabels[view.phase])}</strong><span>${pending ? (pending.ordago ? "¡Órdago sobre la mesa!" : `Envite: ${pending.amount} tantos`) : view.phase === "discard" ? "Cambia tus cartas" : view.phase === "mus" ? "Mus o corta el descarte" : view.revealedHands ? "Cartas a la vista" : "Las cartas siguen ocultas"}</span></div><div class="table-stock"><i class="card-back"><span>✦</span></i><i class="card-back"><span>✦</span></i></div>${view.revealedHands ? `<div class="revealed-hands">${view.players.map((id, i) => `<div><small>Asiento ${i + 1} · Pareja ${i % 2 ? "B" : "A"}</small><div>${view.revealedHands[id].map((card) => `<span class="reveal-card">${cardFace(card)}</span>`).join("")}</div></div>`).join("")}</div>` : ""}</div>`;
}
export function sortedHand(hand) {
  const suits = [
    "picas",
    "corazones",
    "diamantes",
    "treboles",
    "oros",
    "copas",
    "espadas",
    "bastos",
  ];
  return [...hand].sort(
    (a, b) =>
      suits.indexOf(a.suit) - suits.indexOf(b.suit) ||
      (symbols[a.suit] ? FRENCH_RANKS : SPANISH_RANKS).indexOf(a.rank) -
        (symbols[b.suit] ? FRENCH_RANKS : SPANISH_RANKS).indexOf(b.rank),
  );
}
// Animate only newly public cards. Rerendering a selection must not replay the deal.
export function animateTable(app, previousKeys, origins, sourceSeat) {
  const keys = new Set();
  for (const card of app.querySelectorAll("[data-table-key]")) {
    const key = card.dataset.tableKey;
    keys.add(key);
    if (
      !previousKeys ||
      previousKeys.has(key) ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      continue;
    const destination = card.getBoundingClientRect(),
      origin = origins.get(key) || sourceSeat;
    if (!origin || !card.animate) continue;
    card.animate(
      [
        {
          transform: `translate(${origin.x + origin.width / 2 - destination.x - destination.width / 2}px,${origin.y + origin.height / 2 - destination.y - destination.height / 2}px) rotate(-12deg) scale(1.3)`,
          opacity: 0.7,
        },
        { transform: "translate(0,0) rotate(3deg) scale(1.05)", offset: 0.8 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)" },
    );
  }
  return keys;
}
