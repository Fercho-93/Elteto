import { FRENCH_RANKS, getGame, listGames } from "./game-core/index.js";
import { LocalGuestSession, LocalHostSession } from "./local-session.js";
import { parseRoomCode } from "./room-code.js";
import { GAME_CATALOG, icon, mascot } from "./game-catalog.js";

const LAN = window.ELTETO_LAN;
const app = document.querySelector("#app");
const toastEl = document.querySelector("#toast");
const SUITS = { oros: "🟡", copas: "🍷", espadas: "⚔️", bastos: "🌿", picas: "♠", corazones: "♥", diamantes: "♦", treboles: "♣" };
const state = {
  screen: "home", role: null, name: "", roomName: "", gameId: "", playerId: null,
  players: [], view: null, host: null, guest: null, online: null, roomCode: "", offerCode: "", answerCode: "",
  selected: new Set(), error: "", started: false, inviteMode: "offline",
  catalogFilter: "all",
};

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
function flash(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(flash.timer);
  flash.timer = setTimeout(() => toastEl.classList.remove("show"), 2800);
}
function header(back = "home") {
  return `<header class="topbar"><button class="icon-btn" data-action="back" aria-label="Volver">←</button><a class="brand" href="./" data-action="home"><span aria-hidden="true">🍆</span> ELTETO <span aria-hidden="true">🍑</span></a><span class="topbar-tag">FRUTA Y PIQUE*</span></header>`;
}
function cardName(card) { return `${card.rank} de ${card.suit}`; }
function playerName(id) { return state.players.find((player) => player.id === id)?.name || (id === "host" ? state.name : id); }
function suitClass(suit) { return ["copas", "corazones", "diamantes", "oros"].includes(suit) ? "red-suit" : ""; }

function renderHome() {
  state.screen = "home";
  const canHost = !LAN || Boolean(LAN.hostKey);
  const available = new Map(listGames().filter(game => !LAN || game.id === "cinquillo").map(game => [game.id, game]));
  const games = GAME_CATALOG.filter(game => state.catalogFilter === "all" || game.category === state.catalogFilter);
  const cards = games.map(game => {
    const engine = available.get(game.id);
    const playable = Boolean(engine) && canHost;
    const players = engine ? (engine.minPlayers === engine.maxPlayers ? `${engine.minPlayers} jugadores` : `${engine.minPlayers}–${engine.maxPlayers} jugadores`) : game.players;
    return `<button class="catalog-card accent-${game.accent}" data-action="select-game" data-game-id="${game.id}" ${playable ? "" : "disabled"} aria-label="${esc(game.label)} · ${players}${!engine ? " · Próximamente" : !canHost ? " · Únete a la mesa del anfitrión" : " · Crear partida"}">
      <span class="catalog-art">${mascot(game.mascot)}<span class="catalog-badge ${engine ? "available" : ""}">${engine ? (canHost ? "¡A jugar!" : "Mesa del anfitrión") : "Próximamente"}</span></span>
      <span class="catalog-caption"><span class="catalog-icon">${icon(game.icon)}</span><span class="catalog-label"><strong>${game.label}</strong><small>${players}</small></span><span class="catalog-arrow">${icon("arrow")}</span></span>
    </button>`;
  }).join("");
  app.innerHTML = `<section class="game-home">
    <header class="catalog-header"><a class="catalog-brand" href="./" data-action="home" aria-label="Elteto, inicio"><span class="catalog-wordmark">ELTETO</span><span class="catalog-tagline">FRUTA · PIQUE · REVANCHA</span></a><div class="catalog-profile">${mascot("aubergine")}<span>${esc(state.name || "Tu mesa")}</span></div></header>
    <nav class="catalog-filters" aria-label="Filtrar juegos">${[["all", "Todos", "cards"], ["cards", "Cartas", "cards"], ["boards", "Tableros", "dice"]].map(([filter, label, glyph]) => `<button data-action="filter-games" data-filter="${filter}" aria-pressed="${state.catalogFilter === filter}" class="${state.catalogFilter === filter ? "active" : ""}">${icon(glyph)}<span>${label}</span></button>`).join("")}</nav>
    <div class="catalog-heading"><h1>¿A qué jugamos?<span aria-hidden="true">✦</span></h1><p>Elige juego. Monta el pique.</p></div>
    <div class="catalog-grid" id="game-catalog">${cards}</div>
    <button class="catalog-all" data-action="all-games">${icon("cards")}<span>Ver todos los juegos</span>${icon("arrow")}</button>
    <p class="catalog-note">${LAN ? "Todos en la misma Wi-Fi o hotspot. El anfitrión abre la mesa." : "Crea tu mesa o únete a la de tu gente."}</p>
    <nav class="catalog-bottom" aria-label="Navegación principal"><button class="active" data-action="home" aria-current="page">${icon("home")}<span>Inicio</span></button><button data-action="open-join">${icon("join")}<span>Unirse</span></button>${canHost ? `<button data-action="open-host">${icon("plus")}<span>Crear partida</span></button>` : ""}</nav>
  </section>`;
}

