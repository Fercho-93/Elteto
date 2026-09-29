import { FRENCH_RANKS, getGame, listGames } from "./game-core/index.js";
import { LocalGuestSession, LocalHostSession } from "./local-session.js";

const app = document.querySelector("#app");
const toastEl = document.querySelector("#toast");
const SUITS = { oros: "🟡", copas: "🍷", espadas: "⚔️", bastos: "🌿", picas: "♠", corazones: "♥", diamantes: "♦", treboles: "♣" };
const state = {
  screen: "home", role: null, name: "", roomName: "", gameId: "", playerId: null,
  players: [], view: null, host: null, guest: null, offerCode: "", answerCode: "",
  selected: new Set(), error: "", started: false,
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
function flash(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => toastEl.classList.remove("show"), 2800);
}
function header(back = "home") {
  return `<header class="topbar"><button class="icon-btn" data-action="back" aria-label="Volver">←</button><a class="brand" href="./" data-action="home">ELTETO</a><span class="topbar-tag">PIQUE SANO*</span></header>`;
}
function cardName(card) { return `${card.rank} de ${card.suit}`; }
function playerName(id) { return state.players.find((player) => player.id === id)?.name || (id === "host" ? state.name : id); }
function suitClass(suit) { return ["copas", "corazones", "diamantes", "oros"].includes(suit) ? "red-suit" : ""; }

function renderHome() {
  state.screen = "home";
  app.innerHTML = `<section class="home">
    <div class="sticker">BARAJA · PIQUE · REVANCHA</div>
    <div class="logo-mark" aria-hidden="true">E!</div>
    <h1>Elteto</h1>
    <p class="home-copy">Cartas, piques y revancha. Cada quien con su móvil; la mesa no necesita internet.</p>
    <p class="home-note">Poneos en la misma Wi-Fi o en un hotspot. Lo demás es echarle cara.</p>
    <div class="home-actions">
      <button class="button button-pink" data-action="open-host">Crear partida</button>
      <button class="button button-cyan" data-action="open-join">Unirse a una partida</button>
    </div>
    <p class="fineprint">*El pique sí está incluido. La deportividad, ya tal.</p>
  </section>`;
}

function renderHostForm() {
  state.screen = "host-form";
  const games = listGames().map((game) => `<label class="game-option ${state.gameId === game.id ? "chosen" : ""}">
    <input type="radio" name="game" value="${esc(game.id)}" ${state.gameId === game.id ? "checked" : ""}>
    <span class="game-check">✦</span><span><strong>${esc(game.label)}</strong><small>${game.minPlayers === game.maxPlayers ? `${game.minPlayers} jugadores` : `${game.minPlayers}–${game.maxPlayers} jugadores`}</small></span>
  </label>`).join("");
  app.innerHTML = `${header()}<section class="panel">
    <div class="eyebrow">Monta la mesa</div><h2>Que empiece el pique</h2>
    <label class="field-label" for="host-name">Tu nombre</label><input class="text-field" id="host-name" maxlength="24" placeholder="La jefa de la mesa" value="${esc(state.name)}">
    <label class="field-label" for="room-name">Nombre de la sala</label><input class="text-field" id="room-name" maxlength="30" placeholder="La timba de esta noche" value="${esc(state.roomName)}">
    <div class="field-label">Elige el juego</div><div class="game-options">${games}</div>
    <button class="button button-pink full-button" data-action="create-room">Crear sala y esperar</button>
  </section>`;
}

function renderJoinForm() {
  state.screen = "join-form";
  app.innerHTML = `${header()}<section class="panel">
    <div class="eyebrow">Te han invitado</div><h2>Busca tu mesa</h2>
    <p class="helper">Pide al anfitrión el código de invitación y pégalo aquí. La partida conecta los móviles directamente.</p>
    <label class="field-label" for="join-name">Tu nombre</label><input class="text-field" id="join-name" maxlength="24" placeholder="Donde las dan, las toman" value="${esc(state.name)}">
    <label class="field-label" for="offer-code">Código de invitación</label><textarea class="code-field" id="offer-code" rows="5" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Pega aquí el código que te han compartido">${esc(state.offerCode)}</textarea>
    <button class="button button-cyan full-button" data-action="join-room">Conectar con la sala</button>
    <p class="fineprint">En móvil puedes abrir la hoja de compartir para pasar el código entre teléfonos.</p>
  </section>`;
}

function codePanel(label, code, action) {
  if (!code) return "";
  return `<section class="code-card"><div class="code-head"><span class="code-badge">1</span><div><strong>${label}</strong><small>El código puede ocupar varias líneas. Copia el texto entero.</small></div></div>
    <textarea class="code-field code-output" rows="4" readonly spellcheck="false">${esc(code)}</textarea>
    <div class="code-actions"><button class="button button-small button-dark" data-action="copy-code" data-code-action="${action}">Copiar código</button><button class="button button-small button-paper" data-action="share-code" data-code-action="${action}">Compartir…</button></div>
  </section>`;
}

