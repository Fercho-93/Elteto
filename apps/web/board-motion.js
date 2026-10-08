import {DICE_DURATION,PAWN_STEP,CHECKER_STEP,PIECE_TRANSFER,CAPTURE_FADE,settledFrames,gooseFlights} from './game-physics.js';
import {goosePoint,gooseRadius} from './board-games.js';
import {finishDiceRender,OCA_DICE_TARGETS} from './parchis-dice.js';

const contexts=new WeakMap();
const publicContexts=new WeakMap();
const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
// Capture public positions before replacing the DOM. Private hands are excluded.
export function preparePublicMotion(app,view){
 const key=`${view.id}:${view.players.join('|')}:${view.handNumber}`;
 let state=publicContexts.get(app);const fresh=!state||state.key!==key;
 if(fresh){state={key,keys:null,turn:null,flights:new Map(),ghosts:new Map()};publicContexts.set(app,state);}
 const seat=[...app.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===state.turn);
 state.origin=seat?.getBoundingClientRect();
 state.before=fresh?new Map():new Map([...app.querySelectorAll('.catalog-surface [data-public-piece]')].filter(el=>!el.closest('.capture-receipt')).map(el=>[el.dataset.publicPiece,{html:el.outerHTML,rect:el.getBoundingClientRect()}]));
 return state;
}
export function finishPublicMotion(app,view,state){
 const cards=[...app.querySelectorAll('.catalog-surface [data-public-piece]')],keys=new Set(cards.map(el=>el.dataset.publicPiece)),now=performance.now();
 const dominoAdded=view.boardKind==='domino'&&state.keys&&cards.some(el=>!state.keys.has(el.dataset.publicPiece));
 for(const card of cards){
  const key=card.dataset.publicPiece;
  if(state.keys&&!state.keys.has(key)&&state.origin)state.flights.set(key,{started:now,origin:state.origin});
  if(dominoAdded&&state.keys.has(key)){const old=state.before.get(key)?.rect,next=card.getBoundingClientRect();if(old&&Math.hypot(old.x-next.x,old.y-next.y)>1)state.flights.set(key,{started:now,origin:old,slide:true});}
  const flight=state.flights.get(key);if(!flight||reduced())continue;
  const duration=key.startsWith('tile-')?PIECE_TRANSFER:700;
  const elapsed=now-flight.started;if(elapsed>=duration){state.flights.delete(key);continue;}
  const destination=card.getBoundingClientRect(),origin=flight.origin;
  const frames=flight.slide?[{transform:`translate(${origin.x-destination.x}px,${origin.y-destination.y}px)`},{transform:'none'}]:[{transform:`translate(${origin.x+origin.width/2-destination.x-destination.width/2}px,${origin.y+origin.height/2-destination.y-destination.height/2}px) rotate(-10deg) scale(.75)`,opacity:.7},{transform:'translate(0,0) rotate(3deg) scale(1.05)',offset:.8},{transform:'none',opacity:1}];
  const animation=card.animate(frames,{duration,easing:'cubic-bezier(.2,.8,.2,1)'});
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
 const signature=move?view.boardKind==='oca'?String(move.sequence):`${move.player}:${move.path.join(',')}:${move.captures.join(',')}`:null;
 const initial=state.key!==key||!move;
 if(initial){clearTimeout(state.timer);state.key=key;state.signature=signature;state.deadline=0;state.timeline=null;}
 const fresh=!initial&&signature!==state.signature;
 const before=state.view;
 Object.assign(state,{view,playerId,name,error});
 if(fresh){
  state.signature=signature;state.actor=move.player;
  const started=performance.now();
  if(view.boardKind==='oca'){
   const flights=gooseFlights(before,view,move),placement=(snapshot,player,n=snapshot.positions[player])=>{const peers=view.players.filter(p=>p===player||snapshot.positions[p]===n);return {point:goosePoint(n,peers.indexOf(player),peers.length),radius:gooseRadius(peers.length)};};
   // Partners make room at arrival and regroup at departure, without jumping.
   for(const player of view.players){
    if(flights.some(f=>f.player===player))continue;
    const from=placement(before,player),to=placement(view,player);
    if(from.point.join(',')===to.point.join(',')&&from.radius===to.radius)continue;
    const arriving=view.positions[player]===view.positions[move.player];
    flights.push({player,route:[before.positions[player],view.positions[player]],steps:[PAWN_STEP],duration:PAWN_STEP,delay:DICE_DURATION+(arriving?Math.max(0,flights[0].duration-PAWN_STEP):0)});
   }
   for(const f of flights){f.points=f.route.map((n,i)=>placement(i===0?before:view,f.player,n).point);f.radii=[placement(before,f.player).radius,placement(view,f.player).radius];}
   state.timeline={started,flights};state.deadline=started+Math.max(...flights.map(f=>f.delay+f.duration))+500;
  }else{
   const route=move.path,steps=route.slice(1).map(()=>CHECKER_STEP),duration=steps.length*CHECKER_STEP;
   state.timeline={started,route,steps,duration,captured:move.captures.map((square,i)=>({square,piece:before.board[square],delay:(i+1)*CHECKER_STEP}))};
   state.deadline=started+duration+(move.captures.length?CAPTURE_FADE:0)+500;
  }
 }
 if(error||reduced())state.deadline=0;
 const remaining=Math.max(0,state.deadline-performance.now());busy(app,state,remaining>0);
 clearTimeout(state.timer);
 if(!remaining)return;
 const elapsed=performance.now()-state.timeline.started;
 if(view.boardKind==='oca'){
  for(const flight of state.timeline.flights){
   if(elapsed>=flight.delay+flight.duration)continue;
   const node=[...app.querySelectorAll('.catalog-surface [data-goose-player]')].find(el=>el.dataset.goosePlayer===flight.player);
   if(node){node.classList.add('piece-travelling');const animation=node.animate(settledFrames(flight.points,([x,y])=>({transform:`translate(${x}px,${y}px)`}),flight.steps),{duration:flight.duration,delay:flight.delay,fill:'backwards'});animation.currentTime=elapsed;
    if(flight.radii[0]!==flight.radii[1]){const resize=node.querySelector('.goose-counter').animate(flight.radii.map(r=>({transform:`scale(${r/27})`})),{duration:flight.duration,delay:flight.delay,fill:'backwards',easing:'ease-in-out'});resize.currentTime=elapsed;}
   }
  }
 }else{
  const {route,steps,duration,captured}=state.timeline,node=app.querySelector(`.catalog-surface [data-checker-at="${route.at(-1)}"]`);
  if(node&&elapsed<duration){
   const size=(app.querySelector('.catalog-surface .checkers-board').getBoundingClientRect().width-6)/8,last=route.at(-1);
   node.classList.add('piece-travelling');
   const animation=node.animate(settledFrames(route,square=>({translate:`${(square%8-last%8)*size}px ${(Math.floor(square/8)-Math.floor(last/8))*size}px`}),steps),{duration,fill:'backwards'});animation.currentTime=elapsed;
  }
  for(const capture of captured){
   if(elapsed>=capture.delay+CAPTURE_FADE)continue;
   const stage=app.querySelector('.catalog-surface .checkers-stage'),square=stage.querySelector(`[data-square="${capture.square}"]`),rect=square.getBoundingClientRect(),origin=stage.getBoundingClientRect(),ghost=document.createElement('span');
   ghost.className=`checker-piece checker-captured ${capture.piece>0?'white':'black'}`;ghost.setAttribute('aria-hidden','true');ghost.textContent=Math.abs(capture.piece)===2?'♛':'';
   Object.assign(ghost.style,{left:rect.x-origin.x+rect.width/2+'px',top:rect.y-origin.y+rect.height/2+'px',width:(node?.getBoundingClientRect().width||rect.width*.8)+'px',height:(node?.getBoundingClientRect().height||rect.height*.8)+'px'});stage.append(ghost);
   const animation=ghost.animate([{opacity:1,scale:'1',transform:'translateY(0)'},{opacity:0,scale:'.6',transform:'translateY(3px)'}],{delay:capture.delay,duration:CAPTURE_FADE,fill:'both',easing:'ease-in'});animation.currentTime=elapsed;animation.onfinish=()=>ghost.remove();
  }
 }
 state.timer=setTimeout(()=>{state.deadline=0;busy(app,state,false);if(state.view.boardKind==='oca')finishDiceRender(app,state.view,state.error,OCA_DICE_TARGETS);},remaining);
}