function renderHostForm() {
  state.screen = "host-form";
  const games = listGames().filter(game => !LAN || game.id === "cinquillo").map((game) => `<label class="game-option ${state.gameId === game.id ? "chosen" : ""}">
    <input type="radio" name="game" value="${esc(game.id)}" ${state.gameId === game.id ? "checked" : ""}>
    ${mascot(GAME_CATALOG.find(item => item.id === game.id)?.mascot || "aubergine", "game-option-mascot")}<span><strong>${esc(game.label)}</strong><small>${game.minPlayers === game.maxPlayers ? `${game.minPlayers} jugadores` : `${game.minPlayers}–${game.maxPlayers} jugadores`}</small></span>
  </label>`).join("");
  app.innerHTML = `${header()}<section class="panel">
    <div class="eyebrow">La fruta está madura 🍑</div><h2>Que empiece el pique</h2>
    <label class="field-label" for="host-name">Tu nombre</label><input class="text-field" id="host-name" maxlength="24" placeholder="La jefa de la mesa" value="${esc(state.name)}">
    <label class="field-label" for="room-name">Nombre de la sala</label><input class="text-field" id="room-name" maxlength="30" placeholder="La timba de esta noche" value="${esc(state.roomName)}">
    <div class="field-label">Elige el juego</div><div class="game-options">${games}</div>
    <button class="button button-pink full-button" data-action="create-room">Repartir y abrir sala 🍆</button>
  </section>`;
}

function renderJoinForm() {
  state.screen = "join-form";
  app.innerHTML = `${header()}<section class="panel">
    <div class="eyebrow">Te guardaron sitio… y fruta 🍑</div><h2>Busca tu mesa</h2>
    <p class="helper">Con internet, escanea el enlace del anfitrión o escribe el código de la sala. Sin internet, abre Elteto en ambos móviles, conéctalos a la misma Wi-Fi o hotspot y escanea aquí el QR de invitación; luego el anfitrión escanea tu respuesta.</p>
    <label class="field-label" for="join-name">Tu nombre</label><input class="text-field" id="join-name" maxlength="24" placeholder="Donde las dan, las toman" value="${esc(state.name)}">
    <label class="field-label" for="offer-code">Enlace online o código offline</label><div class="scan-row"><button class="button button-paper" data-action="scan-offer">Abrir cámara</button><span>o pega el enlace</span></div><textarea class="code-field" id="offer-code" rows="3" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Código de sala (ABCD2345) o enlace https://fercho-93.github.io/Elteto/?join=…">${esc(state.offerCode)}</textarea>
    <button class="button button-cyan full-button" data-action="join-room">Entrar en la sala 🍑</button>
    <p class="fineprint">El QR abre este juego y te mete directamente en la sala.</p>
  </section>`;
}

function codePanel(label, code, action) {
  if (!code) return "";
  return `<section class="code-card"><div class="code-head"><span class="code-badge">1</span><div><strong>${label}</strong><small>${action === "offer" && state.inviteMode === "offline" ? "Escanéalo desde Elteto. Sube el brillo de esta pantalla para que el otro móvil lo enfoque." : action === "answer" ? "El anfitrión debe escanearlo desde Elteto para cerrar el enlace local." : "Escanea con la cámara normal del móvil para abrir Elteto."}</small></div></div>
    <canvas class="invite-qr" data-qr-action="${action}" aria-label="Código QR de conexión"></canvas><textarea class="code-field code-output" rows="3" readonly spellcheck="false">${esc(code)}</textarea>
    <div class="code-actions"><button class="button button-small button-dark" data-action="copy-code" data-code-action="${action}">Copiar código</button><button class="button button-small button-paper" data-action="share-code" data-code-action="${action}">Compartir código</button></div>
  </section>`;
}