function renderLobby() {
  state.screen = "lobby";
  const game = state.gameId ? getGame(state.gameId) : null;
  const host = state.role === "host";
  const connected = state.role === "client" && state.players.some((player) => player.id === state.playerId);
  const rows = state.players.map((player, index) => `<div class="player-row"><span class="seat">${String(index + 1).padStart(2, "0")}</span><strong>${esc(player.name)}</strong>${player.isHost ? '<span class="host-pill">ANFITRIÓN</span>' : '<span class="ready-pill">EN LA MESA</span>'}</div>`).join("");
  const enoughPlayers = game && state.players.length >= game.minPlayers;
  const connectionTools = host
    ? `<div class="invite-grid">
         <button class="button button-cyan" data-action="new-invite">Crear código de invitación</button>
         ${codePanel("Pásale este código a cada jugador", state.offerCode, "offer")}
       </div>
       <label class="field-label" for="answer-code">Código de respuesta del invitado</label>
       <textarea class="code-field" id="answer-code" rows="3" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Pega aquí el código de respuesta">${esc(state.answerCode)}</textarea>
       <button class="button button-paper full-button" data-action="accept-answer">Sentar al invitado</button>`
    : `<div class="connection-status ${connected ? "connected" : ""}">${connected ? "Conexión directa establecida. Ya estás en la mesa." : "Conectando con el anfitrión…"}</div>
       ${!connected ? codePanel("Devuelve este código al anfitrión", state.answerCode, "answer") : ""}`;
  const startButton = host
    ? `<button class="button button-pink full-button" data-action="start-game" ${!enoughPlayers ? "disabled" : ""}>${enoughPlayers ? "Empezar partida" : `Faltan jugadores (${state.players.length}/${game?.minPlayers ?? "?"})`}</button>`
    : "";
  app.innerHTML = `${header()}<section class="panel lobby-panel">
    <div class="eyebrow">${host ? "La mesa ya está abierta" : "Te has sentado"}</div>
    <h2>${esc(state.roomName || game?.label || "Sala")}</h2>
    <p class="helper">${host ? "Comparte el código con tus colegas. Si se ponen intensos, culpa al Wi-Fi." : "Mantened abierta esta página y conectad los móviles a la misma Wi-Fi o hotspot."}</p>
    <div class="connection-box">${connectionTools}</div>
    <div class="players-head"><span>EN LA MESA</span><span>${state.players.length}${game ? ` / ${game.maxPlayers}` : ""}</span></div>
    <div class="player-list">${rows || '<div class="empty-seat">Todavía no se ha sentado nadie. Dale al código.</div>'}</div>
    ${state.error ? `<p class="error-message">${esc(state.error)}</p>` : ""}
    ${startButton}
    <button class="text-button" data-action="leave-room">Cerrar y salir</button>
  </section>`;
}

function renderCard(card, key, { disabled = false, selected = false } = {}) {
  return `<button class="playing-card ${suitClass(card.suit)} ${selected ? "selected" : ""}" data-action="play-card" data-card-key="${esc(key)}" ${disabled ? "disabled" : ""} aria-label="${esc(cardName(card))}">
    <span>${esc(card.rank)}</span><b>${SUITS[card.suit] || esc(card.suit)}</b>
  </button>`;
}

