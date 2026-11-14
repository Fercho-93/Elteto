import {publicTurnEvent,viewIdentity,TURN_INTRO,TURN_RESULT,turnTiming,readableTurn} from './turn-events.js';
const navigation=new Set(['catalog-zoom','catalog-close-zoom','catalog-poker-close-bet','catalog-clear','parchis-zoom-open','parchis-zoom-close']);
export const isTurnAction=action=>action==='play-card'||action==='cinquillo-pass'||action==='cinquillo-next-hand'||action.startsWith('mus-')&&!['mus-bet-less','mus-bet-more','mus-target'].includes(action)||action.startsWith('parchis-')&&!navigation.has(action)||action.startsWith('catalog-')&&!navigation.has(action);
// Each device queues only its own redacted snapshots. The host remains authoritative.
// Frases del historial que empiezan por tu nombre se leen en segunda persona.
const VERBS={gana:'Ganas','se chupa':'Te chupas',pilla:'Pillas','se queda sin':'Te quedas sin',pierde:'Pierdes',recoge:'Recoges',sale:'Sales','no tiene':'No tienes',descarta:'Descartas',roba:'Robas',coge:'Coges',cierra:'Cierras',coloca:'Colocas',pide:'Pides',apuesta:'Apuestas',juega:'Juegas',deja:'Dejas',declara:'Declaras','se planta':'Te plantas','se pasa':'Te pasas','enseña':'Enseñas','se abate':'Te abates',cambia:'Cambias',recibe:'Recibes',elige:'Eliges',delega:'Delegas',contra:'Contras',recontra:'Recontras','no contra':'No contras','no recontra':'No recontras',canta:'Cantas',acierta:'Aciertas','pidió':'Pediste','hizo la última':'Hiciste la última','se queda':'Te quedas',reparte:'Repartes'};
const FOLLOW={recoge:'recoges',roba:'robas',forma:'formas',descubre:'descubres','se pasa':'te pasas','se lo lleva':'te lo llevas',cierra:'cierras','se lleva':'te llevas',deja:'dejas',hizo:'hiciste',cumple:'cumples'};
export function secondPerson(text,playerId){
 const safe=playerId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 return text.split(' · ').map(part=>{
  const match=part.match(new RegExp('^'+safe+' ('+Object.keys(VERBS).sort((a,b)=>b.length-a.length).map(v=>v.replace(/ /g,' ')).join('|')+')(?=[\\s.,:;]|$)'));
  if(!match)return part;
  return (VERBS[match[1]]+part.slice(match[0].length)).replace(/( y | e |: )(se lo lleva|se lleva|se pasa|recoge|roba|forma|descubre|cierra|deja|hizo|cumple)(?=[\s.,:;]|$)/g,(_,sep,verb)=>sep+FOLLOW[verb]);
 }).join(' · ');
}
export class TurnSequence {
 constructor({apply,refresh=()=>{},phaseChanged=()=>{},reduced=()=>false,hidden=()=>false,setTimer=(fn,ms)=>setTimeout(fn,ms),clearTimer=id=>clearTimeout(id)}){
  Object.assign(this,{apply,refresh,phaseChanged,reduced,hidden,setTimer,clearTimer});this.reset();
 }
 get busy(){return this.phase!=='idle';}
 reset(){if(this.timer)this.clearTimer(this.timer);this.timer=null;this.queue=[];this.current=null;this.latest=null;this.event=null;this.phase='idle';this.key=null;}
 adopt(change){if(!this.busy){this.current=change;this.latest=change;this.key=viewIdentity(change);}}
 receive(change){
  const key=viewIdentity(change);
  if(!this.current||key!==this.key||this.hidden()){
   this.reset();this.key=key;this.current=this.latest=change;this.apply(change);return;
  }
  const event=publicTurnEvent(this.latest.view,change.view);if(!event&&JSON.stringify(this.latest)===JSON.stringify(change))return;this.latest=change;
  if(!event){if(!this.busy){this.current=change;this.apply(change);}return;}
  this.queue.push({change,event});
  if(!this.busy)this.next();
 }
 next(){
  const next=this.queue.shift();if(!next){if(this.latest!==this.current){this.current=this.latest;this.apply(this.latest);}this.event=null;this.phase='idle';this.phaseChanged();this.refresh();return;}
  const timing=turnTiming(next.event);this.event=next.event;this.phase='announce';this.phaseChanged();
  this.timer=this.setTimer(()=>{
   this.phase='move';this.current=next.change;this.apply(next.change);this.phaseChanged();
   this.timer=this.setTimer(()=>{
    this.phase='result';this.phaseChanged();
    this.timer=this.setTimer(()=>this.next(),timing.result);
   },next.event.motion);
  },timing.intro);
 }
 flush(){const latest=this.latest;this.reset();if(latest){this.key=viewIdentity(latest);this.current=this.latest=latest;this.apply(latest);}}
 decorate(app,playerId,name){
  const root=app.querySelector('.catalog-screen,.game-page,.parchis-screen');if(!root)return;
  root.dataset.turnBusy=String(this.busy);root.dataset.turnPhase=this.phase;
  for(const button of root.querySelectorAll('button[data-action],input[type="number"],.poker-bet-inline input')){
   if(button.tagName==='BUTTON'&&!isTurnAction(button.dataset.action))continue;
   if(!this.busy){if(button.dataset.sequenceLocked==='true'){button.disabled=button.dataset.sequenceAllowed!=='true'||root.dataset.motionBusy==='true';delete button.dataset.sequenceAllowed;delete button.dataset.sequenceLocked;}continue;}
   if(button.dataset.sequenceAllowed===undefined)button.dataset.sequenceAllowed=button.dataset.diceAllowed??button.dataset.motionAllowed??String(!button.disabled);
   button.dataset.sequenceLocked='true';button.disabled=true;
  }
  if(!this.current)return;
  const view=this.current.view,actor=this.busy?this.event.actor:view.finished?null:view.turnPlayer;
  if((this.busy||root.dataset.motionBusy!=='true')&&(view.phase!=='discard'||this.busy))for(const seat of root.querySelectorAll('.rival-seat,.mus-seat,.poker-seat')){
   const active=seat.dataset.playerId===actor;seat.classList.toggle('active-seat',active);
   if(active)seat.setAttribute('aria-current','true');else seat.removeAttribute('aria-current');
   const marker=seat.querySelector('.player-turn-marker');
   if(!active)marker?.remove();else if(!marker){const arrow=document.createElement('span');arrow.className='player-turn-marker';arrow.setAttribute('aria-hidden','true');arrow.textContent='▾';seat.querySelector('.rival-token')?.append(arrow);}
   const label=seat.getAttribute('aria-label')?.replace(/, turno activo$/,'');if(label)seat.setAttribute('aria-label',label+(active?', turno activo':''));
  }
  let status=root.querySelector('.catalog-instruction,.play-instruction,.mus-feedback,.turn-story-slot');
  if(!status&&this.busy){const table=root.querySelector('.game-table,.parchis-table');if(table){status=document.createElement('div');status.className='turn-story-slot';status.setAttribute('aria-live','polite');table.append(status);}}
  if(!status)return;
  if(status.dataset.sequenceOriginal===undefined)status.dataset.sequenceOriginal=status.innerHTML;
  if(!this.busy){if(status.classList.contains('turn-story-slot'))status.remove();else{status.innerHTML=status.dataset.sequenceOriginal;status.classList.remove('turn-story');}return;}
  const event=this.event,own=text=>secondPerson(String(text),playerId),read=t=>readableTurn(own(t),view.players,id=>id===playerId?`${name(id)} (tú)`:name(id));
  status.replaceChildren();status.classList.add('turn-story');status.setAttribute('role','status');
  const label=document.createElement('strong'),detail=document.createElement('span'),progress=document.createElement('i');
  label.className='turn-story-label';label.textContent=`${event.actor===playerId?'Tú':name(event.actor)} · ${this.phase==='announce'?event.action:this.phase==='move'?'En movimiento':'Resultado'}`;
  detail.className='turn-story-detail';detail.textContent=read(this.phase==='announce'?(event.kind==='poker'?event.detail:'Sigue la jugada en la mesa'):this.phase==='result'?event.result:event.detail);
  if(event.kind==='poker'&&this.phase==='result'&&['result','finished'].includes(view.phase)){label.textContent='Mano resuelta';detail.textContent='Premios entregados · resultado sobre la mesa';}
  progress.className='turn-story-progress';progress.setAttribute('aria-hidden','true');for(const step of ['announce','move','result']){const dot=document.createElement('b');dot.classList.toggle('current',step===this.phase);progress.append(dot);}
  status.append(label,detail,progress);
  this.splash(root,playerId,name,read);
 }
 // Aviso sobre el tapete en los juegos de cartas y fichas: quién juega, qué y cómo acaba la jugada.
 splash(root,playerId,name,read){
  const surface=root.matches('.catalog-screen')?root.querySelector('.catalog-surface'):null;
  const event=this.event;
  let box=surface?.querySelector('.turn-splash');
  if(!surface||!this.busy||!event||event.pace!=='cards'&&event.kind!=='speech'){box?.remove();return;}
  const self=event.actor===playerId,phase=this.phase;
  const verb=self?({'Juega carta':'Juegas','Coloca ficha':'Colocas ficha','Recoge la baza':'Recoges la baza','Roba boca abajo':'Robas boca abajo','Descarta':'Descartas','Apuesta':'Apuestas','Hace su jugada':'Tu jugada','Resuelve el turno':'Tu jugada','Declara cartas':'Declaras','Pasa':'Pasas','Cuestiona la jugada':'Cuestionas','Canta':'Cantas','Sin cantar':'Sin cantar','Roba':'Robas','Se chupa las cartas':'Te chupas las cartas'})[event.action]||event.action:event.action;
  const who=self?'':name(event.actor)+' · ';
  const title=phase==='result'?'Resultado':`${who}${verb}`;
  const body=read(phase==='result'?event.result:event.detail);
  // En la mesa de bazas el centro queda libre: el aviso va ahí, sin tapar ninguna carta.
  const host=surface.querySelector('.trick-table')||surface;
  if(box&&box.parentElement!==host){box.remove();box=null;}
  if(!box){box=document.createElement('div');box.className='turn-splash'+(host===surface?'':' is-centred');box.setAttribute('aria-hidden','true');host.append(box);}
  const key=`${event.actor}|${phase}|${body}`;if(box.dataset.key===key)return;box.dataset.key=key;
  box.classList.toggle('is-result',phase==='result');box.classList.toggle('is-self',self);
  box.replaceChildren();const t=document.createElement('small'),b=document.createElement('strong');t.textContent=title;b.textContent=body;box.append(t,b);
  if(!this.reduced())box.animate([{opacity:0,scale:.94},{opacity:1,scale:1}],{duration:260,easing:'cubic-bezier(.2,.7,.3,1)'});
 }
}
