import {renderAvatarArtwork} from './avatar-art.js';
import {escapeHtml as esc,mascotForSeat} from './table-view.js';
import {POKER_CATEGORIES} from './poker-events.js';
export const POKER_CELEBRATION=2800;
// El resultado se queda en pantalla para toda la mesa hasta que quien ha ganado la mano pulsa «Continuar»
// (eso reparte la siguiente mano y el aviso desaparece a la vez para todos). Al terminar la partida no hay
// siguiente mano: cada persona lo cierra por su cuenta.
// Public results only; refunds are not victories. No private hand is read here.
export function showPokerCelebration(app,view,name,playerId){
 const table=app.querySelector('.catalog-surface .poker-table');if(!table)return;
 const pots=view.payouts.filter(p=>!p.refund),winners=[...new Set(pots.flatMap(p=>p.winners))];if(!winners.length)return;
 const key=`${view.handNumber}:${view.phase}`;if(app.pokerSplashClosed===key)return;
 if(table.querySelector('.poker-celebration')?.dataset.key===key)return;
 table.querySelector('.poker-celebration')?.remove();
 const next=view.options.findIndex(option=>option.action?.type==='next-hand');
 const control=view.finished?'<button class="poker-win-continue" data-action="poker-splash-close">Cerrar</button>':next>=0?'<button class="poker-win-continue" data-action="poker-splash-continue">Continuar</button>':`<p class="poker-win-waiting">Esperando a que ${esc(name(view.turnPlayer))} continúe…</p>`;
 const banner=document.createElement('section');banner.className='poker-celebration';banner.dataset.key=key;banner.setAttribute('role','status');
 const title=winners.length>1?'¡Mano repartida!':winners[0]===playerId?'¡Has ganado la mano!':'¡'+name(winners[0])+' gana!';
 banner.innerHTML=`<div class="poker-win-rays" aria-hidden="true"></div><div class="poker-win-card"><span class="poker-win-kicker">${view.finished?'PARTIDA TERMINADA':'MANO GANADA'}</span><h2>${esc(title)}</h2><div class="poker-win-players">${winners.map(id=>{const earned=pots.flatMap(p=>p.awards||[]).filter(a=>a.player===id).reduce((s,a)=>s+a.amount,0);return `<div><span class="poker-win-avatar">${renderAvatarArtwork(mascotForSeat(view.players,view.players.indexOf(id),view.characters))}</span><strong>${esc(name(id))}</strong><b>+${earned.toLocaleString('es-ES')} fichas</b></div>`;}).join('')}</div><p class="poker-win-hand">${esc(pots[0]?.category===undefined?'Los demás jugadores se han retirado':POKER_CATEGORIES[pots[0].category])}</p>${app.pokerResultDetail||''}${control}</div>${Array.from({length:12},(_,i)=>`<i class="poker-win-spark" style="--spark-angle:${i*30}deg;--spark-delay:${i%3*120}ms" aria-hidden="true">✦</i>`).join('')}`;
 table.append(banner);
}
export function organizePokerDock(app){
 const dock=app.querySelector('.catalog-dock');if(!dock)return;
 const hand=dock.querySelector('.catalog-hand'),instruction=dock.querySelector('.catalog-instruction'),options=dock.querySelector('.catalog-options'),details=dock.querySelector('.poker-result-details');
 app.pokerResultDetail=details?details.outerHTML:'';dock.replaceChildren();const privateHand=document.createElement('div');privateHand.className='poker-private-hand';privateHand.innerHTML=hand.children.length?'<span>TUS CARTAS</span>':'<span>SIN CARTAS</span>';privateHand.append(hand);
 const actions=document.createElement('div');actions.className='poker-action-panel';actions.append(instruction,options);dock.append(privateHand,actions);
}
