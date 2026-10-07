import {escapeHtml as esc, canPlayCinquillo} from './table-view.js';

// Reuse the game nodes and actions, placing secondary information in a dialog.
// This module receives only the player's private view, never the host's state.
export function arrangeCinquilloScreen(app, view, playerId, name, filter = 'all') {
  const root=app.querySelector('.game-page');
  const table=root.querySelector('.game-table'), hand=root.querySelector('.hand');
  const rules=root.querySelector('.game-rules'), history=root.querySelector('.history');
  const zoom=root.querySelector('.board-zoom'), leave=root.querySelector('[data-action="leave-room"]');
  const next=root.querySelector('[data-action="cinquillo-next-hand"]');
  const error=root.querySelector('.error-message');
  const myTurn=view.turnPlayer===playerId && !view.finished && !view.handWinner;
  const legal=view.myHand.filter(card=>canPlayCinquillo(view.table,card,view.ruleset));
  const suits=view.ruleset==='legacy-french-52'
    ? [['picas','Picas'],['corazones','Corazones'],['diamantes','Diamantes'],['treboles','Tréboles']]
    : [['oros','Oros'],['copas','Copas'],['espadas','Espadas'],['bastos','Bastos']];
  if(filter!=='all' && !view.myHand.some(card=>card.suit===filter)) filter='all';
  const heading=document.createElement('header');heading.className='play-header';
  heading.innerHTML=`<div class="play-title"><h1><span>ELTETO</span> Cinquillo</h1><p class="game-ribbon">Mano ${view.handNumber} · ${view.ruleset==='legacy-french-52'?'52 cartas francesas':'40 cartas españolas'}</p></div><button class="table-overview" data-action="open-table-zoom" aria-label="Ver todas las cartas de la mesa">Mesa <span aria-hidden="true">↗</span></button><button class="game-menu-button" data-action="open-game-menu" aria-label="Marcador, reglas y opciones de partida">⋯</button>`;
  const dock=document.createElement('section');dock.className='hand-dock';dock.setAttribute('aria-label','Tu mano y acciones');
  const title=view.finished ? view.winner ? `Gana ${name(view.winner)}` : 'Partida finalizada' : view.handWinner ? `${name(view.handWinner)} gana la mano` : myTurn ? 'Tu turno' : `Turno de ${name(view.turnPlayer)}`;
  const instruction=view.finished ? 'Consulta el resultado de la partida' : view.handWinner ? view.handWinner===playerId ? 'Puedes iniciar el siguiente reparto' : `${name(view.handWinner)} iniciará la siguiente mano` : myTurn ? legal.length ? `Juega una carta · ${legal.length} ${legal.length===1?'disponible':'disponibles'}` : 'No tienes jugada. Puedes pasar.' : '';
  dock.innerHTML=`<div class="game-controls play-status"><div class="turn-copy"><div class="player-turn-announcement ${myTurn?'your-turn':''}" role="status">${esc(title)}</div><p class="play-instruction">${esc(instruction)}</p></div><div class="turn-action"></div></div><div class="hand-filters" role="group" aria-label="Filtrar tu mano por palo">${[['all','Todas'],...suits].map(([suit,label])=>{
    const count=suit==='all'?view.myHand.length:view.myHand.filter(card=>card.suit===suit).length;
    const playable=myTurn && legal.some(card=>suit==='all'||card.suit===suit);
    return `<button data-action="hand-filter" data-suit="${suit}" aria-pressed="${filter===suit}" ${!count&&suit!=='all'?'disabled':''} class="${playable?'has-play':''}" aria-label="${label}, ${count} cartas${playable?', tienes jugada':''}"><span>${label}</span><small>${count}</small></button>`;
  }).join('')}</div>`;
  const action=dock.querySelector('.turn-action');
  if(next) action.append(next);
  else if(view.finished || view.handWinner) action.innerHTML='<button data-action="open-hand-result">Resultado</button>';
  else action.innerHTML=`<button data-action="cinquillo-pass" ${!myTurn||legal.length?'disabled':''}>Pasar</button>`;
  for(const card of hand.querySelectorAll('[data-card-key]')) card.hidden=filter!=='all' && !card.dataset.cardKey.startsWith(filter+':');
  hand.classList.remove('hand-fan');
  hand.setAttribute('aria-label',`Tu mano: ${filter==='all'?'todas las cartas':suits.find(([suit])=>suit===filter)?.[1]}`);
  dock.append(hand);
  if(error) {
    error.classList.add('play-instruction','play-error');
    error.title=error.textContent;
    dock.querySelector('.play-instruction').replaceWith(error);
  }
  const menu=document.createElement('dialog');menu.className='game-menu';menu.setAttribute('aria-label','Opciones de partida');
  menu.innerHTML=`<header><h2>Tu partida</h2><button data-action="close-game-menu">Volver</button></header><div class="game-menu-content"><p>Cinquillo · Mano ${view.handNumber} · Meta ${view.targetScore}</p><ol class="scoreboard" aria-label="Puntuación">${view.players.map(id=>`<li ${id===playerId?'class="your-score"':''}><span>${esc(name(id))}${id===playerId?' · tú':''}</span><strong>${view.scores[id]}</strong></li>`).join('')}</ol></div>`;
  const content=menu.querySelector('.game-menu-content');content.append(rules,history,leave);
  if(view.handWinner || view.finished) content.insertAdjacentHTML('afterbegin','<button data-action="open-hand-result">Ver resultado</button>');
  leave.classList.add('leave-game');
  root.classList.add('cinquillo-screen');
  const players=document.createElement('section');players.className='players-panel';players.setAttribute('aria-label','Jugadores y turno');
  players.append(table.querySelector('.player-roster'));
  root.replaceChildren(heading,players,table,dock,menu,zoom);
  if(view.handWinner || view.finished) root.insertAdjacentHTML('beforeend',renderCinquilloResult(view,playerId,name));
  app.querySelector(':scope > .topbar')?.remove();
  return filter;
}

