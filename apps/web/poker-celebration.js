import {renderAvatarArtwork} from './avatar-art.js';
import {escapeHtml as esc,mascotForSeat} from './table-view.js';
import {POKER_CATEGORIES} from './poker-events.js';
export const POKER_CELEBRATION=2800;
// Public results only; refunds are not victories. No private hand is read here.
export function showPokerCelebration(app,view,name,playerId){
 const table=app.querySelector('.catalog-surface .poker-table');if(!table)return;
 const pots=view.payouts.filter(p=>!p.refund),winners=[...new Set(pots.flatMap(p=>p.winners))];if(!winners.length)return;
 table.querySelector('.poker-celebration')?.remove();
 const banner=document.createElement('section');banner.className='poker-celebration';banner.setAttribute('role','status');
 const title=winners.length>1?'¡Mano repartida!':winners[0]===playerId?'¡Has ganado la mano!':'¡'+name(winners[0])+' gana!';
 banner.innerHTML=`<div class="poker-win-rays" aria-hidden="true"></div><div class="poker-win-card"><span class="poker-win-kicker">${view.finished?'PARTIDA TERMINADA':'MANO GANADA'}</span><h2>${esc(title)}</h2><div class="poker-win-players">${winners.map(id=>{const earned=pots.flatMap(p=>p.awards||[]).filter(a=>a.player===id).reduce((s,a)=>s+a.amount,0);return `<div><span class="poker-win-avatar">${renderAvatarArtwork(mascotForSeat(view.players,view.players.indexOf(id),view.characters))}</span><strong>${esc(name(id))}</strong><b>+${earned.toLocaleString('es-ES')} fichas</b></div>`;}).join('')}</div><p>${esc(pots.length>1?'Botes entregados · consulta el detalle de la mano':pots[0]?.category===undefined?'Los demás jugadores se han retirado':POKER_CATEGORIES[pots[0].category])}</p></div>${Array.from({length:12},(_,i)=>`<i class="poker-win-spark" style="--spark-angle:${i*30}deg;--spark-delay:${i%3*120}ms" aria-hidden="true">✦</i>`).join('')}`;
 table.append(banner);setTimeout(()=>banner.remove(),POKER_CELEBRATION);
}
export function organizePokerDock(app){
 const dock=app.querySelector('.catalog-dock');if(!dock)return;
 const hand=dock.querySelector('.catalog-hand'),instruction=dock.querySelector('.catalog-instruction'),options=dock.querySelector('.catalog-options'),details=dock.querySelector('.poker-result-details');
 dock.replaceChildren();const privateHand=document.createElement('div');privateHand.className='poker-private-hand';privateHand.innerHTML=hand.children.length?'<span>TUS CARTAS</span>':'<span>SIN CARTAS</span>';privateHand.append(hand);
 const actions=document.createElement('div');actions.className='poker-action-panel';actions.append(instruction,options);if(details)actions.append(details);dock.append(privateHand,actions);
}