function renderLobby() {
  state.screen = "lobby";
  const game = state.gameId ? getGame(state.gameId) : null;
  const host = state.role === "host";
  const connected = state.role === "client" && state.players.some((player) => player.id === state.playerId);
  const rows = state.players.map((player, index) => `<div class="player-row"><span class="seat">${String(index + 1).padStart(2, "0")}</span><strong>${esc(player.name)}</strong>${player.isHost ? '<span class="host-pill">ANFITRIÓN</span>' : `<span class="ready-pill">${player.away ? "SIN SEÑAL" : "EN LA MESA"}</span>`}${state.online && host && !player.isHost ? `<button class="text-button" data-action="kick-player" data-player-id="${esc(player.id)}" aria-label="Expulsar a ${esc(player.name)}">Expulsar</button>` : ""}</div>`).join("");
  const enoughPlayers = game && state.players.length >= game.minPlayers;
  const connectionTools = host
    ? `<div class="invite-grid">
         ${state.online ? "" : '<button class="button button-cyan" data-action="new-offline-invite">Invitar sin internet 🍆</button>'}
         ${state.online ? "" : '<button class="button button-paper" data-action="new-invite">Invitar con internet</button>'}
         ${state.online && state.roomCode ? `<p class="helper">Código de la sala: <strong class="room-code">${esc(state.roomCode)}</strong></p>` : ""}
         ${codePanel(state.inviteMode === "offline" ? "Invitación offline · escanéala desde Elteto" : (LAN ? "Mesa local · escanea con la cámara" : "Enlace online · se abre desde la cámara"), state.offerCode, "offer")}
         ${state.inviteMode === "offline" ? `<label class="field-label" for="answer-code">Respuesta del invitado</label><textarea class="code-field" id="answer-code" rows="3" autocapitalize="off" autocomplete="off" spellcheck="false" placeholder="Pega aquí su respuesta QR"></textarea><div class="scan-row"><button class="button button-paper" data-action="scan-answer">Escanear respuesta</button><button class="button button-small button-dark" data-action="accept-answer">Aceptar código</button></div>` : ""}
       </div>`
    : `<div class="connection-status ${connected ? "connected" : ""}">${connected ? (state.online ? (LAN ? "Conectado a la mesa local. Ya estás en la mesa." : "Conectado a la sala. Ya estás en la mesa.") : "Conexión directa establecida. Ya estás en la mesa.") : "Conectando con el anfitrión… No cierres esta página."}</div>${state.answerCode ? codePanel("Muestra este QR al anfitrión para completar la conexión", state.answerCode, "answer") : ""}`;
  const startButton = host
    ? `<button class="button button-pink full-button" data-action="start-game" ${!enoughPlayers ? "disabled" : ""}>${enoughPlayers ? "¡Que ruede la fruta! 🍑" : `Faltan jugadores (${state.players.length}/${game?.minPlayers ?? "?"})`}</button>`
    : "";
  app.innerHTML = `${header()}<section class="panel lobby-panel">
    <div class="eyebrow">${host ? "La mesa ya está servida 🍆" : "Ya estás en el huerto 🍑"}</div>
    <h2>${esc(state.roomName || game?.label || "Sala")}</h2>
    <p class="helper">${host ? (state.online ? (LAN ? "Comparte el QR o enlace local. Todos debéis estar en la misma Wi-Fi o hotspot. Mantén Elteto abierto en este Android." : "Pásales el enlace, el QR o el código de la sala. Todos necesitáis internet.") : state.inviteMode === "offline" ? "Modo sin internet: los dos móviles deben estar en la misma Wi-Fi o hotspot. Comparte la invitación y escanea luego la respuesta." : "Elige cómo invitar: con internet (enlace, QR o código) o sin internet (misma Wi-Fi).") : (state.online ? (LAN ? "Mesa local: deja esta página abierta. Si pierdes la señal, intentaremos recuperar tu plaza." : "Deja Elteto abierto: la sala se mantiene mientras el anfitrión siga conectado.") : "Deja Elteto abierto. Para jugar sin internet, conecta ambos móviles a la misma Wi-Fi o hotspot; el anfitrión escaneará tu respuesta QR.")}</p>
    <div class="connection-box">${connectionTools}</div>
    <div class="players-head"><span>EN LA MESA</span><span>${state.players.length}${game ? ` / ${game.maxPlayers}` : ""}</span></div>
    <div class="player-list">${rows || '<div class="empty-seat">Todavía no se ha sentado nadie. Dale al código.</div>'}</div>
    ${state.error ? `<p class="error-message">${esc(state.error)}</p>` : ""}
    ${startButton}
    <button class="text-button" data-action="leave-room">Cerrar y salir</button>
  </section>`;
  for (const canvas of app.querySelectorAll("[data-qr-action]")) {
    const value = canvas.dataset.qrAction === "answer" ? state.answerCode : state.offerCode;
    try { window.CONTINUUM.QrEncode.draw(canvas, value); }
    catch (error) { console.warn("No se pudo dibujar el código QR.", error); }
  }
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
    <div class="game-top"><span class="game-ribbon">🍆 ${esc(game.label)} 🍑</span><button class="text-button" data-action="leave-room">Salir</button></div>
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
    ? `<button class="button button-cyan" data-action="mus-accept">Me apunto 🍑</button><button class="button button-pink" data-action="mus-reject">Ni de fruta</button><label class="bet-control"><input id="bet-amount" type="number" min="2" value="2"><button class="button button-paper" data-action="mus-bet">Subir</button></label>`
    : `<button class="button button-paper" data-action="mus-pass">Paso</button><label class="bet-control"><input id="bet-amount" type="number" min="2" value="2"><button class="button button-cyan" data-action="mus-bet">Envido 🍑</button></label><button class="button button-pink" data-action="mus-ordago">¡Órdago! 🍆</button>`;
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

function resetToHome() {
  Object.assign(state, { role: null, name: "", players: [], view: null, host: null, guest: null, online: null, roomCode: "", offerCode: "", answerCode: "", selected: new Set(), error: "", screen: "home" });
  renderHome();
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
    flash("Enlace copiado. Envíalo o muéstralo para escanear.");
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
    if (navigator.share) await navigator.share(value.startsWith("http") ? { title: "Invitación a Elteto", url: value } : { title: "Código de conexión de Elteto", text: value });
    else await copyCode(which);
  } catch (error) {
    if (error?.name !== "AbortError") flash("No se pudo abrir la hoja de compartir. Prueba a copiar el código.");
  }
}

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if (action === "home") event.preventDefault();
  try {
    if (action === "filter-games" || action === "all-games") {
      const filter = action === "all-games" ? "all" : button.dataset.filter;
      if (!["all", "cards", "boards"].includes(filter)) return;
      state.catalogFilter = filter;
      renderHome();
      if (action === "filter-games") app.querySelector(`[data-filter="${filter}"]`)?.focus({ preventScroll: true });
      else app.querySelector('[data-action="all-games"]')?.focus({ preventScroll: true });
    }
    else if (action === "select-game") {
      const gameId = button.dataset.gameId;
      if ((LAN && (!LAN.hostKey || gameId !== "cinquillo")) || !listGames().some(game => game.id === gameId)) return;
      state.gameId = gameId;
      state.screen = "host-form";
      render();
    }
    else if (action === "open-host") { state.screen = "host-form"; state.gameId = LAN ? "cinquillo" : state.gameId || listGames()[0]?.id || ""; render(); }
    else if (action === "open-join") { state.screen = "join-form"; render(); }
    else if (action === "home" || action === "back") { renderHome(); }
    else if (action === "create-room") {
      const gameId = document.querySelector('input[name="game"]:checked')?.value;
      const name = document.querySelector("#host-name")?.value.trim();
      const roomName = document.querySelector("#room-name")?.value.trim();
      if (!name || !gameId) throw new Error("Elige un nombre y un juego para abrir la mesa.");
      state.name = name; state.roomName = roomName || `Partida de ${name}`; state.gameId = gameId; state.role = "host"; state.playerId = "host"; state.error = "";
      if (LAN) {
        const { LanSession } = await import("./lan-session.js");
        const session = await LanSession.create({gameId, hostName:name, roomName:state.roomName}, onOnlineChange);
        Object.assign(state, {host:session,online:session,inviteMode:"online",roomCode:session.roomCode,offerCode:session.inviteUrl});
        renderLobby(); return;
      }
      state.host = new LocalHostSession(gameId, name, state.roomName, onHostChange);
      state.inviteMode = "offline"; state.offerCode = ""; state.answerCode = "";
      state.screen = "lobby"; renderLobby();
    } else if (action === "join-room") {
      const name = document.querySelector("#join-name")?.value.trim() || "Invitado";
      const invite = document.querySelector("#offer-code")?.value.trim();
      const roomCode = parseRoomCode(invite);
      if (roomCode) await beginOnlineJoin(roomCode, name);
      else {
        if (!invite) throw new Error("Escanea el QR del anfitrión o pega su código de invitación.");
        await beginOfflineGuestJoin(invite, name);
      }
    } else if (action === "new-invite") {
      await openOnlineRoom();
      flash("Sala con internet lista. Comparte el enlace, el QR o el código.");
    } else if (action === "new-offline-invite") {
      if (state.online) throw new Error("Esta sala usa internet. Cierra la sala y crea otra para invitar sin internet.");
      state.inviteMode = "offline";
      state.answerCode = "";
      const offlineOffer = await state.host.createOfflineInvite();
      if (/^https?:\/\//i.test(String(offlineOffer || "").trim())) {
        throw new Error("La invitación offline no puede ser una URL. Recarga Elteto para obtener la versión actualizada.");
      }
      state.offerCode = offlineOffer;
      renderLobby();
      flash("Invitación offline lista. El invitado la escanea dentro de Elteto y luego tú escaneas su respuesta.");
    } else if (action === "accept-answer") {
      const answer = document.querySelector("#answer-code")?.value.trim();
      if (!answer) throw new Error("Pega aquí el código de respuesta del invitado.");
      await state.host.acceptOfflineAnswer(answer);
      state.answerCode = "";
      renderLobby();
      flash("Respuesta aceptada. La conexión directa está arrancando.");
    } else if (action === "scan-offer") await beginQrScan("offer");
    else if (action === "scan-answer") await beginQrScan("answer");
    else if (action === "stop-scan") endQrScan();
    else if (action === "copy-code") await copyCode(button.dataset.codeAction);
    else if (action === "share-code") await shareCode(button.dataset.codeAction);
    else if (action === "start-game") {
      await (state.online || state.host).startGame();
      state.error = "";
      render();
    } else if (action === "kick-player") {
      await state.online?.removePlayer(button.dataset.playerId);
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
      if (state.online) void state.online.exit(); else { state.host?.close(); state.guest?.leave(); }
      resetToHome();
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Algo se torció al preparar la jugada.";
    flash(state.error);
    if (state.role === "host") state.screen = "lobby";
    render();
  }
});