function renderGame() {
  state.screen = "game";
  const game = getGame(state.gameId);
  const view = state.view;
  if (!view) {
    app.innerHTML = `${header()}<section class="panel"><p class="helper">Esperando el estado de la partida…</p></section>`;
    return;
  }
  const winner = state.gameId === "mus" ? (view.winnerTeam ? `Gana el equipo ${view.winnerTeam}` : "") : (view.winner ? `Gana ${playerName(view.winner)}` : "");
  const hand = (view.myHand || []).map((card) => {
    const key = `${card.suit}:${card.rank}`;
    if (state.gameId === "mus") return renderCard(card, key, { selected: state.selected.has(key), disabled: view.phase !== "discard" || !view.awaitingDiscardFrom.includes(state.playerId) });
    const canPlay = view.turnPlayer === state.playerId && canPlaceCinquillo(view.table, card);
    return renderCard(card, key, { disabled: !canPlay });
  }).join("");
  const controls = state.gameId === "mus" ? musControls(view) : cinquilloControls(view);
  const table = state.gameId === "mus"
    ? `<div class="score-strip"><span>Equipo A <b>${view.scores.A}</b></span><span>Equipo B <b>${view.scores.B}</b></span><span>Meta <b>${view.targetScore}</b></span></div><p class="phase-tag">Fase: ${esc(view.phase)}</p>`
    : `<div class="table-cards">${Object.entries(view.table).map(([suit, entry]) => `<div class="sequence"><b class="${suitClass(suit)}">${SUITS[suit] || esc(suit)}</b><span>${FRENCH_RANKS[entry.low]} — ${FRENCH_RANKS[entry.high]}</span></div>`).join("") || "La mesa espera al primer cinco."}</div><div class="table-players">${view.players.map((id) => `<span class="${id === view.turnPlayer ? "turn-now" : ""}">${esc(playerName(id))} · ${view.handSizes[id]} cartas</span>`).join("")}</div>`;
  app.innerHTML = `${header()}<section class="game-page">
    <div class="game-top"><span class="game-ribbon">${esc(game.label)}</span><button class="text-button" data-action="leave-room">Salir</button></div>
    ${view.finished ? `<div class="winner-banner">${esc(winner || "La partida ha terminado")}</div>` : ""}
    <section class="game-table">${table}</section>
    ${state.error ? `<p class="error-message">${esc(state.error)}</p>` : ""}
    <h3>Tu mano <small>${view.myHand.length} cartas</small></h3>
    <div class="hand">${hand || '<p class="helper">No tienes cartas.</p>'}</div>
    <section class="game-controls">${controls}</section>
    <details class="history"><summary>Historial de la partida</summary><ol>${(view.log || []).slice().reverse().map((line) => `<li>${esc(line)}</li>`).join("")}</ol></details>
  </section>`;
}

function musControls(view) {
  if (view.finished) return "";
  if (view.phase === "discard") {
    if (!view.awaitingDiscardFrom.includes(state.playerId)) return '<p class="helper">Descarte confirmado. Esperando al resto…</p>';
    return `<p class="helper">Toca las cartas que quieras cambiar; también puedes quedártelas.</p><button class="button button-pink full-button" data-action="mus-discard">Confirmar descarte (${state.selected.size})</button>`;
  }
  const betting = view.betting;
  if (!betting || betting.turnPlayer !== state.playerId) return `<p class="helper">Turno de ${esc(playerName(view.turnPlayer))}.</p>`;
  const team = view.players.indexOf(state.playerId) % 2 === 0 ? "A" : "B";
  const responds = betting.pendingBet && betting.pendingBet.team !== team;
  const controls = responds
    ? `<button class="button button-cyan" data-action="mus-accept">Quiero</button><button class="button button-pink" data-action="mus-reject">No quiero</button><label class="bet-control"><input id="bet-amount" type="number" min="2" value="2"><button class="button button-paper" data-action="mus-bet">Subir</button></label>`
    : `<button class="button button-paper" data-action="mus-pass">Paso</button><label class="bet-control"><input id="bet-amount" type="number" min="2" value="2"><button class="button button-cyan" data-action="mus-bet">Envido</button></label><button class="button button-pink" data-action="mus-ordago">¡Órdago!</button>`;
  return `<p class="phase-tag">Te toca. ${betting.pendingBet ? `Envite: ${betting.pendingBet.amount}` : "¿Qué hacemos?"}</p><div class="action-row">${controls}</div>`;
}

function canPlaceCinquillo(table, card) {
  const index = FRENCH_RANKS.indexOf(card.rank);
  const sequence = table[card.suit];
  return sequence ? index === sequence.low - 1 || index === sequence.high + 1 : card.rank === "5";
}

function cinquilloControls(view) {
  if (view.finished) return "";
  if (view.turnPlayer !== state.playerId) return `<p class="helper">Turno de ${esc(playerName(view.turnPlayer))}.</p>`;
  return '<p class="helper">Juega una carta que continúe una escalera de la mesa. Las cartas válidas brillan.</p><button class="button button-paper" data-action="cinquillo-pass">Paso</button>';
}

function render() {
  if (state.screen === "host-form") renderHostForm();
  else if (state.screen === "join-form") renderJoinForm();
  else if (state.screen === "lobby") renderLobby();
  else if (state.screen === "game") renderGame();
  else renderHome();
}

function onHostChange(change) {
  if (change.kind === "lobby") {
    state.players = change.players;
    state.gameId = change.gameId;
  } else if (change.kind === "game") {
    state.players = change.players;
    state.gameId = change.gameId;
    state.view = change.view;
    state.error = "";
    state.screen = "game";
  } else if (change.kind === "error") {
    state.error = change.message;
    flash(change.message);
  }
  render();
}

