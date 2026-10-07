import {escapeHtml as esc} from './table-view.js';

// Reorganize existing controls; actions and private engine views remain unchanged.
export function arrangeMusScreen(app,view,playerId,name) {
  const root=app.querySelector('.game-page'),table=root.querySelector('.game-table'),hand=root.querySelector('.hand');
  const controls=root.querySelector(':scope > .game-controls'),rules=root.querySelector('.game-rules'),history=root.querySelector('.history'),leave=root.querySelector('[data-action="leave-room"]'),zoom=root.querySelector('.board-zoom');
  const own=view.players.indexOf(playerId),team=own%2?'B':'A',partner=view.players[(own+2)%4];
  const heading=document.createElement('header');heading.className='play-header';
  heading.innerHTML=`<div class="play-title"><h1><span>ELTETO</span> Mus</h1><p class="game-ribbon">Pareja ${team} · Con ${esc(name(partner))}${view.mano===playerId?' · Eres mano':''}</p></div><button class="table-overview" data-action="open-table-zoom" aria-label="Ver cartas y recuento de Mus">Mesa ↗</button><button class="game-menu-button" data-action="open-game-menu" aria-label="Marcador, parejas, reglas y opciones">⋯</button>`;
  const score=document.createElement('div');score.className='mus-score';
  score.setAttribute('aria-label','Marcador por parejas');
  score.innerHTML=['A','B'].map(t=>`<div class="${t===team?'my-team':''}"><span>${t===team?'Tu pareja':'Rivales'} · ${t}</span><strong>${view.scores[t]} <small>/ ${view.targetScore}</small></strong><small>${view.gamesWon?.[t]??0} / ${view.targetGames??1} juegos</small></div>`).join('');
  table.querySelector('.table-center').prepend(score);
  if(view.finished){table.querySelector('.mus-phase strong').textContent='Fin de partida';table.querySelector('.mus-phase span').textContent=`Gana la pareja ${view.winnerTeam}`;}
  // Identify revealed hands by name, keeping hidden hands private.
  table.querySelectorAll('.revealed-hands > div > small').forEach((label,i)=>{label.textContent=`${name(view.players[i])} · ${i%2?'B':'A'}`;});
  const dock=document.createElement('section');dock.className='mus-dock';dock.setAttribute('aria-label','Tu mano y decisiones de Mus');
  const cards=document.createElement('div');cards.className='mus-private';
  cards.innerHTML=`<h2>Tu mano <small>${view.mano===playerId?'Eres mano':'Pareja '+team}</small></h2>`;
  hand.classList.remove('hand-fan');cards.append(hand);
  const actions=document.createElement('div');actions.className='mus-decisions';
  const status=document.createElement('p');status.className='mus-turn';status.setAttribute('role','status');
  status.textContent=view.finished?`Gana la pareja ${view.winnerTeam}`:view.phase==='discard'&&view.awaitingDiscardFrom.includes(playerId)?'Tu descarte':view.turnPlayer===playerId?'Tu turno':`Turno de ${name(view.turnPlayer)}`;
  actions.append(status);
  if(controls) actions.append(controls);
  else actions.insertAdjacentHTML('beforeend','<button data-action="open-game-menu">Ver marcador</button>');
  actions.querySelector('#bet-amount')?.setAttribute('aria-label','Tantos del envite');
  const error=root.querySelector('.error-message');if(error)actions.append(error);
  dock.append(cards,actions);
  const menu=document.createElement('dialog');menu.className='game-menu';menu.setAttribute('aria-label','Opciones y marcador de Mus');
  menu.innerHTML=`<header><h2>Tu partida de Mus</h2><button data-action="close-game-menu">Volver</button></header><div class="game-menu-content"><p>Juegos a ${view.targetScore} tantos · primero a ${view.targetGames??1} juegos</p>${['A','B'].map(t=>`<h3>Pareja ${t}${t===team?' · tú':''}</h3><p>${view.players.filter((_,i)=>(i%2?'B':'A')===t).map(id=>esc(name(id))).join(' y ')}<br>${view.scores[t]} tantos · ${view.gamesWon?.[t]??0} juegos</p>`).join('')}</div>`;
  menu.querySelector('.game-menu-content').append(rules,history,leave);leave.classList.add('leave-game');
  root.classList.add('mus-screen');root.replaceChildren(heading,table,dock,menu,zoom);
  app.querySelector(':scope > .topbar')?.remove();
}
