import {handlePokerUI,syncPokerAmounts} from './poker-controls.js';
import {renderMusScreen,openMusPanel} from './mus-table.js';
import {mountGameHelp,openGameHelp,closeGameHelp} from './game-help.js';
import {renderAvatarArtwork,CHARACTER_NAMES,renderCharacterButton,renderCharacterDialog,validCharacter,savedCharacter,saveCharacter} from './avatar-art.js';
import {renderGameChoices,updateGamePicker,availableGames} from './game-picker.js';
import {renderCatalogGame,handleCatalogAction} from './catalog-games.js';
import {beginParchisRoll} from './parchis-dice.js';
import {prepareCardPaint,restoreCardPaint,prepareAvatarPaint,restoreAvatarPaint} from './card-paint.js';
import {TurnSequence,isTurnAction} from './turn-sequence.js';
import { getGame, listGames, getGamePlan } from "./game-core/index.js";
import { LocalHostSession } from "./local-session.js";
import { arrangeCinquilloScreen } from './cinquillo-screen.js';
import { arrangeMusScreen } from './mus-screen.js';
import { renderParchisScreen } from './parchis-board.js';
import { parseRoomCode } from "./room-code.js";
import { activateHost, activateDevelopmentAdmin, activatePublicDevelopmentAdmin, readHostAccess, recoverHostPassword, leaveHostAccount, cachedHostAccess } from './host-access.js';
import { distributionConfig } from './distribution-config.js';

import { cardKey, renderHandCard, renderSeats, renderCinquilloBoard, renderMusBoard, sortedHand, animateTable, animateSeats,mascotForSeat } from "./table-view.js";