// All score changes follow directly from the public remaining-card counts.
function renderCinquilloResult(view,playerId,name) {
  const scored=view.ruleset==='spanish-40' && !!view.handWinner;
  const remaining=view.players.reduce((sum,id)=>sum+(view.handSizes[id]||0),0);
  const title=view.finished ? view.winner ? `${name(view.winner)} gana la partida` : 'Partida finalizada' : `${name(view.handWinner)} gana la mano`;
  const rows=[...view.players].sort((a,b)=>(view.scores[b]||0)-(view.scores[a]||0)).map(id=>{
    const delta=id===view.handWinner ? 5+remaining : -(view.handSizes[id]||0);
    return `<tr ${id===playerId?'class="your-score"':''}><th scope="row">${esc(name(id))}${id===playerId?' · tú':''}</th>${scored?`<td class="score-change">${delta>0?'+':''}${delta}</td>`:''}<td>${view.scores[id]??0}</td></tr>`;
  }).join('');
  return `<dialog class="hand-result" aria-labelledby="result-title"><header><p>${view.finished?'FIN DE PARTIDA':`MANO ${view.handNumber} COMPLETADA`}</p><button data-action="close-hand-result" aria-label="Cerrar resultado y ver la mesa">Cerrar</button></header><h2 id="result-title">${esc(title)}</h2>${scored?`<p class="result-explanation">${esc(name(view.handWinner))} suma 5 puntos por ganar y ${remaining} por las cartas restantes. Cada rival resta un punto por carta.</p>`:''}${view.winner&&!scored?'<p>La partida de esta mesa anterior termina al quedarse sin cartas.</p>':''}${scored?`<table class="result-scores"><caption>Puntuación · meta ${view.targetScore} puntos</caption><thead><tr><th scope="col">Jugador</th><th scope="col">Esta mano</th><th scope="col">Total</th></tr></thead><tbody>${rows}</tbody></table>`:''}<footer>${!view.finished?`<p>${view.handWinner===playerId?'Te toca preparar el siguiente reparto.':`${esc(name(view.handWinner))} iniciará la siguiente mano.`}</p>${view.handWinner===playerId?'<button data-action="cinquillo-next-hand">Siguiente mano</button>':'<button data-action="close-hand-result">Ver la mesa</button>'}`:'<p>La partida ha terminado. Puedes revisar la mesa o volver al inicio.</p><button data-action="leave-room">Volver al inicio</button>'}</footer></dialog>`;
}