app.addEventListener("input", (event) => {
  if (event.target.matches("#host-name")) state.name = event.target.value;
  else if (event.target.matches("#room-name")) state.roomName = event.target.value;
});

app.addEventListener("change", (event) => {
  if (event.target.matches('input[name="game"]')) {
    state.gameId = event.target.value;
    renderHostForm();
  }
});


let activeScanner = null;
let scanTarget = null;
async function beginQrScan(target) {
  if (!window.CONTINUUM?.QrScanner?.isSupported()) {
    flash("Este navegador no da acceso a la cámara. Puedes pegar el código a mano.");
    return;
  }
  scanTarget = target;
  const overlay = document.createElement("section");
  overlay.className = "scan-overlay";
  overlay.innerHTML = `<div class="scan-panel"><div class="eyebrow">Conexión de la mesa</div><h2>Apunta al código QR</h2><video id="qr-video" playsinline muted></video><p class="helper">Centra el QR entero y sube el brillo de la pantalla que lo muestra. Dale unos segundos para enfocar.</p><button class="button button-paper full-button" data-action="stop-scan">Cancelar</button></div>`;
  document.body.appendChild(overlay);
  try {
    const video = overlay.querySelector("#qr-video");
    const scanner = await window.CONTINUUM.QrScanner.start(video, (value) => {
      if (!scanTarget) return;
      const targetNow = scanTarget;
      endQrScan();
      if (targetNow === "offer") {
        const roomCode = parseRoomCode(value);
        const playerName = localStorage.getItem("elteto.playerName") || "Invitado";
        const join = roomCode ? beginOnlineJoin(roomCode, playerName) : beginOfflineGuestJoin(value, playerName);
        join.catch((error) => { state.error = error.message || "No se pudo entrar en la sala."; flash(state.error); render(); });
      } else if (targetNow === "answer") {
        state.host.acceptOfflineAnswer(value).then(() => { state.answerCode = ""; renderLobby(); flash("Respuesta aceptada. Conexión directa en marcha."); }).catch((error) => { state.error = error.message || "No se pudo aceptar la respuesta."; flash(state.error); renderLobby(); });
      }
    }, (error) => console.warn("No se pudo leer el fotograma.", error));
    activeScanner = scanner;
  } catch (error) {
    endQrScan();
    flash(error?.name === "NotAllowedError" ? "Activa el permiso de cámara para escanear el QR." : "No se pudo abrir la cámara. Puedes pegar el código.");
  }
}
function endQrScan() {
  activeScanner?.stop();
  activeScanner = null;
  scanTarget = null;
  document.querySelector(".scan-overlay")?.remove();
}

