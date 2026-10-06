import {escapeHtml as esc, canPlayCinquillo} from './table-view.js';

// Reuse the game nodes and actions, placing secondary information in a dialog.
// This module receives only the player's private view, never the host's state.
export function arrangeCinquilloScreen(app, view, playerId, name, filter = 'all') {
  const root=app.querySelector('.game-page');
  const table=root.querySelector('.game-table'), hand=root.querySelector('.hand');
  const rules=root.querySelector('.game-rules'), history=root.querySelector('.history');
  const zoom=root.querySelector('.board-zoom'), leave=root.querySelector('[data-action="leave-room"]');
  const next=root.querySelector('[data-action="cinquillo-next-hand"]');
  const lastPlay=root.querySelector('.last-play'), error=root.querySelector('.error-message');
  const myTurn=view.turnPlayer===playerId && !view.finished && !view.handWinner;
  const legal=view.myHand.filter(card=>canPlayCinquillo(view.table,card,view.ruleset));
  const suits=view.ruleset==='legacy-french-52'
    ? [['picas','Picas'],['corazones','Corazones'],['diamantes','Diamantes'],['treboles','Tréboles']]
    : [['oros','Oros'],['copas','Copas'],['espadas','Espadas'],['bastos','Bastos']];
  if(filter!=='all' && !view.myHand.some(card=>card.suit===filter)) filter='all';
  const heading=document.createElement('header');heading.className='play-header';
  heading.innerHTML=`<div class="play-title"><h1><span>ELTETO</span> Cinquillo</h1><p class="game-ribbon">Mano ${view.handNumber} · ${view.ruleset==='legacy-french-52'?'52 cartas francesas':'40 cartas españolas'}</p></div><button class="table-overview" data-action="open-table-zoom" aria-label="Ver todas las cartas de la mesa">Mesa <span aria-hidden="true">↗</span></button><button class="game-menu-button" data-action="open-game-menu" aria-label="Marcador, reglas y opciones de partida">⋯</button>`;
  const dock=document.createElement('section');dock.className='hand-dock';dock.setAttribute('aria-label','Tu mano y acciones');
  const title=view.finished ? `Gana ${name(view.winner)}` : view.handWinner ? `${name(view.handWinner)} gana la mano` : myTurn ? 'Tu turno' : `Turno de ${name(view.turnPlayer)}`;
  const instruction=view.finished ? 'Partida terminada' : view.handWinner ? `Mano ${view.handNumber} · Consulta los puntos en el marcador` : myTurn ? legal.length ? `Juega una carta · ${legal.length} ${legal.length===1?'disponible':'disponibles'}` : 'No tienes jugada. Puedes pasar.' : lastPlay.textContent;
  dock.innerHTML=`<div class="game-controls play-status"><div class="turn-copy"><div class="turn-banner ${myTurn?'your-turn':''}" role="status">${esc(title)}</div><p class="play-instruction">${esc(instruction)}</p></div><div class="turn-action"></div></div><div class="hand-filters" role="group" aria-label="Filtrar tu mano por palo">${[['all','Todas'],...suits].map(([suit,label])=>{
    const count=suit==='all'?view.myHand.length:view.myHand.filter(card=>card.suit===suit).length;
    const playable=myTurn && legal.some(card=>suit==='all'||card.suit===suit);
    return `<button data-action="hand-filter" data-suit="${suit}" aria-pressed="${filter===suit}" ${!count&&suit!=='all'?'disabled':''} class="${playable?'has-play':''}" aria-label="${label}, ${count} cartas${playable?', tienes jugada':''}"><span>${label}</span><small>${count}</small></button>`;
  }).join('')}</div>`;
  const action=dock.querySelector('.turn-action');
  if(next) action.append(next);
  else if(view.finished || view.handWinner) action.innerHTML='<button data-action="open-game-menu">Marcador</button>';
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
  leave.classList.add('leave-game');
  root.classList.add('cinquillo-screen');
  root.replaceChildren(heading,table,dock,menu,zoom);
  app.querySelector(':scope > .topbar')?.remove();
  return filter;
}
