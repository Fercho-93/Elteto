// Presentation only: consumes a private engine view, never the host's hidden state.
import { FRENCH_RANKS, SPANISH_RANKS, SPANISH_SUITS, canPlaceCinquillo } from "./game-core/index.js";
import { cardAsset } from "./card-art.js";
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
  return `<span class="card-face"><span class="card-illustration"><img src="${cardAsset(card)}" alt="" draggable="false"></span></span>`;
}
export function renderHandCard(card, options = {}) {
  return `<button class="playing-card ${options.selected ? "selected" : ""} ${options.playable ? "legal-card" : ""}" style="--card-tilt:${Number(options.tilt) || 0}deg" data-action="play-card" data-card-key="${esc(cardKey(card))}" ${options.disabled ? "disabled" : ""} ${options.selectable ? `aria-pressed="${Boolean(options.selected)}"` : ""} aria-label="${esc(card.rank + " de " + card.suit)}${options.playable ? ", puedes jugarla" : ""}">${cardFace(card)}<span class="hand-index ${["corazones", "diamantes"].includes(card.suit) ? "card-red" : ""}" aria-hidden="true"><b>${esc(card.rank)}</b>${suitArt(card.suit)}</span></button>`;
}
export const MASCOTS = ["Berenjena", "Melocotón", "Plátano", "Bandera", "Aguacate", "Cerdito", "Seta", "Gota", "Caca", "Castañas"];
// Per-illustration contours keep chair upholstery and torso out of the arm layer.
const ARM_CONTOURS = [
 ['19% 58%,30% 58%,37% 65%,46% 68%,55% 73%,54% 78%,48% 80%,40% 78%,35% 74%,24% 72%,17% 67%', '76% 58%,87% 58%,92% 67%,86% 72%,71% 75%,66% 79%,60% 79%,59% 74%,63% 70%,74% 66%'],
 ['21% 65%,28% 66%,32% 68%,42% 70%,48% 75%,47% 79%,41% 80%,32% 77%,22% 75%,18% 70%', '77% 65%,84% 66%,86% 70%,82% 75%,72% 78%,66% 80%,61% 79%,60% 75%,66% 70%,74% 68%'],
 ['19% 60%,29% 60%,34% 66%,41% 68%,46% 72%,45% 77%,41% 80%,34% 78%,30% 74%,23% 72%,15% 67%', '78% 60%,85% 64%,89% 68%,84% 72%,77% 74%,72% 78%,65% 80%,60% 77%,60% 72%,66% 68%,74% 66%'],
 ['13% 65%,23% 65%,27% 68%,33% 69%,39% 73%,38% 78%,31% 79%,25% 76%,18% 77%,13% 73%,10% 69%', '72% 66%,80% 66%,87% 70%,88% 74%,81% 78%,75% 79%,70% 77%,66% 79%,61% 77%,62% 72%,67% 69%'],
 ['14% 61%,25% 64%,29% 68%,34% 69%,39% 73%,36% 78%,29% 79%,22% 77%,17% 74%,10% 72%,6% 66%', '78% 61%,87% 61%,91% 66%,88% 71%,80% 74%,74% 77%,68% 79%,63% 78%,63% 73%,69% 69%,77% 67%'],
 ['17% 58%,28% 58%,35% 61%,40% 65%,38% 69%,31% 69%,25% 67%,17% 67%,13% 63%', '72% 58%,81% 58%,86% 63%,82% 67%,74% 69%,67% 69%,64% 65%,66% 61%'],
 ['20% 56%,30% 56%,34% 59%,40% 62%,41% 67%,36% 69%,29% 68%,24% 66%,17% 64%,16% 60%', '76% 56%,82% 59%,83% 64%,77% 67%,72% 69%,66% 69%,63% 65%,66% 61%,72% 59%'],
 ['15% 55%,25% 56%,30% 59%,38% 61%,41% 65%,39% 69%,33% 70%,27% 68%,24% 65%,16% 64%,13% 60%', '77% 55%,86% 58%,87% 63%,80% 65%,74% 69%,68% 70%,64% 68%,64% 63%,70% 60%'],
 ['12% 56%,22% 56%,31% 59%,37% 62%,39% 66%,36% 70%,29% 70%,23% 67%,17% 65%,10% 62%', '78% 56%,88% 56%,93% 61%,86% 65%,78% 68%,72% 70%,65% 70%,63% 66%,68% 62%'],
 ['10% 55%,20% 55%,25% 58%,29% 61%,29% 65%,24% 67%,17% 66%,12% 62%,7% 60%', '80% 56%,89% 58%,91% 62%,86% 66%,78% 68%,72% 67%,68% 64%,70% 60%,75% 58%'],
];
const SIDE_ARMS = [
 '33% 53%,42% 55%,54% 62%,62% 61%,70% 60%,78% 63%,80% 67%,76% 72%,66% 73%,50% 72%,40% 66%,33% 60%',
 '84% 59%,94% 58%,99% 63%,98% 69%,91% 73%,84% 71%,82% 66%',
];
const sideArms = character => SIDE_ARMS.map(contour=>character<5 ? contour : contour.replace(/(\d+)% (\d+)%/g,(_,x,y)=>`${x}% ${Number(y)-7}%`));
// A public roster gives every device the same, unique identities without sending
// cosmetic state or touching the room protocol. Identity never depends on POV.
export function mascotForSeat(players, seat) {
  const hash = [...players.join("|")].reduce((value, ch) => (Math.imul(value, 31) + ch.charCodeAt(0)) >>> 0, 0);
  return (hash + seat * 3) % MASCOTS.length;
}
export function renderMascot(character, seat = character) {
  return `<div class="player-character" role="img" aria-label="${MASCOTS[character]}"><div class="character-sprite" data-character="${character}" style="--character-x:${(character % 5) * 25}%;--character-y:${Math.floor(character / 5) * 100}%;--motion-delay:${seat * -1.3}s"></div></div>`;
}
// Shared seating for card and board games, with the local player at the bottom.
// These layouts do not change the supported player counts of any engine.
export function seatPosition(count, relative) {
  if (!relative) return [50, 94];
  if (count === 2) return [50, 32];
  const layouts = {
    3: [[24, 35], [76, 35]],
    4: [[9, 49], [50, 32], [91, 49]],
    5: [[9, 51], [35, 33], [65, 33], [91, 51]],
    6: [[9, 52], [28, 35], [50, 31], [72, 35], [91, 52]],
    7: [[9, 59], [21, 39], [39, 32], [61, 32], [79, 39], [91, 59]],
    8: [[9, 70], [9, 49], [29, 35], [50, 31], [71, 35], [91, 49], [91, 70]],
  };
  return layouts[count]?.[relative - 1] || [50, 18];
}
export function renderSeats(view, playerId, name, gameId) {
  const ownIndex = view.players.indexOf(playerId),
    n = view.players.length;
  return view.players
    .map((id, index) => {
      const relative = (index - ownIndex + n) % n,
        own = id === playerId;
      if (own) return '';
      const [x, y] = seatPosition(n, relative);
      const mobile = [gameId==='cinquillo'?x:x<20?12:x>80?88:x,y];
      const character = mascotForSeat(view.players, index);
      const direction = gameId === 'cinquillo' && x !== 50 ? (x < 50 ? 'right' : 'left') : 'front';
      const side = direction !== 'front';
      const active =
        !view.finished &&
        (view.turnPlayer === id ||
          (view.phase === "discard" && view.awaitingDiscardFrom?.includes(id)));
      const team = index % 2 === 0 ? "A" : "B";
      const count = view.handSizes?.[id] || 0;
      const cardGame = Boolean(view.handSizes);
      const arms = side ? sideArms(character) : ARM_CONTOURS[character];
      const style = `--seat-x:${x}%;--seat-y:${y}%;--seat-mobile-x:${mobile[0]}%;--seat-mobile-y:${mobile[1]}%;--character-x:${(character % 5) * 25}%;--character-y:${Math.floor(character / 5) * 100}%;--motion-delay:${index * -1.3}s;--grip-y:${side ? (character < 5 ? 67 : 60) : (character < 5 ? 73 : 64)}%;--side-fan-y:${character < 5 ? 52 : 46}%;--left-arm:polygon(${arms[0]});--right-arm:polygon(${arms[1]})`;
      // Body/chair sit behind the felt. This sibling crosses the table rim:
      // card backs under the hands, forearms over them. No hidden values enter it.
      const position=x<20?'left':x>80?'right':x===50?'top':'upper';
      const compactLabel=gameId==='cinquillo'?`<div class="seat-label"><strong>${esc(name(id))}</strong><small>${count}<span class="seat-cards-word"> cartas</span></small></div>`:'';
      const front = `<div class="seat-front ${active ? 'active-seat' : ''}" data-direction="${direction}" data-position="${position}" data-front-player="${esc(id)}" style="${style}" aria-hidden="true"><div class="seat-grip">${cardGame ? `<div class="rival-hand">${Array.from({ length: count }, (_, i) => `<i class="card-back" style="--fan-angle:${(i - (count - 1) / 2) * Math.min(10, 65 / Math.max(1, count))}deg"><span>✦</span></i>`).join('')}</div>` : ''}<div class="player-character forearms"><div class="character-sprite arm-left"></div><div class="character-sprite arm-right"></div></div></div>${compactLabel}</div>`;
      return `<article class="table-seat ${active ? 'active-seat' : ''}" data-direction="${direction}" data-position="${position}" data-player-id="${esc(id)}" style="${style}" aria-label="${esc(name(id))}, ${MASCOTS[character]}${cardGame ? `, ${count} cartas` : ''}${active ? ', turno activo' : ''}">${renderMascot(character, index)}${gameId==='cinquillo'?'':`<div class="seat-label"><strong>${esc(name(id))}</strong><small>${MASCOTS[character]}${gameId === 'mus' ? ` · ${team}` : ''}${cardGame ? ` · ${count} cartas` : ''}</small></div>`}${view.mano === id ? '<span class="mano-badge">Mano</span>' : ''}</article>${front}`;

    })
    .join("");
}
export function renderCinquilloBoard(view) {
  const legacy = view.ruleset === "legacy-french-52";
  const ranks = legacy ? FRENCH_RANKS : SPANISH_RANKS;
  const suits = legacy ? Object.keys(symbols) : SPANISH_SUITS;
  return `<div class="cinquillo-board ${legacy ? "legacy-board" : "spanish-board"}">${suits
    .map((suit) => {
      const entry = view.table[suit];
      const count = entry ? entry.high - entry.low + 1 : 0;
      const next = entry ? [ranks[entry.low - 1], ranks[entry.high + 1]].filter(Boolean) : canPlaceCinquillo(view.table,{suit,rank:'5'},view.ruleset)?['5']:[];
      const continuation = entry ? next.length ? `Puedes continuar con ${next.join(' o ')}` : 'Palo completo' : next.length ? 'Abre con el 5' : 'Primero el 5 de '+(legacy?'corazones':'oros');
      return `<div class="suit-lane ${count > 2 ? 'has-stack' : ''}" data-suit="${suit}"><b class="${["corazones", "diamantes"].includes(suit) ? "card-red" : ""}" aria-label="${suitNames[suit]}">${suitArt(suit)}<span>${suitNames[suit]}</span><small>· ${count} ${count === 1 ? 'carta' : 'cartas'}</small></b><div class="lane-cards">${ranks.map(
        (rank, index) => {
          const placed = entry && index >= entry.low && index <= entry.high;
          const endpoint = placed && (index === entry.low || index === entry.high);
          return `<span class="board-card ${placed ? "placed" : "empty-slot"} ${endpoint ? 'endpoint' : ''} ${rank === "5" ? "five-slot" : ""}" data-rank="${rank}" ${placed ? `data-table-key="${suit}:${rank}"` : ""} aria-label="${rank} de ${suit}${placed ? ", colocada" : ", pendiente"}">${placed ? cardFace({ suit, rank }) : `<span>${rank}</span>`}</span>`;
        },
      ).join("")}${entry ? '' : `<span class="unopened-suit" aria-label="${suitNames[suit]} sin abrir"><span>5</span>${suitArt(suit)}<small>Sin abrir</small></span>`}</div><span class="lane-next" aria-label="${continuation}" title="${continuation}">${entry ? next.length ? `<span aria-hidden="true">→ </span>${next.join(' o ')}` : 'Completo' : next.length ? 'Abre el 5' : 'En espera'}</span><span class="lane-range">${count ? `${ranks[entry.low]}${count > 1 ? '–' + ranks[entry.high] : ''} · ${count} ${count === 1 ? 'carta' : 'cartas'}` : 'Sin cartas'}</span></div>`;
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
  return `<div class="mus-board"><div class="mus-phase"><small>MANO ${view.handNumber || 1} · A ${view.targetScore} TANTOS</small><strong>${esc(view.phase === "juego" && view.isPunto ? "Punto" : phaseLabels[view.phase])}</strong><span>${pending ? (pending.ordago ? "¡Órdago sobre la mesa!" : `Envite: ${pending.amount} tantos`) : view.phase === "discard" ? "Cambia tus cartas" : view.phase === "mus" ? "Mus o corta el descarte" : view.revealedHands ? "Cartas a la vista" : "Las cartas siguen ocultas"}</span></div><div class="table-stock"><i class="card-back"><span>✦</span></i><i class="card-back"><span>✦</span></i></div>${view.revealedHands ? `<div class="revealed-hands">${view.players.map((id, i) => `<div><small>Asiento ${i + 1} · Pareja ${i % 2 ? "B" : "A"}</small><div>${view.revealedHands[id].map((card) => `<span class="reveal-card">${cardFace(card)}</span>`).join("")}</div></div>`).join("")}</div>` : ""}</div>`;
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

// Reactions use public counts/turns only. Selecting a private card is not a move.
export function animateSeats(app, before, view) {
  if (!before || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const changed = before.log !== view.log?.at(-1);
  for (const seat of app.querySelectorAll(".table-seat")) {
    const id = seat.dataset.playerId;
  const front = [...app.querySelectorAll("[data-front-player]")].find(el => el.dataset.frontPlayer === id);
  const sprites = [seat.querySelector(".player-character"), front?.querySelector(".seat-grip")].filter(Boolean);
    for (const sprite of sprites) {
    if (!sprite.animate) continue;
    const moved = before.handSizes?.[id] !== view.handSizes?.[id];
    const acted = changed && before.turnPlayer === id;
    const enteredTurn = before.turnPlayer !== view.turnPlayer && view.turnPlayer === id;
    if (moved || acted) {
      sprite.animate([{transform:"none"},{transform:"translateY(4px) rotate(-3deg)",offset:.4},{transform:"translateY(-3px) rotate(2deg)",offset:.75},{transform:"none"}], {duration:520,easing:"ease-in-out"});
    } else if (enteredTurn) {
      sprite.animate([{transform:"none"},{transform:"translateY(-6px) scale(1.04)"},{transform:"none"}], {duration:650,easing:"ease-out"});
    }
    }
  }
}
