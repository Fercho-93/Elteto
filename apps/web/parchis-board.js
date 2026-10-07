import {renderParchisDie,finishDiceRender} from './parchis-dice.js';
import {DICE_DURATION,PAWN_STEP,PIECE_TRANSFER,settledFrames} from './game-physics.js';
import {parchisRoutes} from './turn-events.js';
import {escapeHtml as esc,mascotForSeat,MASCOTS} from './table-view.js';
import {renderRivalRoster,revealActivePlayer} from './rival-portraits.js';
import {PARCHIS_STARTS,PARCHIS_SAFE,parchisSquare} from './game-core/index.js';
export const PARCHIS_PALETTE={yellow:{name:'Amarillo',fill:'#e8b942',ink:'#392c10'},green:{name:'Verde',fill:'#439968',ink:'#102d20'},red:{name:'Rojo',fill:'#cf6260',ink:'#461b1b'},blue:{name:'Azul',fill:'#568ec5',ink:'#152c49'}};
export const TRACK=[];
for(let r=18;r>=11;r--)TRACK.push([10,r]);
for(let c=11;c<=18;c++)TRACK.push([c,10]);TRACK.push([18,9]);
for(let c=18;c>=11;c--)TRACK.push([c,8]);
for(let r=7;r>=0;r--)TRACK.push([10,r]);TRACK.push([9,0]);
for(let r=0;r<=7;r++)TRACK.push([8,r]);
for(let c=7;c>=0;c--)TRACK.push([c,8]);TRACK.push([0,9]);
for(let c=0;c<=7;c++)TRACK.push([c,10]);
for(let r=11;r<=18;r++)TRACK.push([8,r]);TRACK.push([9,18]);
const NEST={yellow:[15,15],green:[15,4],red:[4,4],blue:[4,15]};
function lane(color,n){return color==='yellow'?[9,17-n]:color==='green'?[17-n,9]:color==='red'?[9,1+n]:[1+n,9];}
export function pawnPoint(color,progress,piece){
 if(progress===-1){const [x,y]=NEST[color];return [x+(piece%2?1.15:-1.15),y+(piece<2?-1.15:1.15)];}
 if(progress===71){const positions={yellow:[9.5,10.25],green:[10.25,9.5],red:[9.5,8.75],blue:[8.75,9.5]},[x,y]=positions[color];return [x+(piece%2?.18:-.18),y+(piece<2?-.18:.18)];}
 const square=parchisSquare(color,progress),[x,y]=square===null?lane(color,progress-64):TRACK[square];return [x+.5,y+.5];
}
// Drawing and animation share the same centring, stack offsets and sizes.
export function pawnPlacement(view,id,piece,progress=view.pieces[id][piece]){
 const [x,y]=pawnPoint(view.colors[id],progress,piece),peers=[];
 for(const player of view.players)for(let index=0;index<4;index++){
  const point=player===id&&index===piece?[x,y]:pawnPoint(view.colors[player],view.pieces[player][index],index);
  if(point[0]===x&&point[1]===y)peers.push(`${player}:${index}`);
 }
 const stacked=peers.length===2,offset=stacked?(peers.indexOf(`${id}:${piece}`)? .3:-.3):0,vertical=x<8||x>11;
 const size=progress<0?'7%':progress===71?'2.2%':stacked?'2.7%':'4.3%';
 return {left:`${(boardAxis(x)+.5+(vertical?0:offset))/20*100}%`,top:`${(boardAxis(y)+.5+(vertical?offset:0))/20*100}%`,width:size,height:size,stacked};
}
// Wider lanes use the same logical squares; only their drawn proportions change.
export const boardAxis=n=>n<=8?n*.8875:n<=11?7.1+(n-8)*1.6:11.9+(n-11)*.8875;
const cellRect=(x,y)=>`x="${boardAxis(x)}" y="${boardAxis(y)}" width="${boardAxis(x+1)-boardAxis(x)}" height="${boardAxis(y+1)-boardAxis(y)}"`;
export function renderParchisBoard(view,playerId,name){
 let svg='<svg viewBox="-.5 -.5 20 20" aria-hidden="true"><defs><radialGradient id="board-paper"><stop stop-color="#f8f0d9"/><stop offset="1" stop-color="#d9c8a7"/></radialGradient></defs><rect x="-.4" y="-.4" width="19.8" height="19.8" rx=".5" fill="#6c4b31"/><rect x="-.15" y="-.15" width="19.3" height="19.3" rx=".3" fill="url(#board-paper)" stroke="#bc9b64" stroke-width=".08"/>';
 for(const [color,[x,y]] of Object.entries(NEST)){
  const p=PARCHIS_PALETTE[color],used=Object.values(view.colors).includes(color);
  svg+=`<g opacity="${used?1:.45}"><rect x="${boardAxis(x-3.7)}" y="${boardAxis(y-3.7)}" width="${boardAxis(x+3.7)-boardAxis(x-3.7)}" height="${boardAxis(y+3.7)-boardAxis(y-3.7)}" rx=".5" fill="${p.fill}" fill-opacity=".22" stroke="${p.fill}" stroke-width=".09"/><circle cx="${boardAxis(x)}" cy="${boardAxis(y)}" r="2.5" fill="${p.fill}" fill-opacity=".12" stroke="${p.fill}" stroke-width=".04"/><text x="${boardAxis(x)}" y="${boardAxis(y+3.25)}" text-anchor="middle" font-size=".4" font-weight="600" fill="${p.ink}">${p.name.toUpperCase()}</text></g>`;
  for(let n=0;n<7;n++){const [cx,cy]=lane(color,n);svg+=`<rect ${cellRect(cx,cy)} fill="${p.fill}" fill-opacity=".65" stroke="#746146" stroke-width=".035"/>`;}
 }
 TRACK.forEach(([x,y],i)=>{const color=Object.keys(PARCHIS_STARTS).find(c=>PARCHIS_STARTS[c]===i),safe=PARCHIS_SAFE.includes(i);svg+=`<rect ${cellRect(x,y)} fill="${color?PARCHIS_PALETTE[color].fill:safe?'#e6d6b5':'#f7efdc'}" stroke="#746146" stroke-width=".035"/>${safe?`<circle cx="${boardAxis(x+.5)}" cy="${boardAxis(y+.5)}" r=".32" fill="none" stroke="#8b7853" stroke-width=".04"/>`:''}<text x="${boardAxis(x+.5)}" y="${boardAxis(y)+.44}" text-anchor="middle" fill="#51432e" font-size=".46" font-weight="600">${i+1}</text>`;});
 for(const [color,points] of Object.entries({yellow:'8,11 11,11 9.5,9.5',green:'11,8 11,11 9.5,9.5',red:'8,8 11,8 9.5,9.5',blue:'8,8 8,11 9.5,9.5'})){const mapped=points.split(' ').map(pair=>pair.split(',').map(Number).map(boardAxis).join(',')).join(' ');svg+=`<polygon points="${mapped}" fill="${PARCHIS_PALETTE[color].fill}" stroke="#746146" stroke-width=".035"/>`;}
 svg+='<circle cx="9.5" cy="9.5" r=".32" fill="#f3e3b9"/><text x="9.5" y="9.61" text-anchor="middle" font-size=".3" fill="#6b542f">★</text></svg>';
 const tokens=[];
 for(const id of view.players)for(let piece=0;piece<4;piece++){
  const progress=view.pieces[id][piece],color=view.colors[id],position=pawnPlacement(view,id,piece),legal=id===playerId&&view.legalMoves.some(m=>m.piece===piece),label=`${name(id)}, ficha ${piece+1}, ${progress<0?'en espera':progress===71?'en meta':progress<64?'casilla '+(parchisSquare(color,progress)+1):'pasillo de llegada'}`;
  tokens.push(`<button class="parchis-pawn ${legal?'can-move':''} ${position.stacked?'stacked':''} ${progress===71?'at-goal':progress<0?'in-nest':''}" style="--pawn-color:${PARCHIS_PALETTE[color].fill};left:${position.left};top:${position.top}" data-action="parchis-move" data-piece="${piece}" data-pawn="${esc(id)}:${piece}" ${legal?'':'disabled'} aria-label="${esc(label)}">${piece+1}</button>`);
 }
 return `<div class="parchis-board" aria-label="Tablero de Parchís de 68 casillas y cuatro colores">${svg}${tokens.join('')}</div>`;
}
function readable(line,view,name){for(const id of [...view.players].sort((a,b)=>b.length-a.length)){const pattern=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');line=line.replace(new RegExp(`(^|[^\\w-])${pattern}(?=$|[^\\w-])`,'g'),(_,prefix)=>prefix+name(id));}return line;}
const travelContexts=new WeakMap();
function finishParchisTravel(app,view){
 const key=view.players.join('|'),now=performance.now();let state=travelContexts.get(app);
 if(!state||state.key!==key||!view.lastRoll){state={key,view,flights:[]};travelContexts.set(app,state);return;}
 const before=state.view,changes=parchisRoutes(before,view),newRoll=view.lastRoll.sequence!==before.lastRoll?.sequence;
 if(changes.length){
  const forward=Math.max(0,...changes.filter(p=>p.to>=0).map(p=>p.duration));
  state.flights=changes.map(p=>({...p,started:now,delay:(newRoll?DICE_DURATION:0)+(p.to<0?forward:0),steps:p.route.slice(1).map(()=>p.route.length>2?PAWN_STEP:PIECE_TRANSFER),points:p.route.map((progress,i)=>pawnPlacement(i===0?before:view,p.player,p.piece,progress))}));
  // A stationary partner slides into/out of its half of a shared square at arrival/departure.
  for(const player of view.players)for(let piece=0;piece<4;piece++){
   if(changes.some(p=>p.player===player&&p.piece===piece))continue;
   const from=pawnPlacement(before,player,piece),to=pawnPlacement(view,player,piece);
   if(from.left===to.left&&from.top===to.top&&from.width===to.width)continue;
   const arriving=changes.some(p=>p.to>=0&&pawnPoint(view.colors[p.player],p.to,p.piece).join(',')===pawnPoint(view.colors[player],view.pieces[player][piece],piece).join(','));
   state.flights.push({player,piece,started:now,duration:PAWN_STEP,delay:(newRoll?DICE_DURATION:0)+(arriving?Math.max(0,forward-PAWN_STEP):0),steps:[PAWN_STEP],points:[from,to]});
  }
 }
 state.view=view;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 for(const flight of state.flights){
  const el=[...app.querySelectorAll('.parchis-table [data-pawn]')].find(el=>el.dataset.pawn===`${flight.player}:${flight.piece}`);if(!el)continue;
  el.classList.add('parchis-last-move');
  const elapsed=now-flight.started;if(elapsed>=flight.delay+flight.duration)continue;
  el.classList.add('piece-travelling');
  const animation=el.animate(settledFrames(flight.points,({left,top,width,height})=>({left,top,width,height}),flight.steps),{duration:flight.duration,delay:flight.delay,fill:'backwards'});animation.currentTime=elapsed;
 }
}
export function renderParchisScreen(app,view,playerId,name,error=''){
 const menuOpen=app.querySelector('.game-menu')?.open,zoomOpen=app.querySelector('.parchis-zoom')?.open;
 const mine=view.colors[playerId],own=view.players.indexOf(playerId),active=view.turnPlayer===playerId&&!view.finished,rolling=view.phase==='roll'||view.phase==='start';
 const rivals=Array.from({length:view.players.length},(_,offset)=>{const index=(own+offset)%view.players.length,id=view.players[index],character=mascotForSeat(view.players,index);return {id,isSelf:id===playerId,roll:(view.phase==='start'||view.lastRoll?.initial)?view.startingRolls[id]??(view.startingCandidates?.includes(id)===false?'—':'…'):undefined,character,mascot:MASCOTS[character],name:name(id),count:view.pieces[id].filter(p=>p===71).length,unit:'en meta',teamLabel:PARCHIS_PALETTE[view.colors[id]].name,active:!view.finished&&view.turnPlayer===id};});
 const board=renderParchisBoard(view,playerId,name);
 const instruction=view.finished?`${name(view.winner)} ha llevado sus cuatro fichas a meta.`:view.phase==='start'?`${(view.initialRound??1)>1?'Desempate':'Tirada inicial'}: ${active?'tira tú':'tira '+name(view.turnPlayer)}. Empieza la mayor.`:view.phase==='bonus'?`Bonificación: avanza ${view.bonuses[0]} casillas.`:view.phase==='move'?`Elige una ficha para avanzar ${view.die===6&&!view.pieces[view.turnPlayer].includes(-1)?7:view.die}.`:view.lastRoll?.initial&&view.phase==='roll'?`${name(view.turnPlayer)} empieza con ${view.startingRolls[view.turnPlayer]}. Tira para mover.`:view.die===6&&view.sixes>0?(active?'Has sacado 6. Vuelve a tirar.':`${name(view.turnPlayer)} ha sacado 6. Vuelve a tirar.`):'Tira el dado para mover tus fichas.';
 app.innerHTML=`<section class="parchis-screen"><header class="play-header"><div class="play-title"><h1><span>ELTETO</span> Parchís</h1><p class="parchis-subtitle">Tu color: ${PARCHIS_PALETTE[mine].name} · ${view.pieces[playerId].filter(p=>p===71).length}/4 en meta</p></div><button data-action="parchis-zoom-open" aria-label="Ampliar el tablero de Parchís">Tablero ↗</button><button class="game-menu-button" data-action="open-game-menu" aria-label="Jugadores, reglas y opciones">⋯</button></header><section class="parchis-info" aria-label="Jugadores y turno">${renderRivalRoster(rivals,esc)}<div class="player-turn-announcement" role="status">${esc(instruction)}</div><div class="parchis-status"><p role="alert"></p></div>${error?`<p class="error-message" role="alert">${esc(error)}</p>`:''}</section><section class="parchis-table" aria-label="Mesa de Parchís">${board}</section><section class="parchis-dock" aria-label="Dado y movimientos"><div class="parchis-actions">${renderParchisDie(view,name)}<button class="dice-roll-button" title="Tirar dado" aria-label="Tirar dado" data-action="parchis-roll" data-roll-sequence="${view.lastRoll?.sequence??0}" ${active&&rolling?'':'disabled'}>Tirar</button></div>${!rolling&&!view.finished?`<div class="parchis-piece-choices" role="group" aria-label="Elegir ficha">${[0,1,2,3].map(piece=>{const move=view.legalMoves.find(m=>m.piece===piece);return `<button data-action="parchis-move" data-piece="${piece}" ${active&&move?'':'disabled'} style="--pawn-color:${PARCHIS_PALETTE[mine].fill}"><i>${piece+1}</i><span>${move?move.from===-1?'Salir':move.to===71?'Meta':`Mover ${move.steps}`:'Ficha '+(piece+1)}</span></button>`;}).join('')}</div>`:''}</section><dialog class="game-menu"><header><h2>Tu partida de Parchís</h2><button data-action="close-game-menu">Volver</button></header><div class="game-menu-content"><ol class="scoreboard">${view.players.map(id=>`<li><span>${esc(name(id))} · ${PARCHIS_PALETTE[view.colors[id]].name}</span><strong>${view.pieces[id].filter(p=>p===71).length}/4</strong></li>`).join('')}</ol><details><summary>Reglas de esta mesa</summary><p>Salida con 5; el 6 repite y cuenta 7 si no quedan fichas en espera. Tres seises devuelven la última ficha movida a la espera. Barreras de dos fichas del mismo color: no se atraviesan y deben abrirse con 6. Captura fuera de seguros: +20. Meta exacta: +10. Gana quien lleva cuatro fichas a meta.</p><a href="./reglas_juegos/lectura/parchis.html">Reglamento original</a><p>Tablero clásico de 68 casillas, seguros señalados con círculo y pasillos de siete casillas. Máximo dos fichas por casilla. Con 5 puedes elegir salir o mover. Sin captura en salidas seguras. Las bonificaciones se usan completas si hay movimiento válido. En la tirada inicial, los empatados repiten.</p></details><details><summary>Historial</summary><ol>${view.log.slice().reverse().map(line=>`<li>${esc(readable(line,view,name))}</li>`).join('')}</ol></details><button class="leave-game" data-action="leave-room">${view.finished?'Volver al inicio':'Salir de la partida'}</button></div></dialog><dialog class="parchis-zoom" aria-label="Tablero ampliado"><header><h2>Parchís · tablero ampliado</h2><button data-action="parchis-zoom-close">Volver</button></header><div class="parchis-zoom-scroll">${board.replaceAll('data-pawn=','data-zoom-pawn=').replaceAll('board-paper','zoom-paper')}</div><p>Desliza para explorar el tablero. Los botones de ficha también permiten mover sin tocar casillas pequeñas.</p></dialog></section>`;
 finishDiceRender(app,view,error);
 revealActivePlayer(app);
 const menu=app.querySelector('.game-menu'),zoom=app.querySelector('.parchis-zoom');if(menuOpen)menu.showModal();if(zoomOpen)zoom.showModal();
 menu.addEventListener('close',()=>app.querySelector('.game-menu-button')?.focus({preventScroll:true}));
 zoom.addEventListener('close',()=>app.querySelector('[data-action="parchis-zoom-open"]')?.focus({preventScroll:true}));
 finishParchisTravel(app,view);
}
