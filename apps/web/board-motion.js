import {goosePoint} from './board-games.js';
import {finishDiceRender,OCA_DICE_TARGETS} from './parchis-dice.js';

const contexts=new WeakMap();
const publicContexts=new WeakMap();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// Capture public positions before replacing the DOM. Private hands are excluded.
export function preparePublicMotion(app,view){
 const key=`${view.id}:${view.players.join('|')}:${view.handNumber}`;
 let state=publicContexts.get(app);
 if(!state||state.key!==key){state={key,keys:null,turn:null,flights:new Map(),ghosts:new Map()};publicContexts.set(app,state);}
 const seat=[...app.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===state.turn);
 state.origin=seat?.getBoundingClientRect();
 state.before=new Map([...app.querySelectorAll('.catalog-surface [data-public-piece]')].filter(el=>!el.closest('.capture-receipt')).map(el=>[el.dataset.publicPiece,{html:el.outerHTML,rect:el.getBoundingClientRect()}]));
 return state;
}
export function finishPublicMotion(app,view,state){
 const cards=[...app.querySelectorAll('.catalog-surface [data-public-piece]')],keys=new Set(cards.map(el=>el.dataset.publicPiece)),now=performance.now();
 for(const card of cards){
  const key=card.dataset.publicPiece;
  if(state.keys&&!state.keys.has(key)&&state.origin)state.flights.set(key,{started:now,origin:state.origin});
  const flight=state.flights.get(key);if(!flight||reduced())continue;
  const elapsed=now-flight.started;if(elapsed>=700){state.flights.delete(key);continue;}
  const destination=card.getBoundingClientRect(),origin=flight.origin;
  const animation=card.animate([{transform:`translate(${origin.x+origin.width/2-destination.x-destination.width/2}px,${origin.y+origin.height/2-destination.y-destination.height/2}px) rotate(-10deg) scale(.75)`,opacity:.7},{transform:'translate(0,0) rotate(3deg) scale(1.05)',offset:.8},{transform:'none',opacity:1}],{duration:700,easing:'cubic-bezier(.2,.8,.2,1)'});
  animation.currentTime=elapsed;
 }
 for(const key of state.flights.keys())if(!keys.has(key))state.flights.delete(key);
 if(['capture','tricks'].includes(view.boardKind)&&!reduced()){
  const collector=view.boardKind==='tricks'?view.turnPlayer:state.turn;
  const seat=[...app.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===collector),target=seat?.getBoundingClientRect();
  if(target)for(const [key,old] of state.before)if(!keys.has(key)&&!state.ghosts.has(key))state.ghosts.set(key,{...old,target,started:now,delay:view.boardKind==='capture'?700:0});
  for(const [key,ghost] of state.ghosts){
   const elapsed=now-ghost.started;if(elapsed>=ghost.delay+500){state.ghosts.delete(key);continue;}
   const holder=document.createElement('div');holder.innerHTML=ghost.html;const el=holder.firstElementChild;el.classList.add('turn-public-ghost');el.removeAttribute('data-action');el.removeAttribute('data-public-piece');el.setAttribute('aria-hidden','true');el.tabIndex=-1;
   Object.assign(el.style,{left:ghost.rect.x+'px',top:ghost.rect.y+'px',width:ghost.rect.width+'px',height:ghost.rect.height+'px'});app.append(el);
   const animation=el.animate([{transform:'none',opacity:1},{transform:`translate(${ghost.target.x+ghost.target.width/2-ghost.rect.x-ghost.rect.width/2}px,${ghost.target.y+ghost.target.height/2-ghost.rect.y-ghost.rect.height/2}px) scale(.35) rotate(10deg)`,opacity:0}],{duration:500,delay:ghost.delay,easing:'ease-in',fill:'both'});animation.currentTime=elapsed;animation.onfinish=()=>el.remove();
  }
 }
 state.keys=keys;state.turn=view.turnPlayer;
}
function indicateTurn(root,player){
 for(const seat of root.querySelectorAll('.rival-seat')){
  const active=seat.dataset.playerId===player;seat.classList.toggle('active-seat',active);
  const marker=seat.querySelector('.player-turn-marker');
  if(active){seat.setAttribute('aria-current','true');if(!marker){const arrow=document.createElement('span');arrow.className='player-turn-marker';arrow.setAttribute('aria-hidden','true');arrow.textContent='▾';seat.querySelector('.rival-token').append(arrow);}}
  else{seat.removeAttribute('aria-current');marker?.remove();}
  const label=seat.getAttribute('aria-label').replace(/, turno activo$/,'');seat.setAttribute('aria-label',label+(active?', turno activo':''));
 }
}
function busy(app,state,on){
 const root=app.querySelector('.catalog-screen');if(!root||root.dataset.game!==state.view.id)return;
 root.dataset.motionBusy=String(on);
 indicateTurn(root,on||root.dataset.turnBusy==='true'?state.actor:state.view.finished?null:state.view.turnPlayer);
 for(const button of root.querySelectorAll('.catalog-options button,.checkers-cancel')){
  if(button.dataset.motionAllowed===undefined)button.dataset.motionAllowed=String(!button.disabled);
  if(state.view.boardKind==='oca'&&button.dataset.diceAllowed===undefined)button.dataset.diceAllowed=button.dataset.motionAllowed;
  button.disabled=on||root.dataset.turnBusy==='true'||button.dataset.motionAllowed!=='true';
 }
 const turn=root.querySelector('.catalog-turn');
 if(turn)turn.textContent=on&&state.actor?`${state.name(state.actor)} ${state.view.boardKind==='oca'?'tira y mueve':'mueve'}`:state.view.turnPlayer===state.playerId?'Tu turno':'Turno de '+state.name(state.view.turnPlayer);
}
export function finishBoardMotion(app,view,playerId,name,error){
 if(!['oca','checkers'].includes(view.boardKind)){const old=contexts.get(app);if(old){clearTimeout(old.timer);old.key=null;old.deadline=0;}return;}
 let state=contexts.get(app);if(!state){state={key:null,signature:null,deadline:0,timer:null};contexts.set(app,state);}
 const key=`${view.id}:${view.players.join('|')}:${view.handNumber}`,move=view.boardKind==='oca'?view.lastRoll:view.lastMove;
 const signature=move?view.boardKind==='oca'?String(move.sequence):`${move.player}:${move.path.join(',')}:${view.log.length}:${view.log.at(-1)}`:null;
 const initial=state.key!==key||!move;
 if(initial){clearTimeout(state.timer);state.key=key;state.signature=signature;state.deadline=0;state.timeline=null;}
 const fresh=!initial&&signature!==state.signature;
 Object.assign(state,{view,playerId,name,error});
 if(fresh){
  state.signature=signature;state.actor=move.player;
  const route=view.boardKind==='oca'?(move.route||[move.from||view.positions[move.player],view.positions[move.player]]):move.path;
  const delay=view.boardKind==='oca'?840:0,step=view.boardKind==='oca'?160:220;
  state.timeline={route,delay,duration:Math.max(220,(route.length-1)*step),started:performance.now()};
  state.deadline=reduced()?0:state.timeline.started+delay+state.timeline.duration+500;
 }
 if(error||reduced())state.deadline=0;
 const remaining=Math.max(0,state.deadline-performance.now());busy(app,state,remaining>0);
 clearTimeout(state.timer);
 if(!remaining)return;
 const elapsed=performance.now()-state.timeline.started,{route,delay,duration}=state.timeline;
 if(elapsed<delay+duration){
  let node,frames;
  if(view.boardKind==='oca'){
   node=[...app.querySelectorAll('.catalog-surface [data-goose-player]')].find(el=>el.dataset.goosePlayer===state.actor);
   if(node){const finalPosition=view.positions[state.actor],peers=view.players.filter(p=>view.positions[p]===finalPosition),seat=peers.indexOf(state.actor);frames=route.map((position,i)=>{const [x,y]=goosePoint(position,seat,peers.length);return {offset:i/(route.length-1||1),transform:`translate(${x}px,${y}px)`};});}
  }else{
   node=app.querySelector(`.catalog-surface [data-checker-at="${route.at(-1)}"]`);
   if(node){const size=app.querySelector('.catalog-surface .checkers-board').getBoundingClientRect().width/8,last=route.at(-1);frames=route.map((square,i)=>({offset:i/(route.length-1||1),translate:`${(square%8-last%8)*size}px ${(Math.floor(square/8)-Math.floor(last/8))*size}px`}));}
  }
  if(node&&frames){const animation=node.animate(frames,{duration,delay,easing:'linear',fill:'backwards'});animation.currentTime=elapsed;}
 }
 state.timer=setTimeout(()=>{state.deadline=0;busy(app,state,false);if(state.view.boardKind==='oca')finishDiceRender(app,state.view,state.error,OCA_DICE_TARGETS);},remaining);
}
