import {originalPortrait} from './rival-portraits.js';
import {mascotForSeat,escapeHtml as esc} from './table-view.js';
// Physical seat order, clockwise from the local player's place at the bottom.
const edges={2:['bottom','top'],3:['bottom','top','top'],4:['bottom','left','top','right'],5:['bottom','left','top','top','right'],6:['bottom','left','left','top','right','right'],7:['bottom','left','left','top','top','right','right'],8:['bottom','left','left','top','top','top','right','right']};
const format=n=>Number(n||0).toLocaleString('es-ES');
const chip=n=>`<i class="poker-chip" aria-hidden="true"></i><b>${format(n)}</b>`;
export function renderPokerTable(view,name,playerId,publicCards){
 const own=Math.max(0,view.players.indexOf(playerId));
 const ordered=view.players.map((_,i)=>view.players[(own+i)%view.players.length]);
 const settled=view.phase==='result'||view.finished;
 const collected=Math.max(0,view.pot-Object.values(view.street).reduce((a,b)=>a+b,0));
 const seat=(id)=>{
  const active=!view.finished&&view.turnPlayer===id;
  const status=view.eliminated[id]?'Observador':view.away?.[id]?'Ausente':view.folded[id]?'Retirado':view.chips[id]===0?'All-in':'';
  return `<article class="poker-seat table-seat ${id===playerId?'self-seat ':''}${active?'active-seat ':''}${status==='Observador'?'poker-observer ':''}" data-player-id="${esc(id)}" ${active?'aria-current="true"':''} aria-label="${esc(name(id))}, ${format(view.chips[id])} fichas${status?', '+status:''}">
   ${originalPortrait(mascotForSeat(view.players,view.players.indexOf(id),view.characters))}
   <div class="poker-identity"><strong class="poker-name">${esc(id===playerId?'Tú':name(id))}</strong><span class="poker-stack" aria-label="${view.chips[id]} fichas disponibles">${chip(view.chips[id])}</span><small class="poker-status">${view.dealer===id?'<i class="poker-dealer" title="Repartidor">D</i> ':''}${esc(status||(view.smallBlind===id?'Ciega pequeña':view.bigBlind===id?'Ciega grande':''))}</small></div>
   ${view.street[id]>0?`<div class="poker-wager" data-player-id="${esc(id)}" aria-label="Apuesta de ${esc(name(id))}: ${view.street[id]} fichas"><small>Apuesta</small>${chip(view.street[id])}</div>`:''}
  </article>`;
 };
 const edge=side=>`<div class="poker-edge poker-edge-${side}">${ordered.filter((id,i)=>edges[ordered.length][i]===side).map(seat).join('')}</div>`;
 return `<div class="poker-table" data-seats="${ordered.length}"><div class="poker-level">Ciegas <b>${view.smallBlindAmount}/${view.bigBlindAmount}</b> · suben en mano ${view.nextBlindHand}</div>
  ${edge('top')}${edge('left')}
  <div class="poker-play-area"><div class="poker-center-meta"><div class="poker-pot" aria-label="${settled?'Bote repartido':'Bote acumulado'}: ${collected} fichas"><span>${settled?'BOTE REPARTIDO':'BOTE'}</span><div class="poker-chip-pile">${chip(collected)}</div>${!settled&&collected!==view.pot?`<small>Total con apuestas: ${format(view.pot)}</small>`:''}</div></div>
   <div class="poker-community">${publicCards(Array.from({length:5},(_,i)=>view.board[i]||null))}</div>
   ${view.payouts.length?`<div class="poker-payouts">${view.payouts.map((pay,i)=>`<span>${view.payouts.length>1?(i?'Bote lateral':'Bote principal')+': ':''}${format(pay.pot)} → ${pay.winners.map(id=>esc(name(id))).join(', ')}</span>`).join('')}</div>`:''}
  </div>${edge('right')}${edge('bottom')}</div>`;
}
export function renderPokerShowdown(view,name,publicCards){
 const shown=view.players.filter(id=>view.publicHands[id]?.length);
 return shown.length?`<section class="poker-revealed-hands" aria-label="Cartas enseñadas">${shown.map(id=>`<div class="poker-showdown" data-player-id="${esc(id)}"><strong>${esc(name(id))}</strong>${publicCards(view.publicHands[id])}</div>`).join('')}</section>`:'';
}
const center=el=>{const r=el?.getBoundingClientRect();return r?{x:r.x+r.width/2,y:r.y+r.height/2}:null;};
export function collectPokerBets(app,previous,view){
 if(!previous||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const table=app.querySelector('.catalog-surface .poker-table'),pot=table?.querySelector('.poker-pot');if(!pot)return;
 const frame=table.getBoundingClientRect(),target=center(pot);
 const seats=[...table.querySelectorAll('.poker-seat')];
 const stack=id=>center(seats.find(el=>el.dataset.playerId===id)?.querySelector('.poker-stack'));
 const fly=(amount,from,to)=>{
  if(!from||!to||!(amount>0))return;
  const el=document.createElement('span');el.className='poker-moving-chip';el.setAttribute('aria-hidden','true');el.innerHTML=chip(amount);
  el.style.left=from.x-frame.left+'px';el.style.top=from.y-frame.top+'px';table.append(el);
  const animation=el.animate([{transform:'translate(-50%,-50%)',opacity:1},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px))`,opacity:1,offset:.85},{transform:`translate(calc(-50% + ${to.x-from.x}px),calc(-50% + ${to.y-from.y}px)) scale(.8)`,opacity:0}],{duration:1200,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'});
  animation.finished.then(()=>el.remove()).catch(()=>el.remove());
 };
 const sameHand=previous.handNumber===view.handNumber;
 if(sameHand)for(const id of view.players){
  const before=previous.street[id]||0,after=view.street[id]||0;
  if(before>0&&after===0)fly(before,previous.positions[id],target);
  if(after>before){const to=center([...table.querySelectorAll('.poker-wager')].find(el=>el.dataset.playerId===id));fly(after-before,previous.stacks?.[id]||stack(id),to);}
  if(view.phase==='result'&&previous.phase!=='result')fly(Math.max(0,view.chips[id]-(previous.chips?.[id]??view.chips[id])),previous.pot||target,stack(id));
 }
 const origin=center(table.querySelector('.poker-community'))||previous.dealOrigin;
 const cards=[...table.querySelectorAll('.poker-community .catalog-card')];
 for(let i=0;i<view.board.length;i++){
  if(sameHand&&previous.board?.[i]===view.board[i].id)continue;
  const el=cards[i],to=center(el);if(!el||!origin||!to)continue;
  el.animate([{transform:`translate(${origin.x-to.x}px,${origin.y-to.y}px) rotateY(180deg) scale(.65)`,opacity:.3},{transform:'none',opacity:1}],{duration:1200,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 if(!sameHand&&origin)for(const [i,el] of [...app.querySelectorAll('.catalog-hand .catalog-card')].entries()){
  const to=center(el);el.animate([{transform:`translate(${origin.x-to.x}px,${origin.y-to.y}px) rotate(-12deg) scale(.6)`,opacity:0},{transform:'none',opacity:1}],{duration:1200,delay:i*150,easing:'ease-out',fill:'backwards'});
 }
 if(sameHand&&previous.actor&&previous.log!==view.log?.at(-1)){
  const seat=seats.find(el=>el.dataset.playerId===previous.actor),badge=seat?.querySelector('.poker-stack');
  badge?.animate([{outline:'2px solid #f0d390'},{outline:'2px solid transparent'}],{duration:1200});
 }
}
export function pokerSnapshot(app,view){
 const table=app.querySelector('.catalog-surface .poker-table');
 return {handNumber:view.handNumber,phase:view.phase,actor:view.turnPlayer,log:view.log?.at(-1),street:{...view.street},chips:{...view.chips},board:view.board.map(c=>c.id),pot:center(table?.querySelector('.poker-pot')),dealOrigin:center(table?.querySelector('.poker-community')),
  stacks:Object.fromEntries([...app.querySelectorAll('.catalog-surface .poker-seat')].map(el=>[el.dataset.playerId,center(el.querySelector('.poker-stack'))])),
  positions:Object.fromEntries([...app.querySelectorAll('.catalog-surface .poker-wager')].map(el=>[el.dataset.playerId,center(el)]))};
}