const LAN = window.ELTETO_LAN;
const isLocalRoom = () => Boolean(LAN && state.inviteMode !== "online");
const OPEN_LAN_HOST = Boolean(LAN?.hostKey && window.EltetoActivation?.isOpenAccess?.());
const GUEST = Boolean(window.ELTETO_GUEST || (LAN && !LAN.hostKey) || parseRoomCode(location.search));
let accessLogin = false, accessBusy = false;
let activationCode = new URLSearchParams(location.hash.slice(1)).get('activate') || '';
let adminCode = new URLSearchParams(location.hash.slice(1)).get('admin') || '';
if (activationCode || adminCode) history.replaceState(null, '', location.pathname + location.search);
const app = document.querySelector("#app");
const toastEl = document.querySelector("#toast");
const state = {
  roomMode:"lan", musTarget:40, character: savedCharacter(), screen: "home", role: null, name: "", roomName: "", gameId: "", playerId: null,
  players: [], view: null, host: null, online: null, roomCode: "", offerCode: "", joinCode: "",
  selected: new Set(), error: "", started: false, inviteMode: "local", handSuit: 'all',
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
const turnSequence=new TurnSequence({
 apply(change){
  state.players=change.players||state.players;state.gameId=change.gameId||state.gameId;state.playerId=change.playerId||state.playerId;
  state.view=change.view;state.error='';state.screen='game';render();
 },
 refresh(){if(state.screen==='game')renderGame();},
 phaseChanged(){if(state.screen==='game')turnSequence.decorate(app,state.playerId,playerName);},
 reduced:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,
 hidden:()=>document.visibilityState==='hidden'
});
function receiveGame(change){if(state.screen==='poker-break'){state.view=change.view;state.players=change.players||state.players;render();return;}turnSequence.receive({...change,gameId:change.gameId||state.gameId,playerId:change.playerId||state.playerId,players:change.players||state.players});}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')turnSequence.flush();});

function renderProfile(){
 state.screen='profile';
 app.innerHTML=`<section class="menu-shell profile-shell"><div class="menu-wrap profile-wrap"><header class="profile-brand"><div class="menu-logo" role="img" aria-label="ELTETO"></div></header><section class="menu-setup profile-setup" aria-labelledby="profile-title"><h1 id="profile-title">¿Quién se sienta a la mesa?</h1><div class="profile-fields"><div class="profile-field"><label class="field-label" for="profile-name">Tu nombre de guerra</label><input class="text-field" id="profile-name" maxlength="24" autocomplete="nickname" placeholder="Cómo te llaman" value="${esc(state.name)}"></div><div class="profile-field">${renderCharacterButton(state.character)}</div></div><div class="profile-entry"><button class="menu-button menu-secondary full-button" data-action="profile-confirm">Guardar <span aria-hidden="true">↗</span></button><p class="helper">Usaremos este nombre de guerra y avatar en tus partidas.</p></div></section></div></section>`;
}
// Embers: left %, delay s, size px, duration s, sideways drift px.
const FUEGOTE_EMBERS = [[18,0,7,2.6,-14],[30,1.1,5,3.1,-6],[44,.5,8,2.3,4],[56,1.7,5,2.9,-4],[67,.3,6,2.5,10],[78,1.3,7,3.3,16],[38,2.1,4,2.7,-10],[62,2.4,4,3,8]];
function renderFuegote() {
  const embers = FUEGOTE_EMBERS.map(([x, delay, size, time, drift]) => `<i style="--x:${x}%;--delay:${delay}s;--size:${size}px;--time:${time}s;--drift:${drift}px"></i>`).join('');
  return `<button class="fuegote-button" data-action="open-host" aria-label="Que se haga el fuegote"><span class="fuegote-heat" aria-hidden="true"></span>
    <svg class="fuegote-art" viewBox="0 0 840 846" aria-hidden="true" focusable="false"><defs>
      <filter id="fuegote-fire" x="-6%" y="-6%" width="112%" height="112%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.005 0.013" numOctaves="1" seed="7"><animate attributeName="baseFrequency" values="0.005 0.013;0.0065 0.018;0.0045 0.015;0.005 0.013" dur="2.4s" repeatCount="indefinite"/></feTurbulence>
        <feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="G"><animate attributeName="scale" values="22;40;28;36;22" dur="1.7s" repeatCount="indefinite"/></feDisplacementMap>
      </filter>
      <mask id="fuegote-letters" maskUnits="userSpaceOnUse" x="0" y="0" width="840" height="846"><image href="./assets/fuegote-text-mask.png" width="840" height="846" preserveAspectRatio="none"/></mask>
    </defs><image class="fuegote-fire" href="./assets/fuegote-fire.webp" width="840" height="846"/><image href="./assets/fuegote.webp" width="840" height="846" mask="url(#fuegote-letters)"/></svg>
    <span class="fuegote-embers" aria-hidden="true">${embers}</span></button>`;
}
function renderHome() {
  closeGameHelp();
  if (GUEST) { renderJoinForm(); return; }
  state.screen = "home";
  app.innerHTML = `<section class="menu-shell menu-home">
    <div class="menu-wrap">
      <div class="menu-hero">
        <div class="menu-art"><div class="menu-logo" role="img" aria-label="Elteto: personajes, dados y coche morado entre palmeras de neón"></div></div>
        <div class="menu-intro"><h1>Se viene<br> <span>PIQUE!</span></h1>
          <nav class="menu-actions" aria-label="Menú principal">${renderFuegote()}</nav>

        </div>
      </div>
      <button class="text-button profile-edit" data-action="edit-profile">Mi nombre de guerra y avatar</button><footer class="menu-credit">By Fercho&amp;PAS</footer>
    </div>
  </section>`;
}

function renderAccess() {
  state.screen = 'access';
  app.innerHTML = `<section class="menu-shell"><div class="menu-wrap"><header class="menu-header"><button class="menu-back" data-action="back">← <span>Volver</span></button><span class="menu-brand">ELTETO<span>✦</span></span></header><section class="menu-setup access-panel">
    <p class="menu-kicker">TU INVITACIÓN</p><h1>${accessLogin ? 'Vuelve a tu mesa' : 'Activa Elteto'}<span>.</span></h1>
    <form id="access-form"><label class="field-label" for="access-email">Correo</label><input class="text-field" id="access-email" type="email" autocomplete="username" required value="${esc(cachedHostAccess()?.email || '')}">
    <label class="field-label" for="access-password">Contraseña</label><input class="text-field" id="access-password" type="password" minlength="${accessLogin ? 6 : 8}" autocomplete="${accessLogin ? 'current-password' : 'new-password'}" required>
    ${accessLogin ? '' : `<label class="field-label" for="activation-code">Código de invitación</label><input class="text-field activation-input" id="activation-code" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="200" required placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" value="${esc(activationCode)}">`}
    <p class="error-message" id="access-error" role="alert"></p><button type="submit" class="menu-button menu-primary menu-create">${accessLogin ? 'Entrar' : 'Activar acceso'} <span aria-hidden="true">↗</span></button></form>
    ${!LAN && distributionConfig.developmentAdminEnabled ? '<button class="text-button access-switch" data-action="development-admin">Entrar como administrador</button>' : ''}
    <button class="text-button access-switch" data-action="access-switch">${accessLogin ? 'Tengo un código' : 'Ya tengo acceso'}</button>
    ${accessLogin ? '<button class="text-button access-switch" data-action="access-recover">Recuperar contraseña</button>' : '<p class="helper">Una invitación, una cuenta. Guarda tu acceso para cambiar de móvil.</p>'}
  </section></div></section>`;
}
function renderInstallation() {
  state.screen = 'installation';
  app.innerHTML = `<section class="menu-shell"><div class="menu-wrap"><header class="menu-header"><span class="menu-brand">ELTETO<span>✦</span></span><button class="text-button" data-action="access-logout">Cerrar sesión</button></header><section class="menu-setup access-panel">
    <p class="menu-kicker">YA ESTÁS DENTRO</p><h1>Tu mesa está lista<span>.</span></h1>
    <button class="menu-button menu-primary" data-action="open-host">Crear partida <span aria-hidden="true">↗</span></button>
    ${LAN ? '<p class="helper">Puedes abrir mesas locales sin internet. Para recuperar tu cuenta online, entra aquí.</p><button class="button button-paper" data-action="online-access">Mi cuenta online</button>' : `<div class="install-options"><h2>En tu móvil</h2>
    ${distributionConfig.androidDownloadUrl ? `<a class="menu-button menu-secondary" href="${esc(distributionConfig.androidDownloadUrl)}">Descargar Android <span aria-hidden="true">↓</span></a>` : '<p class="helper">Android: usa la web o la APK que te entregue quien te invitó. En la APK, entra con esta misma cuenta.</p>'}
    <p class="helper">iPhone: abre esta web en Safari → Compartir → Añadir a pantalla de inicio. Si te pide entrar, usa esta misma cuenta.</p></div>`}
  </section></div></section>`;
}
function endGuestRoom(message = 'La sala ha terminado.') {
  closeGameHelp();
  try{sessionStorage.removeItem(`elteto.joined.${state.roomCode}`);if(LAN)sessionStorage.removeItem(`elteto.lan.${location.host}.${state.roomCode}`);}catch{}
  turnSequence.reset();
  const session = state.online;
  Object.assign(state, { screen: 'guest-ended', view: null, players: [], host: null, online: null, selected: new Set(), offerCode: '', roomCode: '' });
  session?.teardown?.();
  history.replaceState(null, '', location.pathname);
  renderGuestEnded(message);
}
function renderGuestEnded(message = 'La sala ha terminado.') {
  app.innerHTML = `<section class="menu-shell"><div class="menu-wrap"><section class="menu-setup access-panel"><p class="menu-kicker">MESA CERRADA</p><h1>Hasta la próxima<span>.</span></h1><p class="helper">${esc(message)}</p><p class="helper">Puedes cerrar esta pestaña. Para volver a jugar, pide una nueva invitación al anfitrión.</p></section></div></section>`;
}

function playerCountLabel(game) {
  const counts=getGamePlan(game.id).players.filter(n=>n<=game.maxPlayers);
  return counts.length===1?String(counts[0]):counts.at(-1)-counts[0]+1===counts.length?`${counts[0]}–${counts.at(-1)}`:counts.join(', ');
}

function renderHostForm() {
  if (GUEST) return renderJoinForm();
  state.screen = "host-form";
  if (!availableGames(listGames()).some(game=>game.id===state.gameId)) state.gameId = "";
  const games = renderGameChoices(availableGames(listGames()),state.gameId,playerCountLabel);
  app.innerHTML = `<section class="menu-shell"><div class="menu-wrap"><header class="menu-header"><button class="menu-back" data-action="back">← <span>Volver</span></button><a class="menu-brand" href="./" data-action="home">ELTETO<span>✦</span></a><button class="text-button" data-action="access-install">Mi acceso</button></header><section class="menu-setup" aria-labelledby="setup-title">
    <p class="menu-kicker">TÚ PONES LA MESA</p><h1 id="setup-title">Crear partida<span>.</span></h1>
    <div class="menu-fields"><div><label class="field-label" for="host-name">Tu nombre de guerra</label><div class="name-character-field"><input class="text-field" id="host-name" maxlength="24" autocomplete="nickname" placeholder="Cómo te llaman" value="${esc(state.name)}">${renderCharacterButton(state.character)}</div></div>
    <div><label class="field-label" for="room-name">Nombre de la sala <span>opcional</span></label><input class="text-field" id="room-name" maxlength="30" placeholder="La de siempre" value="${esc(state.roomName)}"></div></div>
    ${LAN?.hostKey ? `<fieldset class="menu-game-fieldset room-mode"><legend>Cómo vais a jugar</legend><label><input type="radio" name="room-mode" value="lan" ${state.roomMode==='lan'?'checked':''}><span><strong>Sin internet</strong><small>Misma Wi-Fi o hotspot · QR local</small></span></label><label><input type="radio" name="room-mode" value="online" ${state.roomMode==='online'?'checked':''}><span><strong>Con internet</strong><small>Desde cualquier lugar · enlace y QR</small></span></label></fieldset>` : ''}
    <fieldset class="menu-game-fieldset"><legend>Elige el juego</legend>${games}</fieldset>
    ${state.error ? `<p class="error-message" role="alert">${esc(state.error)}</p>` : ""}
    <button class="menu-button menu-primary menu-create" data-action="create-room">Crear sala <span aria-hidden="true">↗</span></button>
  </section></div></section>`;
  updateGamePicker(app);
}

function renderJoinForm() {
  state.screen = "join-form";
  const code = parseRoomCode(state.offerCode);
  app.innerHTML = `<section class="menu-shell"><div class="menu-wrap"><header class="menu-header"><span class="menu-brand">ELTETO<span>✦</span></span></header><section class="menu-setup" aria-labelledby="join-title">
    <p class="menu-kicker">TE GUARDARON SITIO</p><h1 id="join-title">Entra en la sala<span>.</span></h1>
    ${code ? `<p class="helper">Sala <strong>${esc(code)}</strong>. Entras como invitado, sin instalar nada.</p>` : `<p class="helper">Escanea con la cámara del móvil el QR del anfitrión o escribe el código de su sala.</p>
    <label class="field-label" for="join-code">Código de la sala</label><input class="text-field join-code" id="join-code" maxlength="8" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD2345" value="${esc(state.joinCode || "")}">`}
    <label class="field-label" for="join-name">Tu nombre de guerra</label><div class="name-character-field"><input class="text-field" id="join-name" maxlength="24" autocomplete="nickname" placeholder="Donde las dan, las toman" value="${esc(state.name)}">${renderCharacterButton(state.character)}</div>
    ${state.error ? `<p class="error-message" role="alert">${esc(state.error)}</p>` : ''}
    <button class="menu-button menu-primary menu-create" data-action="join-room">Entrar en la sala <span aria-hidden="true">→</span></button>
  </section></div></section>`;
}

function invitePanel(code) {
  if (!code) return "";
  return `<section class="code-card compact-invite" aria-label="Invitación a la sala">
    <canvas class="invite-qr" aria-label="Código QR de la sala"></canvas>
    <div class="compact-invite-tools"><strong>Escanea para entrar</strong><small>${isLocalRoom() ? "Misma Wi-Fi" : "Con internet"}</small><div class="code-actions"><button class="button button-small button-dark" data-action="copy-code">Copiar enlace</button><button class="button button-small button-paper" data-action="share-code">Compartir</button></div>
    <details class="invite-link"><summary>Ver enlace</summary><textarea class="code-field code-output" rows="2" readonly spellcheck="false">${esc(code)}</textarea></details></div>
  </section>`;
}

function renderLobby() {
 delete app.pokerSnapshot;
  state.screen = "lobby";
  const game = state.gameId ? getGame(state.gameId) : null;
  const host = state.role === "host";
  const connected = state.role === "client" && state.players.some((player) => player.id === state.playerId);
  const rosterIds=state.players.map(player=>player.id),characters=Object.fromEntries(state.players.map(player=>[player.id,player.character]));
  const rows = state.players.map((player, index) => `<div class="player-row"><span class="lobby-character" role="img" aria-label="${CHARACTER_NAMES[mascotForSeat(rosterIds,index,characters)]}">${renderAvatarArtwork(mascotForSeat(rosterIds,index,characters),"lobby")}</span><strong>${esc(player.name)}${state.gameId==='mus'?`<small class="lobby-mus-team">Pareja ${index%2?'azul':'roja'}</small>`:''}</strong>${player.isHost ? '<span class="host-pill">ANFITRIÓN</span>' : `<span class="ready-pill">${player.isBot ? "IA" : player.away ? "SIN SEÑAL" : "EN LA MESA"}</span>`}${host && !player.isHost && (state.online || player.isBot) ? `<button class="text-button" data-action="kick-player" data-player-id="${esc(player.id)}" aria-label="Expulsar a ${esc(player.name)}"><span aria-hidden="true">×</span></button>` : ""}</div>`).join("");
  const enoughPlayers = game && state.players.length <= game.maxPlayers && getGamePlan(game.id).players.includes(state.players.length);
  const connectionTools = host
    ? `<div class="invite-grid">
         ${state.online ? "" : '<button class="button button-cyan" data-action="new-invite">Invitar con internet</button>'}
         ${state.online && state.roomCode ? `<p class="helper">Código de la sala: <strong class="room-code">${esc(state.roomCode)}</strong></p>` : ""}
         ${invitePanel(state.offerCode)}
       </div>`
    : `<div class="connection-status ${connected ? "connected" : ""}">${connected ? (isLocalRoom() ? "Conectado a la mesa local. Ya estás en la mesa." : "Conectado a la sala. Ya estás en la mesa.") : "Conectando con el anfitrión… No cierres esta página."}</div>`;
  const startButton = host
    ? `<button class="menu-button menu-primary menu-create" data-action="start-game" ${!enoughPlayers ? "disabled" : ""}>${enoughPlayers ? 'Empezar partida <span aria-hidden="true">↗</span>' : `Se necesitan ${game ? playerCountLabel(game) : "más"} jugadores`}</button>`
    : "";
  app.innerHTML = `<section class="menu-shell menu-room-shell"><div class="menu-wrap"><header class="menu-header"><button class="menu-back" data-action="leave-room">← <span>Salir de la sala</span></button><a class="menu-brand" href="./" data-action="home">ELTETO<span>✦</span></a></header><section class="menu-setup menu-lobby" aria-labelledby="lobby-title">
    <p class="menu-kicker">${host ? "SALA CREADA" : "TU SALA"}</p>
    <h1 id="lobby-title">${esc(state.roomName || game?.label || "Sala")}<span>.</span></h1>
    ${game ? `<p class="lobby-game">${esc(game.label)} <span>· ${playerCountLabel(game)} jugadores</span></p>` : ''}
    <div class="lobby-grid"><section class="lobby-players" aria-labelledby="players-title"><div class="players-head"><h2 id="players-title">En la mesa</h2><span>${state.players.length}${game ? ` / ${game.maxPlayers}` : ""}</span></div>
    <div class="player-list">${rows || '<div class="empty-seat">Todavía no se ha sentado nadie. Dale al código.</div>'}</div>
    ${state.error ? `<p class="error-message">${esc(state.error)}</p>` : ""}
    ${host && game && game.id!=='mus' && state.players.length < game.maxPlayers ? '<button class="button button-paper full-button" data-action="fill-bots">Completar mesa con IA</button><p class="helper">La IA ocupará las plazas libres. Puedes quitarla antes de empezar.</p>' : ''}
    ${state.gameId==='mus'?`<section class="mus-setup" aria-label="Configuración de Mus"><p>4 jugadores · parejas enfrentadas</p><h3>¿A CUÁNTOS TANTOS JUGAMOS?</h3>${host?`<div>${[30,40].map(n=>`<button data-action="mus-target" data-target="${n}" aria-pressed="${state.musTarget===n}">${n}</button>`).join('')}</div>`:`<p>El anfitrión elige 30 o 40 antes de repartir. Verás el objetivo al comenzar.</p>`}<p>Una partida · 8 reyes y 8 ases · sin vacas</p></section>`:''}${startButton}
    </section><section class="lobby-invite" aria-labelledby="invite-title"><h2 id="invite-title">${host ? "Invita a la mesa" : "Tu conexión"}</h2>
    <p class="helper ${host && state.online && !isLocalRoom() ? 'compact-help' : ''}">${host ? (state.online ? (isLocalRoom() ? "Comparte el QR o enlace local. Todos debéis estar en la misma Wi-Fi o hotspot. Mantén Elteto abierto en este Android." : "Pásales el enlace, el QR o el código de la sala. Todos necesitáis internet.") : "Pulsa «Invitar con internet» y enséñales el QR: lo escanean con la cámara del móvil.") : (isLocalRoom() ? "Mesa local: deja esta página abierta. Si pierdes la señal, intentaremos recuperar tu plaza." : "Deja Elteto abierto: la sala se mantiene mientras el anfitrión siga conectado.")}</p>
    <div class="connection-box">${connectionTools}</div>
    </section></div>
  </section></div></section>`;
  mountGameHelp(app,state.gameId);
  const qr = app.querySelector(".invite-qr");
  if (qr) {
    try { window.CONTINUUM.QrEncode.draw(qr, state.offerCode); }
    catch (error) { console.warn("No se pudo dibujar el código QR.", error); }
  }
}

let previousTableKeys = null;
let previousTurn = null;
let renderedGame = null;
let previousSeats = null;
let shownResult = null;
function renderGame() {
  app.pokerMotionFinished=()=>turnSequence.decorate(app,state.playerId,playerName);
  if(!turnSequence.busy&&state.view)turnSequence.adopt({view:state.view,gameId:state.gameId,playerId:state.playerId});
  const paint=prepareCardPaint(app),avatars=prepareAvatarPaint(app);renderGameContents();mountGameHelp(app,state.gameId);restoreCardPaint(app,paint);restoreAvatarPaint(app,avatars);turnSequence.decorate(app,state.playerId,playerName);
}
function renderGameContents() {
  state.screen = "game";
  const game = getGame(state.gameId), view = state.view ? {...state.view,characters:Object.fromEntries(state.players.map(p=>[p.id,p.character])),away:Object.fromEntries(state.players.map(p=>[p.id,Boolean(p.away)]))} : null;
  if (!view) { app.innerHTML = `${header()}<section class="panel"><p>Esperando el estado de la partida…</p></section>`; return; }
  if(state.gameId==='mus'&&view.version===2){renderMusScreen(app,view,state.playerId,playerName,state.selected,state.error);return;}
  if(!['cinquillo','mus','parchis'].includes(state.gameId)){renderCatalogGame(app,view,state.playerId,playerName,state.error);return;}
  if(state.gameId==='parchis'){renderParchisScreen(app,view,state.playerId,playerName,state.error);return;}
  const origins = new Map([...app.querySelectorAll('.hand [data-card-key]')].map(el => [el.dataset.cardKey, el.getBoundingClientRect()]));
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
    const canInteract = state.gameId === 'cinquillo' && !view.finished && !view.handWinner && myTurn;
    return renderHandCard(card, {selected: selecting && state.selected.has(cardKey(card)), selectable: selecting, disabled: !selecting && !canInteract, tilt:(index-(view.myHand.length-1)/2)*2.4});
  }).join('');
  const controls = state.gameId === 'mus' ? musControls(view) : cinquilloControls(view);
  const table = state.gameId === 'mus' ? renderMusBoard(view) : renderCinquilloBoard(view);
  const hint = view.finished ? winner : selecting ? 'Selecciona tu descarte' : myTurn ? 'Tu turno' : view.phase === 'discard' ? 'Esperando descartes' : `Turno de ${playerName(view.turnPlayer)}`;
  app.innerHTML = `${header()}<section class="game-page" data-game="${state.gameId}">
    <div class="game-top"><span class="game-ribbon">${esc(game.label)} · ${state.gameId === 'mus' ? (view.ruleset === 'eight-kings' ? '8 reyes y 8 ases' : '4 reyes') : (view.ruleset === 'legacy-french-52' ? '52 cartas · mesa anterior' : '40 cartas españolas')}</span><button class="text-button" data-action="leave-room">Salir de la partida</button></div>
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
  if(result && (resultOpen || !turnSequence.busy && shownResult!==resultKey && !menuOpen && !zoomOpen)) {
    shownResult=resultKey;result.showModal();
  }
  result?.addEventListener('close',()=>app.querySelector('[data-action="open-hand-result"], [data-action="cinquillo-next-hand"]')?.focus({preventScroll:true}));
  app.querySelector('.hand').scrollLeft = scroll;
  if(focusAction) {
    const target=[...app.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusAction && (!focusCard||el.dataset.cardKey===focusCard) && (!focusSuit||el.dataset.suit===focusSuit));
    if(target && !target.disabled && !target.hidden) target.focus({preventScroll:true});
  }
  // Private hand faces stay in the dock, including on the initial deal.
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
  return `<p class="helper">Tu turno.</p><button class="button button-paper" data-action="cinquillo-pass">Paso</button>`;
}

async function takePokerBreak(){
 if(state.gameId!=='texas-holdem'||!state.view||state.view.finished)return false;
 await (state.online||state.host)?.setSittingOut(true);
 turnSequence.reset();state.screen='poker-break';render();return true;
}
function renderPokerBreak(){
 const chips=state.view?.chips?.[state.playerId]||0;
 app.innerHTML=`<section class="menu-shell"><div class="menu-wrap"><header class="menu-header"><span class="menu-brand">ELTETO ✦</span></header><section class="menu-setup"><h1>Tu sitio sigue reservado</h1><p>Conservas tu personaje y tus ${chips.toLocaleString('es-ES')} fichas. Las ciegas siguen contando mientras estás ausente.</p><p>Si te toca y no vuelves en 12 segundos, pasarás cuando sea gratis o te retirarás si hay una apuesta. Si todos están ausentes, se espera.</p><button class="button button-cyan full-button" data-action="poker-return">Volver a la partida</button><button class="button full-button" data-action="leave-room">Salir de la partida</button></section></div></section>`;
}
function render() {
  if(state.screen==='profile')renderProfile();
  else if(state.screen==='poker-break')renderPokerBreak();
  else if (state.screen === 'access') renderAccess();
  else if (state.screen === 'installation') renderInstallation();
  else if (state.screen === 'guest-ended') renderGuestEnded();
  else if (state.screen === "host-form") renderHostForm();
  else if (state.screen === "join-form") renderJoinForm();
  else if (state.screen === "lobby") renderLobby();
  else if (state.screen === "game") renderGame();
  else renderHome();
}

function resetToHome() {
  delete app.pokerSnapshot;turnSequence.reset();
  if (GUEST) { endGuestRoom(); return; }
  previousTableKeys = null; renderedGame = null; previousTurn = null; previousSeats = null; shownResult = null;
  Object.assign(state, { role: null, players: [], view: null, host: null, online: null, roomCode: "", offerCode: "", selected: new Set(), error: "", screen: "home" });
  renderHome();
}

function onHostChange(change) {
  if (change.kind === "lobby") {
    state.players = change.players;
    state.gameId = change.gameId;
  } else if (change.kind === "game") {
    receiveGame(change);return;
  } else if (change.kind === "error") {
    state.error = change.message;
    flash(change.message);
  }
  render();
}

async function copyCode() {
  const value = state.offerCode;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    flash("Enlace copiado. Envíalo o muéstralo para escanear.");
  } catch {
    const field = document.querySelector(".code-output");
    field?.focus();
    field?.select();
    flash("Selecciona todo el enlace y cópialo.");
  }
}
async function shareCode() {
  const value = state.offerCode;
  if (!value) return;
  try {
    if (navigator.share) await navigator.share({ title: "Invitación a Elteto", url: value });
    else await copyCode();
  } catch (error) {
    if (error?.name !== "AbortError") flash("No se pudo abrir la hoja de compartir. Prueba a copiar el enlace.");
  }
}

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  if((turnSequence.busy||app.querySelector('.catalog-screen')?.dataset.motionBusy==='true')&&isTurnAction(action))return;
  try {
    if(action==='profile-confirm'){
      const name=app.querySelector('#profile-name').value.trim();if(!name){flash('Escribe tu nombre para entrar.');return;}
      state.name=name;saveCharacter(state.character);try{localStorage.setItem('elteto.playerName',name);localStorage.setItem('elteto.profileReady','1');}catch{}
      startApplication();return;
    }
    if(action==='edit-profile'){renderProfile();return;}
    if(action==='open-mus-panel'){app.querySelector('.game-menu')?.close();openMusPanel(app,button.dataset.kind);return;}
    if(action==='close-mus-panel'){app.querySelector('.mus-detail')?.close();return;}
    if(action==='mus-bet-less'||action==='mus-bet-more'){const input=app.querySelector('#bet-amount');input.value=String(Math.max(Number(input.min),Math.min(Number(input.max),Number(input.value)+(action==='mus-bet-more'?1:-1))));return;}
    if(action==='mus-target'){state.musTarget=Number(button.dataset.target);app.querySelectorAll('[data-action=mus-target]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.target)===state.musTarget)));return;}
    if(action==='open-game-help'){event.preventDefault();await openGameHelp(state.gameId,state.view);return;}
    if (action === 'choose-character') {
      app.insertAdjacentHTML('beforeend',renderCharacterDialog(state.character));
      const dialog=app.querySelector('.character-dialog');
      dialog.addEventListener('close',()=>{dialog.remove();app.querySelector('.character-picker-button')?.focus();},{once:true});
      dialog.showModal();return;
    }
    if (action === 'close-character-picker') {app.querySelector('.character-dialog')?.close();return;}
    if (action === 'select-character') {
      const character=Number(button.dataset.character);if(!validCharacter(character))return;
      state.character=character;saveCharacter(character);
      app.querySelector('.character-picker-button').outerHTML=renderCharacterButton(character);
      app.querySelector('.character-dialog').close();return;
    }
    if(state.view?.boardKind==='poker'&&handlePokerUI(app,button,state.view,sendAction))return;
    if(action.startsWith("catalog-") && handleCatalogAction(app,button,state.view,sendAction,renderGame))return;
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
    else if (action === 'development-admin') {
      if (GUEST || accessBusy) return;
      accessBusy = true;
      try { await activatePublicDevelopmentAdmin(); renderHostForm(); }
      finally { accessBusy = false; }
    }
    else if (action === 'access-switch') { accessLogin = !accessLogin; renderAccess(); }
    else if (action === 'access-install') { renderInstallation(); }
    else if (action === 'online-access') { accessLogin = true; renderAccess(); }
    else if (action === 'access-logout') { await leaveHostAccount(); renderHome(); }
    else if (action === 'access-recover') { const email = app.querySelector('#access-email').value; if (!email) throw new Error('Escribe tu correo.'); await recoverHostPassword(email); flash('Si tienes cuenta, recibirás un correo para recuperar el acceso.'); }
    else if (action === "open-host") {
      if (GUEST) throw new Error('Esta invitación solo permite entrar en la sala.');
      state.screen = "host-form"; state.gameId = state.gameId || ""; render();
    }
    else if (action === "home" || action === "back") {
      event.preventDefault();
      if (state.online) await state.online.exit(); else state.host?.close();
      if (GUEST && state.role === 'client') endGuestRoom(); else resetToHome();
    }
    else if (action === "create-room") {
      if (GUEST) throw new Error('Esta invitación solo permite entrar en la sala.');
      const gameId = document.querySelector('input[name="game"]:checked')?.value;
      const name = document.querySelector("#host-name")?.value.trim();
      const roomName = document.querySelector("#room-name")?.value.trim();
      if (!name || !availableGames(listGames()).some(game=>game.id===gameId)) throw new Error("Elige un nombre y un juego para abrir la mesa.");
      state.name = name; state.roomName = roomName || `Partida de ${name}`; state.gameId = gameId; state.role = "host"; state.playerId = "host"; state.error = "";
      state.roomMode = document.querySelector('input[name="room-mode"]:checked')?.value || "lan";
      if (LAN && state.roomMode === "online") {
        await openOnlineRoom();
        return;
      }
      if (LAN) {
        state.inviteMode = "lan";
        const { LanSession } = await import("./lan-session.js");
        const session = await LanSession.create({gameId, hostName:name, character:state.character, roomName:state.roomName}, onOnlineChange);
        Object.assign(state, {host:session,online:session,inviteMode:"lan",roomCode:session.roomCode,offerCode:session.inviteUrl});
        renderLobby(); return;
      }
      state.host = new LocalHostSession(gameId, name, state.roomName, onHostChange, state.character);
      state.inviteMode = "local"; state.offerCode = "";
      state.screen = "lobby"; renderLobby();
    } else if (action === "join-room") {
      const roomCode = parseRoomCode(state.offerCode) || parseRoomCode(state.joinCode);
      if (!roomCode) throw new Error("Escanea el QR del anfitrión o escribe el código de 8 letras de su sala.");
      await beginOnlineJoin(roomCode, document.querySelector("#join-name")?.value.trim() || "Invitado");
    } else if (action === "new-invite") {
      await openOnlineRoom();
      flash("Sala con internet lista. Comparte el enlace, el QR o el código.");
    }
    else if (action === "copy-code") await copyCode();
    else if (action === "share-code") await shareCode();
    else if (action === "start-game") {
      await (state.online || state.host).startGame(undefined,{targetScore:state.musTarget});
      state.error = "";
      render();
    } else if (action === "fill-bots") {
      await (state.online || state.host).fillWithBots();
    } else if (action === "kick-player") {
      await (state.online || state.host).removePlayer(button.dataset.playerId);
    } else if (action === "play-card") {
      const key = button.dataset.cardKey;
      if (state.gameId === "mus") {
        if (state.selected.has(key)) state.selected.delete(key); else state.selected.add(key);
        renderGame();
      } else {
        const card = state.view.myHand.find((item) => `${item.suit}:${item.rank}` === key);
        if (card) sendAction({ type: "play", card });
      }
    } else if(action==="mus-declare-pairs")sendAction({type:"declare-pairs",has:button.dataset.has==="true"});
    else if(action==="mus-declare-juego")sendAction({type:"declare-juego",has:button.dataset.has==="true"});
    else if (action === "mus-discard") {
      const cards = state.view.myHand.filter((card) => state.selected.has(`${card.suit}:${card.rank}`));
      sendAction({ type: "discard", cards });
      state.selected.clear();
    } else if (action === "mus-yes") sendAction({ type: "mus", wantsMus: true });
    else if (action === "mus-no") sendAction({ type: "mus", wantsMus: false });
    else if (action === "mus-next") sendAction({ type: "next-hand" });
    else if (action === "parchis-roll") { if(beginParchisRoll(app))sendAction({ type: "roll", expectedRoll:Number(button.dataset.rollSequence) }); }
    else if (action === "parchis-move") sendAction({ type: "move", piece: Number(button.dataset.piece) });
    else if (action === "mus-pass") sendAction({ type: "pass" });
    else if (action === "mus-bet") sendAction({ type: "bet", amount: Number(document.querySelector("#bet-amount")?.value) });
    else if (action === "mus-ordago") sendAction({ type: "ordago" });
    else if (action === "mus-accept") sendAction({ type: "accept" });
    else if (action === "mus-reject") sendAction({ type: "reject" });
    else if (action === "cinquillo-next-hand") sendAction({ type: "next-hand" });
    else if (action === "cinquillo-pass") sendAction({ type: "pass" });
    else if(action==='poker-return'){
      await (state.online||state.host)?.setSittingOut(false);
      state.screen='game';state.error='';render();
    }
    else if (action === "poker-break") { await takePokerBreak(); }
    else if (action === "leave-room") {
      if (state.online) await state.online.exit(); else state.host?.close();
      resetToHome();
    }
  } catch (error) {
    state.error = error instanceof Error ? error.message : "Algo se torció al preparar la jugada.";
    flash(state.error);
    if (action === "create-room" && !state.online && !state.host) { state.role = null; state.screen = "host-form"; }
    else if (state.role === "host" && state.screen !== "game") state.screen = "lobby";
    render();
  }
});