async function copyCode(which) {
  const value = which === "offer" ? state.offerCode : state.answerCode;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    flash("Código copiado. Pásalo al otro móvil.");
  } catch {
    const field = document.querySelector(".code-output");
    field?.focus();
    field?.select();
    flash("Selecciona todo el código y cópialo.");
  }
}
async function shareCode(which) {
  const value = which === "offer" ? state.offerCode : state.answerCode;
  if (!value) return;
  try {
    if (navigator.share) await navigator.share({ title: "Conexión de Elteto", text: value });
    else await copyCode(which);
  } catch (error) {
    if (error?.name !== "AbortError") flash("No se pudo abrir la hoja de compartir. Prueba a copiar el código.");
  }
}

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  try {
    if (action === "open-host") { state.screen = "host-form"; state.gameId = state.gameId || listGames()[0]?.id || ""; render(); }
    else if (action === "open-join") { state.screen = "join-form"; render(); }
    else if (action === "home" || action === "back") { renderHome(); }
    else if (action === "create-room") {
      const gameId = document.querySelector('input[name="game"]:checked')?.value;
      const name = document.querySelector("#host-name")?.value.trim();
      const roomName = document.querySelector("#room-name")?.value.trim();
      if (!name || !gameId) throw new Error("Elige un nombre y un juego para abrir la mesa.");
      state.name = name; state.roomName = roomName || `Partida de ${name}`; state.gameId = gameId; state.role = "host"; state.playerId = "host"; state.error = "";
      state.host = new LocalHostSession(gameId, name, state.roomName, onHostChange);
      state.screen = "lobby"; render();
    } else if (action === "join-room") {
      const name = document.querySelector("#join-name")?.value.trim();
      const offer = document.querySelector("#offer-code")?.value.trim();
      if (!name || !offer) throw new Error("Escribe tu nombre y pega la invitación.");
      state.name = name; state.offerCode = offer; state.role = "client"; state.error = ""; state.screen = "lobby"; render();
      const guest = new LocalGuestSession(offer, name, (change) => {
        if (change.kind === "lobby") { state.players = change.players || []; state.playerId = change.playerId || state.playerId; state.gameId = change.gameId || state.gameId; state.answerCode = change.answerCode || state.answerCode; }
        else if (change.kind === "game") { state.players = change.players || state.players; state.playerId = change.playerId || state.playerId; state.view = change.view; state.gameId = change.gameId || state.gameId; state.screen = "game"; }
        else if (change.kind === "started") state.error = "";
        else if (change.kind === "error" || change.kind === "disconnected") { state.error = change.message; flash(change.message); }
        render();
      });
      state.guest = guest;
      state.answerCode = await guest.connect();
      render();
    } else if (action === "new-invite") {
      state.offerCode = await state.host.createInvite();
      state.answerCode = "";
      renderLobby();
      flash("Invitación lista. Compártela con quien se vaya a sentar.");
    } else if (action === "accept-answer") {
      const answer = document.querySelector("#answer-code")?.value.trim();
      if (!answer) throw new Error("Pega aquí el código de respuesta del invitado.");
      await state.host.acceptAnswer(answer);
      state.answerCode = "";
      renderLobby();
    } else if (action === "copy-code") await copyCode(button.dataset.codeAction);
    else if (action === "share-code") await shareCode(button.dataset.codeAction);
    else if (action === "start-game") {
      state.host.startGame();
      state.error = "";
      render();
    } else if (action === "play-card") {
      const key = button.dataset.cardKey;
      if (state.gameId === "mus") {
        if (state.selected.has(key)) state.selected.delete(key); else state.selected.add(key);
        renderGame();
      } else {
        const card = state.view.myHand.find((item) => `${item.suit}:${item.rank}` === key);
        if (card) sendAction({ type: "play", card });
      }
    } else if (action === "mus-discard") {
      const cards = state.view.myHand.filter((card) => state.selected.has(`${card.suit}:${card.rank}`));
      sendAction({ type: "discard", cards });
      state.selected.clear();
    } else if (action === "mus-pass") sendAction({ type: "pass" });
    else if (action === "mus-bet") sendAction({ type: "bet", amount: Number(document.querySelector("#bet-amount")?.value) || 2 });
    else if (action === "mus-ordago") sendAction({ type: "ordago" });
    else if (action === "mus-accept") sendAction({ type: "accept" });
    else if (action === "mus-reject") sendAction({ type: "reject" });
    else if (action === "cinquillo-pass") sendAction({ type: "pass" });
    else if (action === "leave-room") {
      state.host?.close(); state.guest?.leave();
      Object.assign(state, { role: null, name: "", players: [], view: null, host: null, guest: null, offerCode: "", answerCode: "", selected: new Set(), error: "", screen: "home" });
      renderHome();
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Algo se torció al preparar la jugada.";
    flash(state.error);
    render();
  }
});

app.addEventListener("change", (event) => {
  if (event.target.matches('input[name="game"]')) {
    state.gameId = event.target.value;
    renderHostForm();
  }
});

function sendAction(action) {
  if (state.role === "host") state.host.applyLocalAction(action);
  else state.guest.sendAction(action);
}
renderHome();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
