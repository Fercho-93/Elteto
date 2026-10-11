import {
  escapeHtml as esc,
  cardKey,
  renderHandCard,
  cardFace,
  mascotForSeat,
} from "./table-view.js";
import { renderAvatarArtwork } from "./avatar-art.js";
import { renderCardBack } from "./card-art.js";
import { readableTurn } from "./turn-events.js";
const labels = {
  dealing: "REPARTIENDO",
  "cards-dealt": "CARTAS REPARTIDAS",
  mus: "¿QUIERES MUS?",
  discard: "DESCARTE",
  redeal: "REPARTIENDO",
  grande: "GRANDE",
  chica: "CHICA",
  "pares-declaration": "¿TIENES PARES?",
  pares: "PARES",
  "juego-declaration": "¿TIENES JUEGO?",
  juego: "JUEGO",
  punto: "PUNTO",
  showing: "ENSEÑANDO CARTAS",
  counting: "RECUENTO",
  showdown: "RECUENTO COMPLETO",
  finished: "¡¡PARTIDA GANADA!!",
};
const team = (i) => (i % 2 ? "B" : "A");
const stones = (n, cls = "") =>
  `<span class="mus-stones ${cls}" aria-hidden="true">${Array.from({ length: n }, () => "<i></i>").join("")}</span>`;
const readable = (text, view, name) =>
  esc(readableTurn(text, view.players, name));
