import {DICE_DURATION} from './game-physics.js';
import {escapeHtml as esc} from './table-view.js';

const contexts=new WeakMap();
const PARCHIS_TARGETS={rollSelector:'[data-action="parchis-roll"]',moveSelector:'[data-action="parchis-move"]',dockSelector:'.parchis-dock',statusSelector:'.parchis-status p'};
export const OCA_DICE_TARGETS={rollSelector:'[data-action="catalog-choice"][data-roll-sequence]',moveSelector:'[data-oca-move]',dockSelector:'.oca-dock',statusSelector:'.catalog-instruction'};
const angles={1:[0,0],2:[90,0],3:[0,-90],4:[0,90],5:[-90,0],6:[0,-180]};
const pipSlots={1:[5],2:[1,9],3:[1,5,9],4:[1,3,7,9],5:[1,3,5,7,9],6:[1,3,4,6,7,9]};
function context(app){if(!contexts.has(app))contexts.set(app,{sequence:null,deadline:0,pending:false,timer:null});return contexts.get(app);}
const orientation=(value,x=0,y=0)=>{const [rx,ry]=angles[value];return `rotateX(-14deg) rotateY(18deg) rotateX(${rx+x}deg) rotateY(${ry+y}deg)`;};
const renderCube=(value,used=false)=>`<div class="die-stage${used?' is-used':''}" data-value="${value}" aria-hidden="true"><i class="die-shadow"></i><div class="die-flight"><div class="die-cube" style="transform:${orientation(value)}">${[1,2,3,4,5,6].map(n=>`<span class="die-face face-${n}">${pipSlots[n].map(slot=>`<i style="grid-area:${Math.ceil(slot/3)} / ${(slot-1)%3+1}"></i>`).join('')}</span>`).join('')}</div></div></div>`;
export function renderParchisDie(view,name){
 // A table playing with two dice shows both cubes; dice already played this turn are dimmed.
 const values=view.lastRoll?.values??(view.diceCount===2&&!view.lastRoll?[1,1]:[view.lastRoll?.value??view.die??1]),value=view.lastRoll?.value??view.die??1,rolled=!!(view.lastRoll||view.die);
 const playing=['move','bonus'].includes(view.phase)&&values.length>1&&view.rolled?.length===values.length;
 const prefix=view.boardKind!=='oca'?(view.lastRoll?.initial?'Inicial · solo orden':view.phase==='roll'?'Última tirada':'Tirada actual'):'';
 const shown=values.length>1?`${values.join(' + ')}${view.lastRoll?.initial?` = ${value}`:''}`:value;
 const label=view.lastRoll?`${prefix?prefix+' · ':''}${name(view.lastRoll.player)}: ${shown}`:rolled?`Resultado: ${shown}`:'Sin tirar';
 return `<div class="parchis-die" aria-label="${esc(label)}" data-result="${rolled?value:0}" data-values="${values.join(',')}" data-roll-id="${view.lastRoll?.sequence??0}"><div class="die-pair">${values.map((v,i)=>renderCube(v,playing&&view.used?.[i])).join('')}</div><small>${esc(label)}</small></div>`;
}
function lock(app,busy,targets=PARCHIS_TARGETS){
 busy=busy||app.querySelector('.catalog-screen')?.dataset.motionBusy==='true'||!!app.querySelector('[data-turn-busy="true"]');
 app.querySelector(targets.dockSelector)?.setAttribute('aria-busy',String(busy));
 for(const button of app.querySelectorAll(`${targets.rollSelector},${targets.moveSelector}`)){
  if(button.dataset.diceAllowed===undefined)button.dataset.diceAllowed=String(!button.disabled);
  button.disabled=busy||button.dataset.diceAllowed!=='true';
 }
}
export function beginParchisRoll(app,targets=PARCHIS_TARGETS){
 const state=context(app),button=app.querySelector(targets.rollSelector);
 if(!button||button.disabled||state.pending||performance.now()<state.deadline)return false;
 state.pending=true;lock(app,true,targets);button.textContent='Tirando…';
 clearTimeout(state.timer);
 state.timer=setTimeout(()=>{if(!state.pending)return;state.pending=false;lock(app,false,targets);const status=app.querySelector(targets.statusSelector);if(status)status.textContent='Sin respuesta. Comprueba la conexión antes de reintentar.';if(button.isConnected)button.textContent='Reintentar';},12000);
 return true;
}
export function finishDiceRender(app,view,error,targets=PARCHIS_TARGETS){
 const state=context(app),sequence=view.lastRoll?.sequence??0,now=performance.now(),gameKey=view.id||'parchis';
 if(state.gameKey!==gameKey){clearTimeout(state.timer);Object.assign(state,{gameKey,sequence:null,pending:false,deadline:0});}
 const initial=state.sequence===null;
 // A new game in the same app starts a fresh sequence; it has no result to animate.
 if(!view.lastRoll&&sequence===0&&state.sequence>0){state.sequence=0;state.pending=false;state.deadline=0;clearTimeout(state.timer);}
 if(initial){state.sequence=sequence;state.deadline=0;}
 else if(sequence!==state.sequence){state.sequence=sequence;state.pending=false;clearTimeout(state.timer);state.deadline=now+(matchMedia('(prefers-reduced-motion: reduce)').matches?0:DICE_DURATION);}
 if(error){state.pending=false;state.deadline=0;clearTimeout(state.timer);}
 const remaining=Math.max(0,state.deadline-now),busy=state.pending||remaining>0;
 lock(app,busy,targets);
 if(state.pending){const button=app.querySelector(targets.rollSelector);if(button)button.textContent='Tirando…';return;}
 if(!remaining)return;
 // Decaying flight, impacts and rotation simulate weight without influencing the roll.
 // A second die mirrors the throw and spins the other way, so the pair never moves in step.
 const offsets=[0,.22,.45,.62,.76,.88,1],xs=[-18,8,12,-6,3,-1,0],ys=[-5,-28,0,-11,0,-3,0];
 app.querySelectorAll('.die-stage').forEach((stage,n)=>{
  const value=Number(stage.dataset.value)||view.lastRoll.value,flight=stage.querySelector('.die-flight'),cube=stage.querySelector('.die-cube'),shadow=stage.querySelector('.die-shadow'),mirror=n%2?-1:1;
  const animation=flight.animate(offsets.map((offset,i)=>({offset,transform:`translate(${xs[i]*mirror}px,${ys[i]*(n%2?.8:1)}px) rotate(${[-18,12,-8,5,-2,1,0][i]*mirror}deg)`,easing:i%2?'cubic-bezier(.42,0,1,1)':'cubic-bezier(0,0,.58,1)'})),{duration:DICE_DURATION});
  const spin=cube.animate([{transform:orientation(value,540*mirror,720)},{transform:orientation(value)}],{duration:DICE_DURATION,easing:'cubic-bezier(.2,.65,.35,1)'});
  const shade=shadow.animate(offsets.map((offset,i)=>({offset,transform:`scale(${[.8,.48,1,.7,1,.9,1][i]})`,opacity:[.3,.12,.4,.2,.4,.32,.4][i]})),{duration:DICE_DURATION});
  for(const anim of [animation,spin,shade])anim.currentTime=DICE_DURATION-remaining;
 });
 clearTimeout(state.timer);state.timer=setTimeout(()=>{state.deadline=0;lock(app,false,targets);},remaining);
}