function handleGuestChange(change) {
  if (change.kind === "lobby") { state.players = change.players || []; state.playerId = change.playerId || state.playerId; state.gameId = change.gameId || state.gameId; state.roomName = change.roomName || state.roomName; }
  else if (change.kind === "game") { state.players = change.players || state.players; state.playerId = change.playerId || state.playerId; state.view = change.view; state.gameId = change.gameId || state.gameId; state.screen = "game"; }
  else if (change.kind === "started") state.error = "";
  else if (change.kind === "error" || change.kind === "disconnected") { state.error = change.message; flash(change.message); }
  render();
}
// Salas con internet (Firestore). La misma sesión sirve para quien abre la sala y para quien
// entra, y puede pasar de una a otra si el anfitrión desaparece y alguien toma el relevo.
function onOnlineChange(change) {
  if (change.kind === "lobby" || change.kind === "game") {
    state.players = change.players || state.players;
    state.gameId = change.gameId || state.gameId;
    state.roomName = change.roomName || state.roomName;
    state.playerId = change.playerId || state.playerId;
    state.role = change.isHost ? "host" : "client";
    state.roomCode = change.roomCode || state.roomCode;
    if (change.inviteUrl) state.offerCode = change.inviteUrl;
    if (change.kind === "game") { state.view = change.view; state.error = ""; state.screen = "game"; }
  } else if (change.kind === "started") {
    state.error = "";
    return;
  } else if (change.kind === "notice") {
    flash(change.message);
    return;
  } else if (change.kind === "error") {
    state.error = change.message;
    flash(change.message);
  } else if (change.kind === "disconnected") {
    flash(change.message);
    resetToHome();
    return;
  }
  render();
}
async function openOnlineRoom() {
  if (state.online) { renderLobby(); return; }
  if (state.host?.connections?.size) throw new Error("Ya hay jugadores conectados sin internet. Cierra la sala y crea otra para invitar con internet.");
  const { OnlineSession } = await import("./online-room.js");
  const session = await OnlineSession.create({ gameId: state.gameId, roomName: state.roomName, hostName: state.name }, onOnlineChange);
  state.host?.close();
  Object.assign(state, { host: session, online: session, role: "host", playerId: session.playerId, inviteMode: "online", roomCode: session.roomCode, offerCode: session.inviteUrl, answerCode: "", error: "" });
  renderLobby();
}
async function beginOnlineJoin(code, name) {
  state.name = name || "Invitado";
  try { localStorage.setItem("elteto.playerName", state.name); } catch {}
  Object.assign(state, { role: "client", inviteMode: "online", error: "", screen: "lobby", players: [], offerCode: "", answerCode: "", roomCode: code });
  render();
  try {
    const { OnlineSession, LanSession } = await import(LAN ? "./lan-session.js" : "./online-room.js");
    const session = await (LAN ? LanSession : OnlineSession).join(code, state.name, onOnlineChange);
    state.online = session;
    state.guest = session;
    if (LAN) state.host = session;
  } catch (error) {
    Object.assign(state, { role: null, screen: "join-form", roomCode: "" });
    throw error;
  }
}
async function beginOfflineGuestJoin(offerCode, name) {
  if (/^https?:\/\//i.test(String(offerCode || "").trim())) {
    throw new Error("Ese código es una invitación online. Para jugar sin internet, usa el código offline generado por «Invitar sin internet».");
  }
  state.name = name || "Invitado";
  try { localStorage.setItem("elteto.playerName", state.name); } catch {}
  Object.assign(state, { role: "client", inviteMode: "offline", error: "", screen: "lobby", players: [], offerCode: "", answerCode: "" });
  render();
  const guest = new LocalGuestSession(state.name, handleGuestChange);
  state.guest = guest;
  state.answerCode = await guest.connectOffline(offerCode);
  renderLobby();
}
function sendAction(action) {
  if (state.online) { state.online.sendAction(action).catch((error) => { state.error = error.message; flash(error.message); render(); }); return; }
  if (state.role === "host") state.host.applyLocalAction(action);
  else state.guest.sendAction(action);
}
const incomingRoom = parseRoomCode(location.search);
if (incomingRoom) {
  beginOnlineJoin(incomingRoom, localStorage.getItem("elteto.playerName") || "Invitado").catch((error) => { state.error = error.message || "No se pudo entrar en la sala."; renderJoinForm(); flash(state.error); });
} else renderHome();
if (!LAN && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