function playerState(v, p) {
  if (v.phase === "mus")
    return { mus: "MUS", corta: "CORTA" }[v.musDecisions[p]] || "ESPERA";
  if (["discard", "redeal"].includes(v.phase))
    return v.discardCounts[p] === null
      ? "ESPERANDO"
      : `${v.discardCounts[p]} CARTAS`;
  const kind =
    v.phase === "pares-declaration"
      ? "pares"
      : v.phase === "juego-declaration"
        ? "juego"
        : null;
  if (kind)
    return v.declarations[kind][p] === null
      ? "ESPERA"
      : kind === "pares"
        ? v.declarations[kind][p]
          ? "TIENE PARES"
          : "NO TIENE"
        : v.declarations[kind][p]
          ? "JUEGO"
          : "NO JUEGO";
  return v.turnPlayer === p
    ? "HABLA"
    : v.mano === p
      ? "MANO"
      : v.postre === p
        ? "POSTRE"
        : "";
}
function controls(v, p, selected, name) {
  if (Object.values(v.away || {}).some(Boolean))
    return '<p class="mus-wait">Mesa en pausa. Esperando a que todos vuelvan a su plaza…</p>';
  if (v.finished)
    return '<button data-action="open-mus-panel" data-kind="recuento" class="mus-action accept">VER RECUENTO</button>';
  const actions = (v.availableActions || []).filter(
    (a) => a.type !== "advance",
  );
  if (v.phase === "discard")
    return actions.length
      ? `<p class="mus-action-help">Selecciona de 1 a 4 cartas; aún no se cambian.</p><button class="mus-action discard" data-action="mus-discard" ${selected.size ? "" : "disabled"}>CONFIRMAR DESCARTE</button><small>Has seleccionado ${selected.size} ${selected.size === 1 ? "carta" : "cartas"}</small>`
      : '<p class="mus-wait">Descarte confirmado.<br>Esperando al resto de jugadores…</p>';
  if (!actions.length)
    return `<p class="mus-wait">${["dealing", "redeal", "cards-dealt", "showing", "counting"].includes(v.phase) ? "La mesa está avanzando…" : v.phase === "showdown" ? `${esc(v.mano === p ? "Tú" : name(v.mano))} inicia la siguiente mano.` : "Espera a quien está hablando."}</p>`;
  const actionButtons = actions
    .filter((a) => a.type !== "bet")
    .map((a) => {
      const key =
        a.type === "mus"
          ? a.wantsMus
            ? "mus-yes"
            : "mus-no"
          : a.type === "declare-pairs"
            ? "mus-declare-pairs"
            : a.type === "declare-juego"
              ? "mus-declare-juego"
              : a.type === "next-hand"
                ? "mus-next"
                : `mus-${a.type}`;
      const cls =
        a.type === "mus"
          ? a.wantsMus
            ? "mus"
            : "cut"
          : a.type === "ordago"
            ? "ordago"
            : a.type === "accept"
              ? "accept"
              : a.type === "reject"
                ? "reject"
                : a.type === "pass"
                  ? "pass"
                  : a.type.startsWith("declare")
                    ? "declare"
                    : "accept";
      return `<button class="mus-action ${cls}" data-action="${key}" ${a.has !== undefined ? `data-has="${a.has}"` : ""}>${esc(a.label)}</button>`;
    })
    .join("");
  const bet = actions.find((a) => a.type === "bet");
  return `<div class="mus-action-grid ${v.betting?.pendingBet?.ordago ? "ordago-decision" : ""}">${actionButtons}${bet ? `<div class="mus-envite-control"><label for="bet-amount">${v.betting.pendingBet ? "Subir hasta" : "Tantos"}</label><div><button data-action="mus-bet-less" aria-label="Menos tantos">−</button><input id="bet-amount" aria-label="Tantos totales del envite" inputmode="numeric" type="number" min="${bet.min}" max="${bet.max}" step="1" value="${bet.min}"><button data-action="mus-bet-more" aria-label="Más tantos">+</button><button class="mus-action bet" data-action="mus-bet">${v.betting.pendingBet ? "SUBIR" : "ENVIDO"}</button></div></div>` : ""}</div>${v.betting?.pendingBet?.ordago && !actions.some((a) => a.type === "accept") ? '<p class="mus-action-help">El reglamento impide aceptar este órdago con la jugada mínima de postre.</p>' : ""}`;
}
function recuento(v, name) {
  const entries = v.ledger.filter((e) => e.hand === v.handNumber),
    totals = { A: 0, B: 0 };
  entries.forEach((e) => (totals[e.team] += e.points));
  return `<p>Mano ${v.handNumber}. Los tantos ya apuntados por negadas aparecen una sola vez. Los lances posteriores a una victoria no se cuentan.</p><table class="mus-recount"><thead><tr><th>Lance y concepto</th><th>Roja</th><th>Azul</th></tr></thead><tbody>${[
    "grande",
    "chica",
    "pares",
    v.results?.punto ? "punto" : "juego",
  ]
    .map((lance) => {
      const rows = entries.filter((e) => e.lance === lance);
      return `<tr class="mus-recount-lance"><th>${lance.toUpperCase()}</th><td>${rows.filter((e) => e.team === "A").reduce((n, e) => n + e.points, 0)}</td><td>${rows.filter((e) => e.team === "B").reduce((n, e) => n + e.points, 0)}</td></tr>${rows.map((e) => `<tr><td>${esc(e.cause)}${e.player ? ` · ${esc(name(e.player))}` : ""}</td><td>${e.team === "A" ? "+" + e.points : "—"}</td><td>${e.team === "B" ? "+" + e.points : "—"}</td></tr>`).join("")}${!rows.length ? `<tr><td colspan="3">${v.results?.[lance]?.counted ? "Sin tantos" : "Pendiente o no contado"}</td></tr>` : ""}`;
    })
    .join(
      "",
    )}<tr><th>TOTAL DE LA MANO</th><td>+${totals.A}</td><td>+${totals.B}</td></tr></tbody></table>${v.revealedHands ? `<h3>Cartas enseñadas</h3><div class="mus-show-hands">${v.players.map((p) => `<section><strong>${esc(name(p))} · ${v.revealedAnalysis[p].juego.total} · ${v.revealedAnalysis[p].pares.kind}</strong><div>${v.revealedHands[p].map((c) => `<span class="reveal-card">${cardFace(c)}</span>`).join("")}</div></section>`).join("")}</div>` : "<p>Las cartas permanecen privadas hasta terminar Juego/Punto o aceptar un órdago.</p>"}`;
}
export function openMusPanel(app, kind) {
  const d = app.querySelector(".mus-detail");
  if (!d) return;
  d.dataset.kind = kind;
  d.querySelectorAll("[data-panel]").forEach(
    (el) => (el.hidden = el.dataset.panel !== kind),
  );
  d.querySelector("h2").textContent = {
    estado: "ESTADO DE LA PARTIDA",
    historial: "HISTORIAL",
    recuento: "RECUENTO Y CARTAS",
    senas: "TUS SEÑAS",
  }[kind];
  if (!d.open) d.showModal();
}
export function renderMusScreen(app, v, p, name, selected, error = "") {
  const opened = app.querySelector(".mus-detail[open]")?.dataset.kind,
    menuOpen = app.querySelector(".game-menu")?.open,
    scroll = app.querySelector(".mus-cards")?.scrollLeft || 0,
    betValue = app.querySelector("#bet-amount")?.value,
    betRevision = app.querySelector(".mus-screen")?.dataset.revision;
  const own = v.players.indexOf(p),
    ownTeam = team(own),
    pending = v.betting?.pendingBet,
    myTurn = v.turnPlayer === p,
    canDiscard = v.availableActions?.some((a) => a.type === "discard");
  const transient = [
    "dealing",
    "redeal",
    "cards-dealt",
    "showing",
    "counting",
  ].includes(v.phase);
  const paused = Object.values(v.away || {}).some(Boolean);
  const turn = paused
    ? "MESA EN PAUSA"
    : v.finished
      ? `Gana la pareja ${v.winnerTeam === "A" ? "roja" : "azul"}`
      : canDiscard
        ? "TU DESCARTE"
        : myTurn
          ? "TU TURNO"
          : v.turnPlayer
            ? `${name(v.turnPlayer)} ESTÁ HABLANDO`
            : transient
              ? labels[v.phase]
              : v.phase === "discard"
                ? "ESPERANDO DESCARTES"
                : "LA MESA";
  const statusRows = [
    "mus",
    "discard",
    "redeal",
    "pares-declaration",
    "juego-declaration",
  ].includes(v.phase);
  const feedbackTypes = ['mus', 'cut', 'discard-confirm', 'declared', 'pass', 'BET', 'RAISE', 'ORDAGO', 'accept', 'reject', 'score', 'game-over'];
  const latest = v.events.filter(e => feedbackTypes.includes(e.type)).at(-1) || v.events.filter(e => e.type !== 'transition').at(-1);
  const recent = v.betting?.history.slice(-3) || [];
  const resolved =
    v.revealedHands && v.lastResult?.winnerPlayer ? v.lastResult : null;
  const resolvedEntries = resolved
    ? v.ledger.filter(
        (e) => e.hand === v.handNumber && e.lance === resolved.lance,
      )
    : [];
  const lastEntries = v.ledger.slice(-2),
    newAmarraco = lastEntries.find(
      (e) =>
        e.hand === v.handNumber &&
        e.amarracosAfter > e.amarracosBefore &&
        v.events.at(-1)?.type === "score",
    );
  app.innerHTML = `<section class="game-page mus-screen mus-fem" data-game="mus" data-revision="${v.revision}" data-phase="${v.stage}" aria-label="Tu mesa de Mus">
 <header class="play-header"><div class="play-title"><h1><span>ELTETO</span> Mus</h1><p>Mano ${v.handNumber} · 8 reyes y 8 ases</p></div><button class="game-menu-button" data-action="open-game-menu" aria-label="Menú de partida">⋯</button></header>
 <section class="mus-live-score" aria-label="Marcador">${["A", "B"]
   .map((t) => {
     const s = v.scoreState[t];
     return `<button data-action="open-mus-panel" data-kind="estado" class="mus-team-score team-${t} ${t === ownTeam ? "mine" : ""}" aria-label="Pareja ${t === "A" ? "roja" : "azul"}, ${s.total} de ${v.targetScore} tantos"><span>${t === ownTeam ? "Tu pareja" : "Rivales"} · ${t === "A" ? "Roja" : "Azul"}</span><strong>${s.total}<small> / ${v.targetScore}</small></strong><small>${s.amarracos} amarracos + ${s.piedras} piedras</small></button>`;
   })
   .join("")}</section>
 <section class="game-table mus-felt" aria-label="Mesa y jugadores">
 ${v.players
   .map((id, i) => {
     const relative = (i - own + 4) % 4,
       position = ["self", "left", "partner", "right"][relative],
       character = mascotForSeat(v.players, i, v.characters),
       active =
         v.turnPlayer === id ||
         (v.phase === "discard" && v.awaitingDiscardFrom.includes(id));
     return `<article class="mus-seat ${active ? "active-seat" : ""} team-${team(i)}" data-player-id="${esc(id)}" data-position="${position}" ${active ? 'aria-current="true"' : ""}><span class="mus-portrait">${renderAvatarArtwork(character, "mus-seat-" + i)}</span><strong>${esc(name(id))}</strong><small>${relative === 0 ? "TÚ" : relative === 2 ? "COMPAÑERO" : "RIVAL"}${v.mano === id ? " · MANO" : v.postre === id ? " · POSTRE" : ""}${v.away?.[id] ? " · SIN CONEXIÓN" : ""}</small>${statusRows ? `<b class="mus-seat-state" data-decision-player="${esc(id)}">${playerState(v, id)}</b>` : ""}${active ? '<i class="mus-speaking" aria-label="Está hablando"></i>' : ""}</article>`;
   })
   .join("")}
 <div class="deck-stock mus-stock" aria-label="Mazo español: cartas sin repartir"><span>${renderCardBack(false)}</span><span>${renderCardBack(false)}</span></div><div class="mus-context ${pending?.ordago ? "has-ordago" : ""}"><span class="mus-wordmark" aria-hidden="true">MUS</span><nav class="mus-lance-track" aria-label="Orden de lances">${["grande", "chica", "pares", v.isPunto ? "punto" : "juego"].map((l) => `<span class="${v.lance === l ? "current" : ""}">${l.toUpperCase()}</span>`).join("")}</nav><h2>${labels[v.phase]}</h2><strong class="mus-current-bet">${pending ? (pending.ordago ? "ÓRDAGO" : `ENVITE: ${pending.amount}`) : v.betting ? "PASANDO" : ""}</strong>${pending ? `<p>${esc(name(pending.player))} → ${esc(name(v.turnPlayer))}</p>` : ""}
 ${resolved ? `<p class="mus-result-summary">✓ ${resolved.lance.toUpperCase()} · ${esc(name(resolved.winnerPlayer))}<br>Roja +${resolvedEntries.filter((e) => e.team === "A").reduce((n, e) => n + e.points, 0)} · Azul +${resolvedEntries.filter((e) => e.team === "B").reduce((n, e) => n + e.points, 0)}</p>` : ""}
 ${v.revealedHands ? `<button class="mus-detail-link" data-action="open-mus-panel" data-kind="recuento">${v.phase === "counting" ? "Tanteando en orden…" : "VER CARTAS Y DETALLE"} ↗</button>` : ""}
 ${recent.length ? `<p class="mus-bet-trail">${recent.map((h) => `${esc(name(h.player))} → ${h.type === "ORDAGO" ? "ÓRDAGO" : h.amount}`).join(" · ")}</p>` : ""}
 ${["A", "B"]
   .filter((t) => v.scoreState[t].inside)
   .map(
     (t) =>
       `<div class="mus-inside team-${t}">${t === ownTeam ? "ESTAMOS DENTRO" : "RIVALES DENTRO"}${stones(v.scoreState[t].amarracos, "amarracos")}<small>${v.scoreState[t].remaining} para ganar · AMARRACOS AL CENTRO</small></div>`,
   )
   .join("")}
 </div></section>
 <section class="mus-private" aria-label="Tus cuatro cartas"><h2>Tu mano <small>${v.myAnalysis ? `${v.myAnalysis.pares.kind} · ${v.myAnalysis.juego.hasJuego ? "juego" : "punto"} ${v.myAnalysis.punto} · SOLO TÚ` : "Cartas ocultas durante el reparto"}</small></h2><div class="hand mus-cards" aria-label="Tus cartas">${v.myHand.map((c) => renderHandCard(c, { selected: canDiscard && selected.has(cardKey(c)), selectable: canDiscard, disabled: !canDiscard })).join("") || Array.from({ length: 4 }, () => `<span class="mus-dealing-back">${renderCardBack(false)}</span>`).join("")}</div></section>
 <section class="mus-decisions" aria-label="Acciones legales"><div class="mus-turn ${myTurn || canDiscard ? "your-turn" : ""}" role="status">${esc(turn)}</div>${controls(v, p, selected, name)}${error ? `<p class="error-message" role="alert">${readable(error, v, name)}</p>` : ""}</section>
 <footer class="mus-tools"><button data-action="open-mus-panel" data-kind="historial">HISTORIAL</button><p class="mus-feedback" role="status">${latest ? readable(latest.text, v, name) : ""}</p><button data-action="open-mus-panel" data-kind="recuento">VER DETALLE</button></footer>
 ${newAmarraco ? `<div class="mus-amarraco-feedback" role="status">5 piedras → 1 AMARRACO</div>` : ""}
 <dialog class="mus-detail"><header><h2>ESTADO DE LA PARTIDA</h2><button data-action="close-mus-panel">← Volver a la partida</button></header><div data-panel="estado"><h3>Marcador por parejas</h3>${[
   "A",
   "B",
 ]
   .map(
     (t) =>
       `<p class="team-${t}">${v.players
         .filter((_, i) => team(i) === t)
         .map((id) => esc(name(id)))
         .join(
           " y ",
         )}<br><strong>${v.scores[t]} / ${v.targetScore}</strong> · ${v.scoreState[t].amarracos} amarracos + ${v.scoreState[t].piedras} piedras · Faltan ${v.scoreState[t].remaining}</p>`,
   )
   .join(
     "",
   )}<dl><dt>Lance</dt><dd>${labels[v.phase]}</dd><dt>Habla</dt><dd>${v.turnPlayer ? esc(name(v.turnPlayer)) : "La mesa"}</dd><dt>Envite</dt><dd>${pending ? (pending.ordago ? "ÓRDAGO" : pending.amount) : "Sin envite"}</dd><dt>Mano</dt><dd>${esc(name(v.mano))}</dd><dt>Postre</dt><dd>${esc(name(v.postre))}</dd></dl><p>Una partida a ${v.targetScore} tantos. Amarraco = 5 tantos.</p></div>
 <div data-panel="historial" hidden><ol class="mus-event-list">${v.events
   .slice()
   .reverse()
   .map(
     (e) =>
       `<li><small>${e.at ? new Date(e.at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "#" + e.sequence} · mano ${e.hand}</small><span>${readable(e.text, v, name)}</span></li>`,
   )
   .join(
     "",
   )}</ol></div><div data-panel="recuento" hidden>${recuento(v, name)}</div><div data-panel="senas" hidden><p>Guía privada para hacer las señas físicamente. La aplicación no las envía a ningún otro móvil. Sin señas parciales.</p>${v.myAnalysis?.signals.map((s) => `<p><strong>${esc(s.id)}</strong>: ${esc(s.gesture)}${s.allowed ? "" : " · AÚN NO PERMITIDA"}</p>`).join("") || "Espera a completar el reparto."}<p>Cortar mus: inclinar la cabeza hacia un lado. Las medias que no sean de reyes se pasan después de Grande; en la primera mano no se pasan señas antes del corte.</p></div></dialog>
 <dialog class="game-menu"><header><h2>Tu partida de Mus</h2><button data-action="close-game-menu">Volver</button></header><div class="game-menu-content"><button data-action="open-mus-panel" data-kind="estado">Estado de la partida</button><button data-action="open-mus-panel" data-kind="senas">Mis señas</button><button data-action="open-game-help">Reglas e información</button><button data-action="leave-room" class="leave-game">Salir de la partida</button></div></dialog></section>`;
  app.querySelector(".mus-cards").scrollLeft = scroll;
  if (
    betRevision === String(v.revision) &&
    betValue &&
    app.querySelector("#bet-amount")
  )
    app.querySelector("#bet-amount").value = betValue;
  if (opened) openMusPanel(app, opened);
  else if (v.phase === "showing" || v.finished) openMusPanel(app, "recuento");
  if (menuOpen) app.querySelector(".game-menu").showModal();
}
