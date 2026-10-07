import {publicTurnEvent,viewIdentity,TURN_INTRO,TURN_RESULT,readableTurn} from './turn-events.js';
const navigation=new Set(['catalog-zoom','catalog-close-zoom','catalog-clear','parchis-zoom-open','parchis-zoom-close']);
export const isTurnAction=action=>action==='play-card'||action==='cinquillo-pass'||action==='cinquillo-next-hand'||action.startsWith('mus-')||action.startsWith('parchis-')&&!navigation.has(action)||action.startsWith('catalog-')&&!navigation.has(action);
// Each device queues only its own redacted snapshots. The host remains authoritative.
export class TurnSequence {
 constructor({apply,refresh=()=>{},phaseChanged=()=>{},reduced=()=>false,hidden=()=>false,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}){
  Object.assign(this,{apply,refresh,phaseChanged,reduced,hidden,setTimer,clearTimer});this.reset();
 }
 get busy(){return this.phase!=='idle';}
 reset(){if(this.timer)this.clearTimer(this.timer);this.timer=null;this.queue=[];this.current=null;this.latest=null;this.event=null;this.phase='idle';this.key=null;}
 adopt(change){if(!this.busy){this.current=change;this.latest=change;this.key=viewIdentity(change);}}
 receive(change){
  const key=viewIdentity(change);
  if(!this.current||key!==this.key||this.reduced()||this.hidden()){
   this.reset();this.key=key;this.current=this.latest=change;this.apply(change);return;
  }
  const event=publicTurnEvent(this.latest.view,change.view);this.latest=change;
  if(!event){if(!this.busy){this.current=change;this.apply(change);}return;}
  this.queue.push({change,event});
  if(!this.busy)this.next();
 }
 next(){
  const next=this.queue.shift();if(!next){this.event=null;this.phase='idle';this.phaseChanged();this.refresh();return;}
  this.event=next.event;this.phase='announce';this.phaseChanged();
  this.timer=this.setTimer(()=>{
   this.phase='move';this.current=next.change;this.apply(next.change);this.phaseChanged();
   this.timer=this.setTimer(()=>{
    this.phase='result';this.phaseChanged();
    this.timer=this.setTimer(()=>this.next(),TURN_RESULT);
   },next.event.motion);
  },TURN_INTRO);
 }
 flush(){const latest=this.latest;this.reset();if(latest){this.key=viewIdentity(latest);this.current=this.latest=latest;this.apply(latest);}}
 decorate(app,playerId,name){
  const root=app.querySelector('.catalog-screen,.game-page,.parchis-screen');if(!root)return;
  root.dataset.turnBusy=String(this.busy);root.dataset.turnPhase=this.phase;
  for(const button of root.querySelectorAll('button[data-action],input[type="number"]')){
   if(button.tagName==='BUTTON'&&!isTurnAction(button.dataset.action))continue;
   if(!this.busy){if(button.dataset.sequenceLocked==='true'){button.disabled=button.dataset.sequenceAllowed!=='true'||root.dataset.motionBusy==='true';delete button.dataset.sequenceAllowed;delete button.dataset.sequenceLocked;}continue;}
   if(button.dataset.sequenceAllowed===undefined)button.dataset.sequenceAllowed=button.dataset.diceAllowed??button.dataset.motionAllowed??String(!button.disabled);
   button.dataset.sequenceLocked='true';button.disabled=true;
  }
  if(!this.current)return;
  const view=this.current.view,actor=this.busy?this.event.actor:view.finished?null:view.turnPlayer;
  if((this.busy||root.dataset.motionBusy!=='true')&&(view.phase!=='discard'||this.busy))for(const seat of root.querySelectorAll('.rival-seat')){
   const active=seat.dataset.playerId===actor;seat.classList.toggle('active-seat',active);
   if(active)seat.setAttribute('aria-current','true');else seat.removeAttribute('aria-current');
   const marker=seat.querySelector('.player-turn-marker');
   if(!active)marker?.remove();else if(!marker){const arrow=document.createElement('span');arrow.className='player-turn-marker';arrow.setAttribute('aria-hidden','true');arrow.textContent='▾';seat.querySelector('.rival-token')?.append(arrow);}
   const label=seat.getAttribute('aria-label')?.replace(/, turno activo$/,'');if(label)seat.setAttribute('aria-label',label+(active?', turno activo':''));
  }
  let status=root.querySelector('.catalog-instruction,.play-instruction,.turn-story-slot');
  if(!status&&this.busy){const table=root.querySelector('.game-table,.parchis-table');if(table){status=document.createElement('div');status.className='turn-story-slot';status.setAttribute('aria-live','polite');table.append(status);}}
  if(!status)return;
  if(status.dataset.sequenceOriginal===undefined)status.dataset.sequenceOriginal=status.innerHTML;
  if(!this.busy){if(status.classList.contains('turn-story-slot'))status.remove();else{status.innerHTML=status.dataset.sequenceOriginal;status.classList.remove('turn-story');}return;}
  const event=this.event,read=t=>readableTurn(t,view.players,name);
  status.replaceChildren();status.classList.add('turn-story');status.setAttribute('role','status');
  const label=document.createElement('strong'),detail=document.createElement('span'),progress=document.createElement('i');
  label.className='turn-story-label';label.textContent=`${event.actor===playerId?'Tú':name(event.actor)} · ${this.phase==='announce'?event.action:this.phase==='move'?'En movimiento':'Resultado'}`;
  detail.className='turn-story-detail';detail.textContent=read(this.phase==='announce'?'Sigue la jugada en la mesa':this.phase==='result'?event.result:event.detail);
  progress.className='turn-story-progress';progress.setAttribute('aria-hidden','true');for(const step of ['announce','move','result']){const dot=document.createElement('b');dot.classList.toggle('current',step===this.phase);progress.append(dot);}
  status.append(label,detail,progress);
 }
}
