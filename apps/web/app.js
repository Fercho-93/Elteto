import { renderAvatarArtwork } from './avatar-art.js';
import {beginParchisRoll} from './parchis-dice.js';
import { getGame, listGames, GAME_CATALOG } from "./game-core/index.js";
import { LocalGuestSession, LocalHostSession } from "./local-session.js";
import { arrangeCinquilloScreen } from './cinquillo-screen.js';
import { arrangeMusScreen } from './mus-screen.js';
import { renderParchisScreen } from './parchis-board.js';
import { parseRoomCode } from "./room-code.js";

import { cardKey, renderHandCard, renderSeats, renderCinquilloBoard, renderMusBoard, sortedHand, canPlayCinquillo, animateTable, animateSeats, MASCOTS, renderMascot } from "./table-view.js";

const LAN = window.ELTETO_LAN;
const app = document.querySelector("#app");
const toastEl = document.querySelector("#toast");
const state = {
  screen: "home", role: null, name: "", roomName: "", gameId: "", playerId: null,
  players: [], view: null, host: null, guest: null, online: null, roomCode: "", offerCode: "", answerCode: "",
  selected: new Set(), error: "", started: false, inviteMode: "offline", handSuit: 'all',
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
function playerName(id) { return state.players.find((player) => player.id === id)?.name || (id === "host" ? state.name : id); }

function menuAvatar(index) {
  return `<span class="menu-avatar" role="img" aria-label="${esc(MASCOTS[index])}">${renderAvatarArtwork(index, 'menu')}</span>`;
}
function renderHome() {
  state.screen = "home";
  app.innerHTML = `<section class="menu-shell">
    <div class="menu-wrap">
      <header class="menu-header"><a class="menu-brand" href="./" aria-label="Elteto, inicio">ELTETO<span>✦</span></a><nav aria-label="Menú principal"><a href="#menu-games">Juegos</a><a href="./reglas_juegos/biblioteca.html">Reglas ↗</a></nav></header>
      <div class="menu-hero">
        <div class="menu-art"><div class="menu-logo" role="img" aria-label="Elteto: berenjena y melocotón con gafas bajo un arco de neón"></div></div>
        <div class="menu-intro"><p class="menu-kicker">CARTAS · DADOS · PIQUE</p><h1>Se viene<br> <span>pique.</span></h1><p class="menu-copy">Los de siempre. Con los tuyos.</p>
          <div class="menu-actions">${!LAN || LAN.hostKey ? '<button class="menu-button menu-primary" data-action="open-host">Crear partida <span aria-hidden="true">↗</span></button>' : ''}<button class="menu-button menu-secondary" data-action="open-join">Unirse a la mesa <span aria-hidden="true">→</span></button></div>
          ${LAN ? '<p class="menu-network-note">Mesa local sin internet. Conecta todos los móviles a la misma Wi-Fi o hotspot.</p>' : ''}
        </div>
      </div>
      <section class="menu-games" id="menu-games" aria-labelledby="menu-games-title"><div class="menu-section-heading"><h2 id="menu-games-title">¿A qué le damos?</h2><a href="./reglas_juegos/biblioteca.html">Ver reglas ↗</a></div><div class="menu-game-grid">${listGames().map((game, index) => `<a class="menu-game" href="./reglas_juegos/lectura/${game.id}.html"><span class="menu-game-symbol" aria-hidden="true">${['♠','♣','⚄'][index]}</span><div><h3>${esc(game.label)}</h3><p>${game.minPlayers === game.maxPlayers ? game.minPlayers : `${game.minPlayers}–${game.maxPlayers}`} jugadores</p></div><span class="menu-game-link" aria-label="Reglas de ${esc(game.label)}">↗</span></a>`).join('')}</div></section>
      <section class="menu-cast"><details class="menu-characters"><summary>La peña <span>${MASCOTS.length} avatares <b aria-hidden="true">+</b></span></summary><div class="menu-character-grid">${MASCOTS.map((label,index)=>`<figure>${menuAvatar(index)}<figcaption>${esc(label)}</figcaption></figure>`).join('')}</div></details></section>
      <footer class="menu-footer"><span>ELTETO · Luego no llores.</span><details class="menu-extras"><summary>Extras <span aria-hidden="true">+</span></summary><div class="menu-extra-content"><a href="./reglas_juegos/biblioteca.html#proximos">Próximos juegos <span>${GAME_CATALOG.filter(game => game.status === 'planned').length}</span></a><a href="./assets/decks/credits.html">Créditos de las barajas ↗</a></div></details></footer>
    </div>
  </section>`;
}

function renderHostForm() {
  state.screen = "host-form";
  const games = listGames().map((game) => `<label class="game-option ${state.gameId === game.id ? "chosen" : ""}">
    <input type="radio" name="game" value="${esc(game.id)}" ${state.gameId === game.id ? "checked" : ""}>
    <span class="game-check" aria-hidden="true">✓</span><span><strong>${esc(game.label)}</strong><small>${game.minPlayers === game.maxPlayers ? `${game.minPlayers} jugadores` : `${game.minPlayers}–${game.maxPlayers} jugadores`}</small></span>
  </label>`).join("");
  app.innerHTML = `<section class="menu-shell"><div class="menu-wrap"><header class="menu-header"><button class="menu-back" data-action="back">← <span>Volver</span></button><a class="menu-brand" href="./" data-action="home">ELTETO<span>✦</span></a></header><section class="menu-setup" aria-labelledby="setup-title">
    <p class="menu-kicker">TÚ PONES LA MESA</p><h1 id="setup-title">Crear partida<span>.</span></h1>
    <div class="menu-fields"><div><label class="field-label" for="host-name">Tu nombre</label><input class="text-field" id="host-name" maxlength="24" autocomplete="nickname" placeholder="Cómo te llaman" value="${esc(state.name)}"></div>
    <div><label class="field-label" for="room-name">Nombre de la sala <span>opcional</span></label><input class="text-field" id="room-name" maxlength="30" placeholder="La de siempre" value="${esc(state.roomName)}"></div></div>
    <fieldset class="menu-game-fieldset"><legend>Elige el juego</legend><div class="game-options">${games}</div></fieldset>
    <button class="menu-button menu-primary menu-create" data-action="create-room">Crear sala <span aria-hidden="true">↗</span></button>
  </section></div></section>`;
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

let previousTableKeys = null;
let previousTurn = null;
let renderedGame = null;
let previousSeats = null;
let shownResult = null;
function renderGame() {
  state.screen = "game";
  const game = getGame(state.gameId), view = state.view;
  if (!view) { app.innerHTML = `${header()}<section class="panel"><p>Esperando el estado de la partida…</p></section>`; return; }
  if(state.gameId==='parchis'){renderParchisScreen(app,view,state.playerId,playerName,state.error);return;}
  const origins = new Map([...app.querySelectorAll('.hand [data-card-key]')].map(el => [el.dataset.cardKey, el.getBoundingClientRect()]));
  const stockOrigin = app.querySelector(".table-stock")?.getBoundingClientRect();
  const oldHandKeys = new Set(origins.keys());
  const actor = [...app.querySelectorAll('[data-player-id]')].find(el => el.dataset.playerId === previousTurn);
  const actorFront = [...app.querySelectorAll('[data-front-player]')].find(el => el.dataset.frontPlayer === previousTurn);
  const sourceSeat = (actorFront?.querySelector('.rival-hand') || actor)?.getBoundingClientRect();
  const gameToken = `${state.gameId}:${view.players.join(',')}:${state.playerId}:${view.handNumber}`;
  if (renderedGame !== gameToken) { previousTableKeys = null; previousSeats = null; state.handSuit='all'; }
  renderedGame = gameToken;
  const scroll = app.querySelector('.hand')?.scrollLeft || 0;
  const historyOpen = app.querySelector('.history')?.open || false;
  const rulesOpen = app.querySelector('.game-rules')?.open || false;
  const focused = app.contains(document.activeElement) ? document.activeElement : null;
  const focusAction = focused?.dataset.action;
  const focusCard = focused?.dataset.cardKey;
  const focusSuit = focused?.dataset.suit;
  const zoomOpen = app.querySelector('.board-zoom')?.open || false;
  const zoomScrollTop = app.querySelector('.board-zoom .zoom-scroll')?.scrollTop || 0;
  const menuOpen = app.querySelector('.game-menu')?.open || false;
  const resultOpen = app.querySelector('.hand-result')?.open || false;
  const menuScrollTop = app.querySelector('.game-menu-content')?.scrollTop || 0;
  const winner = state.gameId === 'mus' ? `Gana la pareja ${view.winnerTeam || ''}` : view.winner ? `Gana ${playerName(view.winner)}` : 'Fin de partida';
  const myTurn = view.turnPlayer === state.playerId;
  const selecting = state.gameId === 'mus' && view.phase === 'discard' && view.awaitingDiscardFrom.includes(state.playerId);
  const hand = sortedHand(view.myHand).map((card,index) => {
    const playable = state.gameId === 'cinquillo' && !view.finished && !view.handWinner && myTurn && canPlayCinquillo(view.table, card, view.ruleset);
    return renderHandCard(card, {playable, selected: selecting && state.selected.has(cardKey(card)), selectable: selecting, disabled: !selecting && !playable, tilt:(index-(view.myHand.length-1)/2)*2.4});
  }).join('');
  const controls = state.gameId === 'mus' ? musControls(view) : cinquilloControls(view);
  const table = state.gameId === 'mus' ? renderMusBoard(view) : renderCinquilloBoard(view);
  const hint = view.finished ? winner : selecting ? 'Selecciona tu descarte' : myTurn ? 'Tu turno' : view.phase === 'discard' ? 'Esperando descartes' : `Turno de ${playerName(view.turnPlayer)}`;
  app.innerHTML = `${header()}<section class="game-page" data-game="${state.gameId}">
    <div class="game-top"><span class="game-ribbon">${esc(game.label)} · ${state.gameId === 'mus' ? (view.ruleset === 'eight-kings' ? '8 reyes y 8 ases' : '4 reyes') : (view.ruleset === 'legacy-french-52' ? '52 cartas · mesa anterior' : '40 cartas españolas')}</span><button class="text-button" data-action="leave-room">Salir</button></div>
    ${view.finished ? `<div class="winner-banner" role="status">${esc(winner)}</div>` : ''}
    ${state.gameId === 'cinquillo' ? `<p class="match-score">Mano ${view.handNumber} · Meta ${view.targetScore} · ${view.players.map(id=>`${esc(playerName(id))}: ${view.scores[id]}`).join(' · ')}</p>` : `<p class="match-score">Juegos: A ${view.gamesWon?.A ?? 0} · B ${view.gamesWon?.B ?? 0} · primero a ${view.targetGames ?? 1}${view.gameWinner ? ` · Gana el juego ${esc(view.gameWinner)}` : ''}</p>`}
    ${state.gameId === 'mus' ? `<div class="score-strip"><span>Pareja A <b>${view.scores.A}</b></span><span>Pareja B <b>${view.scores.B}</b></span></div>` : ''}
    <div class="turn-banner ${myTurn || selecting ? 'your-turn' : ''}" role="status">${esc(hint)}</div>
    <section class="game-table seats-${view.players.length}" data-scene="illustrated-2d" aria-label="Mesa de ${esc(game.label)}">
      <div class="table-surface" aria-hidden="true"><i class="table-leg leg-left"></i><i class="table-leg leg-right"></i></div>
      <div class="felt-watermark" aria-hidden="true">ELTETO <span>LA TIMBA</span></div>
      ${renderSeats(view, state.playerId, playerName, state.gameId)}
      <div class="table-center">${table}</div>
    </section>
    <div class="table-tools"><button data-action="open-table-zoom">${state.gameId === 'cinquillo' ? 'Ver todas las cartas' : 'Ampliar mesa'}</button>${state.gameId === 'cinquillo' ? '<button data-action="go-to-hand">Mi mano ↓</button>' : ''}</div>
    <p class="last-play" aria-live="polite">${esc(readableLog(view.log?.at(-1) || 'La mesa está lista.'))}</p>
    ${state.error ? `<p class="error-message" role="alert">${esc(state.error)}</p>` : ''}
    <h3 tabindex="-1" class="hand-heading">Tu mano <small>${view.myHand.length} cartas${state.gameId==='mus' ? ` · Pareja ${view.players.indexOf(state.playerId)%2 ? 'B' : 'A'}` : ''}${view.mano===state.playerId ? ' · Eres mano' : ''}</small></h3>
    <div class="hand ${view.myHand.length <= 10 ? 'hand-fan' : ''}" aria-label="Tus cartas">${hand || '<p>No tienes cartas.</p>'}</div>
    ${controls ? `<section class="game-controls">${controls}</section>` : ""}
    <details class="game-rules"><summary>Cómo jugar · reglas de esta mesa</summary>${state.gameId === 'cinquillo' ? view.ruleset === 'legacy-french-52' ? '<p>Mesa anterior: 52 cartas francesas, salida cinco de corazones, una mano.</p>' : '<p>40 cartas españolas; salida cinco de oros. Escaleras sin saltos: 1–7, sota (10), caballo (11), rey (12). Solo pasa quien no tiene jugada. Ganador de mano: 5 puntos más cartas ajenas; los demás restan sus cartas. Gana quien alcanza 30. La fuente clásica usa cuatro jugadores; las mesas de 2–6 son una ampliación de Elteto.</p>' : `<p>Cuatro jugadores por parejas; ${view.ruleset === 'eight-kings' ? '8 reyes y 8 ases: treses como reyes y doses como ases; mus corrido en la primera mano' : '4 reyes: doses y treses conservan su valor'}. Grande, chica, pares y juego o punto. Juegos a ${view.targetScore} tantos; gana quien logra ${view.targetGames ?? 1} juegos completos. El órdago aceptado decide un juego completo.</p>`}<a href="./reglas_juegos/lectura/${state.gameId}.html">Consultar reglamento completo</a></details>
    <details class="history" ${historyOpen ? 'open' : ''}><summary>Historial de la partida</summary><ol>${(view.log || []).slice().reverse().map(line => `<li>${esc(readableLog(line))}</li>`).join('')}</ol></details>
    <dialog class="board-zoom" aria-label="Mesa ampliada"></dialog>
  </section>`;
  if(state.gameId==='cinquillo') state.handSuit=arrangeCinquilloScreen(app,view,state.playerId,playerName,state.handSuit);
  else if(state.gameId==='mus') arrangeMusScreen(app,view,state.playerId,playerName);
  app.querySelector('.game-rules').open=rulesOpen;
  app.querySelector('.board-zoom').addEventListener('close',event=>{
    event.target.replaceChildren();
    app.querySelector('[data-action="open-table-zoom"]')?.focus({preventScroll:true});
  });
  app.querySelector('.game-menu')?.addEventListener('close',()=>app.querySelector('.game-menu-button')?.focus({preventScroll:true}));
  if(menuOpen) { app.querySelector('.game-menu').showModal(); app.querySelector('.game-menu-content').scrollTop=menuScrollTop; }
  if(zoomOpen) { openTableZoom(); app.querySelector('.board-zoom .zoom-scroll').scrollTop=zoomScrollTop; }
  const result=app.querySelector('.hand-result'),resultKey=`${gameToken}:${view.handWinner}:${view.finished}`;
  if(result && (resultOpen || shownResult!==resultKey && !menuOpen && !zoomOpen)) {
    shownResult=resultKey;result.showModal();
  }
  result?.addEventListener('close',()=>app.querySelector('[data-action="open-hand-result"], [data-action="cinquillo-next-hand"]')?.focus({preventScroll:true}));
  app.querySelector('.hand').scrollLeft = scroll;
  if(focusAction) {
    const target=[...app.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusAction && (!focusCard||el.dataset.cardKey===focusCard) && (!focusSuit||el.dataset.suit===focusSuit));
    if(target && !target.disabled && !target.hidden) target.focus({preventScroll:true});
  }
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const stock = stockOrigin || app.querySelector('.game-table').getBoundingClientRect();
    for (const [index, card] of [...app.querySelectorAll('.hand [data-card-key]')].entries()) {
      if (oldHandKeys.has(card.dataset.cardKey) || !card.animate) continue;
      const rect = card.getBoundingClientRect();
      card.animate([{transform:`translate(${stock.x+stock.width/2-rect.x}px,${stock.y+stock.height/2-rect.y}px) rotate(-10deg)`,opacity:0},{transform:'none',opacity:1}], {duration:350,delay:Math.min(index*25,250),easing:'cubic-bezier(.2,.8,.2,1)'});
    }
  }
  previousTableKeys = animateTable(app, previousTableKeys, origins, sourceSeat);
  animateSeats(app, previousSeats, view);
  previousSeats = {turnPlayer:view.turnPlayer,handSizes:{...view.handSizes},log:view.log?.at(-1)};
  previousTurn = view.turnPlayer;
}
function openTableZoom() {
  const dialog=app.querySelector('.board-zoom');
  if(!dialog || !state.view) return;
  const board=(state.gameId==='mus'?renderMusBoard(state.view):renderCinquilloBoard(state.view)).replaceAll('data-table-key=','data-zoom-key=');
  dialog.innerHTML=`<header><h2>${esc(getGame(state.gameId).label)} · ${state.gameId==='cinquillo' ? 'Todas las cartas' : 'Mesa ampliada'}</h2><button data-action="close-table-zoom">Volver</button></header><div class="zoom-scroll">${board}</div><p class="zoom-note">${state.gameId==='cinquillo' ? 'Todas las cartas jugadas, ordenadas por palo. En el tapete se muestran los dos extremos de cada escalera.' : 'Desliza la mesa para ver todas las cartas. Puedes volver a tu mano en cualquier momento.'}</p>`;
  dialog.showModal();
}
function readableLog(line) {
  for (const player of [...state.players].sort((a,b) => b.id.length - a.id.length)) {
    const id = player.id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    line = line.replace(new RegExp(`(^|[^\\w-])${id}(?=$|[^\\w-])`, 'g'), (_, prefix) => prefix + player.name);
  }
  return line;
}

function musControls(view) {
  if (view.finished) return "";
  if (view.phase === "mus") {
    if (view.turnPlayer !== state.playerId) return `<p class="helper">${esc(playerName(view.turnPlayer))} decide si hay mus.</p>`;
    return '<p class="helper">¿Quieres cambiar cartas o empezamos los lances?</p><div class="action-row"><button class="button button-cyan" data-action="mus-yes">Mus</button><button class="button button-paper" data-action="mus-no">No hay mus</button></div>';
  }
  if (view.phase === "showdown" && view.mano !== state.playerId) return `<p class="helper">Cartas a la vista. ${esc(playerName(view.mano))} iniciará la siguiente mano.</p>`;
  if (view.phase === "showdown") return '<p class="helper">Cartas a la vista. Comprueba el recuento antes de seguir.</p><button class="button button-cyan full-button" data-action="mus-next">Siguiente mano</button>';
  if (view.phase === "discard") {
    if (!view.awaitingDiscardFrom.includes(state.playerId)) return '<p class="helper">Descarte confirmado. Esperando al resto…</p>';
    return `<p class="helper">Toca las cartas que quieras cambiar; cambia al menos una carta tras pedir mus.</p><button class="button button-pink full-button" data-action="mus-discard" ${state.selected.size ? "" : "disabled"}>Confirmar descarte (${state.selected.size})</button>`;
  }
  const betting = view.betting;
  if (!betting || view.turnPlayer !== state.playerId) return `<p class="helper">Turno de ${esc(playerName(view.turnPlayer))}.</p>`;
  const team = view.players.indexOf(state.playerId) % 2 === 0 ? "A" : "B";
  const responds = betting.pendingBet && betting.pendingBet.team !== team;
  const controls = responds
    ? `<button class="button button-cyan" data-action="mus-accept">Quiero</button><button class="button button-pink" data-action="mus-reject">No quiero</button>${betting.pendingBet?.ordago ? "" : `<label class="bet-control"><input id="bet-amount" type="number" min="${Math.max(2, (betting.pendingBet?.amount || 0) + 1)}" step="1" value="${Math.max(2, (betting.pendingBet?.amount || 0) + 2)}"><button class="button button-paper" data-action="mus-bet">Subir</button></label><button class="button button-pink" data-action="mus-ordago">¡Órdago!</button>`}`
    : `<button class="button button-paper" data-action="mus-pass">Paso</button><label class="bet-control"><input id="bet-amount" type="number" min="${Math.max(2, (betting.pendingBet?.amount || 0) + 1)}" step="1" value="${Math.max(2, (betting.pendingBet?.amount || 0) + 2)}"><button class="button button-cyan" data-action="mus-bet">Envido 🍑</button></label><button class="button button-pink" data-action="mus-ordago">¡Órdago! 🍆</button>`;
  return `<p class="phase-tag">Te toca. ${betting.pendingBet ? `Envite: ${betting.pendingBet.amount}` : "¿Qué hacemos?"}</p><div class="action-row">${controls}</div>`;
}


function cinquilloControls(view) {
  if (view.finished) return "";
  if (view.handWinner) return `<p class="helper">${esc(playerName(view.handWinner))} gana la mano ${view.handNumber}. Meta: ${view.targetScore} puntos.</p><p>${view.players.map(id=>`${esc(playerName(id))}: ${view.scores[id]}`).join(' · ')}</p>${view.handWinner === state.playerId ? '<button class="button button-paper" data-action="cinquillo-next-hand">Siguiente mano</button>' : ''}`;
  if (view.turnPlayer !== state.playerId) return `<p class="helper">Turno de ${esc(playerName(view.turnPlayer))}.</p>`;
  const canPass = !view.myHand.some(card => canPlayCinquillo(view.table, card, view.ruleset));
  return `<p class="helper">Juega una carta que continúe una escalera de la mesa. Las cartas válidas brillan.</p><button class="button button-paper" data-action="cinquillo-pass" ${canPass ? "" : "disabled"}>Paso</button>`;
}

function render() {
  if (state.screen === "host-form") renderHostForm();
  else if (state.screen === "join-form") renderJoinForm();
  else if (state.screen === "lobby") renderLobby();
  else if (state.screen === "game") renderGame();
  else renderHome();
}

function resetToHome() {
  previousTableKeys = null; renderedGame = null; previousTurn = null; previousSeats = null; shownResult = null;
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
  try {
    if (action === "open-table-zoom") { openTableZoom(); return; }
    if (action === "open-game-menu") { app.querySelector('.game-menu')?.showModal(); return; }
    if (action === "parchis-zoom-open") { app.querySelector('.parchis-zoom')?.showModal(); return; }
    if (action === "parchis-zoom-close") { app.querySelector('.parchis-zoom')?.close(); return; }
    if (action === "open-hand-result") { app.querySelector('.game-menu')?.close(); app.querySelector('.hand-result')?.showModal(); return; }
    if (action === "close-hand-result") { app.querySelector('.hand-result')?.close(); return; }
    if (action === "close-game-menu") { app.querySelector('.game-menu')?.close(); return; }
    if (action === "hand-filter") {
      state.handSuit=button.dataset.suit; renderGame(); app.querySelector('.hand').scrollLeft=0;
      app.querySelector(`.hand-filters [data-suit="${state.handSuit}"]`)?.focus({preventScroll:true}); return;
    }
    if (action === "go-to-hand") { const heading=app.querySelector('.hand-heading'); heading.focus({preventScroll:true}); heading.scrollIntoView({block:'start',behavior:'instant'}); }
    else if(action === "close-table-zoom") app.querySelector('.board-zoom')?.close();
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
    } else if (action === "mus-yes") sendAction({ type: "mus", wantsMus: true });
    else if (action === "mus-no") sendAction({ type: "mus", wantsMus: false });
    else if (action === "mus-next") sendAction({ type: "next-hand" });
    else if (action === "parchis-roll") { if(beginParchisRoll(app))sendAction({ type: "roll", expectedRoll:Number(button.dataset.rollSequence) }); }
    else if (action === "parchis-move") sendAction({ type: "move", piece: Number(button.dataset.piece) });
    else if (action === "mus-pass") sendAction({ type: "pass" });
    else if (action === "mus-bet") sendAction({ type: "bet", amount: Number(document.querySelector("#bet-amount")?.value) || 2 });
    else if (action === "mus-ordago") sendAction({ type: "ordago" });
    else if (action === "mus-accept") sendAction({ type: "accept" });
    else if (action === "mus-reject") sendAction({ type: "reject" });
    else if (action === "cinquillo-next-hand") sendAction({ type: "next-hand" });
    else if (action === "cinquillo-pass") sendAction({ type: "pass" });
    else if (action === "leave-room") {
      if (state.online) void state.online.exit(); else { state.host?.close(); state.guest?.leave(); }
      resetToHome();
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Algo se torció al preparar la jugada.";
    flash(state.error);
    if (state.role === "host" && state.screen !== "game") state.screen = "lobby";
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
    for (const option of app.querySelectorAll('.game-option')) option.classList.toggle('chosen', option.contains(event.target));
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