app.addEventListener("input", (event) => {
  if(event.target.matches('[data-poker-range]')){const input=app.querySelector('#'+event.target.dataset.ref);input.value=event.target.value;syncPokerAmounts(app,state.view);return;}
  if(event.target.matches('[data-poker-amount]')){syncPokerAmounts(app,state.view,false);return;}
  if (event.target.matches("#profile-name")) state.name=event.target.value;
  else if (event.target.matches("#host-name")) state.name = event.target.value;
  else if (event.target.matches("#join-name")) state.name = event.target.value;
  else if (event.target.matches("#join-code")) state.joinCode = event.target.value;
  else if (event.target.matches("#room-name")) state.roomName = event.target.value;
});

app.addEventListener("change", (event) => {
  if (event.target.matches('input[name="room-mode"]')) state.roomMode = event.target.value;
  if (event.target.matches('input[name="game"]')) {
    state.gameId = event.target.value;
    updateGamePicker(app);
    event.target.closest("details").open = false;
    event.target.closest("details").querySelector("summary").focus();
  }
});


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
    if (change.kind === "game") { receiveGame(change);return; }
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
    if (state.role === 'client' || GUEST) endGuestRoom(change.message); else resetToHome();
    return;
  }
  render();
}
async function openOnlineRoom() {
  if (state.online) { renderLobby(); return; }
  if (!cachedHostAccess()) {
    if (distributionConfig.developmentAdminEnabled) await activatePublicDevelopmentAdmin();
    else if (LAN?.hostKey || !(await readHostAccess())) throw new Error('Activa tu acceso online desde «Mi acceso».');
  }
  const { OnlineSession } = await import("./online-room.js");
  state.inviteMode = "online";
  const session = await OnlineSession.create({ gameId: state.gameId, roomName: state.roomName, hostName: state.name, character: state.character, fillWithAI: Boolean(state.host?.bots?.length) }, onOnlineChange);
  state.host?.close();
  Object.assign(state, { host: session, online: session, role: "host", playerId: session.playerId, inviteMode: "online", roomCode: session.roomCode, offerCode: session.inviteUrl, error: "" });
  renderLobby();
}
async function beginOnlineJoin(code, name) {
  state.name = name || "Invitado";
  try { localStorage.setItem("elteto.playerName", state.name); } catch {}
  Object.assign(state, { role: "client", inviteMode: "online", error: "", screen: "lobby", players: [], roomCode: code });
  render();
  try {
    const local = Boolean(LAN && (!LAN.hostKey || code === LAN.roomCode));
    state.inviteMode = local ? "lan" : "online";
    const { OnlineSession, LanSession } = await import(local ? "./lan-session.js" : "./online-room.js");
    const session = local
      ? await LanSession.join(code,state.name,onOnlineChange,state.character)
      : await OnlineSession.join(code,state.name,onOnlineChange,undefined,state.character);
    state.online = session;
    const roomUrl=new URL(location.href);roomUrl.searchParams.set("join",code);history.replaceState(null,"",roomUrl.pathname+roomUrl.search);
    try { sessionStorage.setItem(`elteto.joined.${code}`, "1"); } catch {}
    if (local) state.host = session;
  } catch (error) {
    Object.assign(state, { role: null, screen: "join-form", roomCode: "", offerCode: code });
    throw error;
  }
}
function sendAction(action) {
  if(state.gameId==='mus'&&state.view?.version===2)action={...action,expectedRevision:state.view.revision,...(action.type==='discard'?{expectedDiscardRound:state.view.discardRound}:{})};
  if(turnSequence.busy)return;
  if (state.online) { state.online.sendAction(action).catch((error) => { state.error = error.message; flash(error.message); render(); }); return; }
  state.host.applyLocalAction(action);
}
const incomingRoom = parseRoomCode(location.search);
function startApplication(){
if (incomingRoom) {
  state.offerCode=incomingRoom;
  try{state.name=localStorage.getItem('elteto.playerName') || '';}catch{}
  let returning=false;
  try{returning=Boolean(sessionStorage.getItem(`elteto.joined.${incomingRoom}`) || (LAN && sessionStorage.getItem(`elteto.lan.${location.host}.${incomingRoom}`)));}catch{}
  if(returning)beginOnlineJoin(incomingRoom,state.name || 'Invitado').catch(error=>{state.error=error.message;renderJoinForm();flash(state.error);});
  else renderJoinForm();
} else renderHome();
if (adminCode && !GUEST && !OPEN_LAN_HOST) {
  app.innerHTML = '<section class="menu-shell"><div class="menu-wrap"><section class="menu-setup access-panel"><p class="menu-kicker">DESARROLLO</p><h1>Entrando<span>…</span></h1></section></div></section>';
  activateDevelopmentAdmin(adminCode).then(() => { adminCode = ''; renderInstallation(); }).catch(error => { adminCode = ''; renderAccess(); app.querySelector('#access-error').textContent = error.message; });
} else if (activationCode && !GUEST && !OPEN_LAN_HOST) renderAccess();

}
try{state.name=localStorage.getItem('elteto.playerName')||'';}catch{}
let profileReady=false;try{profileReady=localStorage.getItem('elteto.profileReady')==='1'&&Boolean(state.name.trim());}catch{}
if(profileReady)startApplication();else renderProfile();
if (!LAN && !GUEST && "serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
if (GUEST) document.querySelector('link[rel="manifest"]')?.remove();

app.addEventListener('submit', async event => {
  if (event.target.id !== 'access-form') return;
  event.preventDefault();
  if (accessBusy) return;
  accessBusy = true;
  const submit = event.target.querySelector('[type="submit"]');
  submit.disabled = true;
  const errorEl = app.querySelector('#access-error');
  errorEl.textContent = '';
  try {
    activationCode = app.querySelector('#activation-code')?.value || activationCode;
    await activateHost({ email: app.querySelector('#access-email').value, password: app.querySelector('#access-password').value, code: activationCode, login: accessLogin });
    activationCode = '';
    renderInstallation();
  } catch (error) { errorEl.textContent = error.message; submit.disabled = false; }
  finally { accessBusy = false; }
});
