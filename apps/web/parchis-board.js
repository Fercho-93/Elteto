import {renderAvatarArtwork} from './avatar-art.js';
import {renderParchisDie,finishDiceRender} from './parchis-dice.js';
import {DICE_DURATION,PAWN_STEP,PIECE_TRANSFER,settledFrames} from './game-physics.js';
import {parchisRoutes} from './turn-events.js';
import {escapeHtml as esc,mascotForSeat,MASCOTS} from './table-view.js';
import {renderRivalRoster,revealActivePlayer} from './rival-portraits.js';
import {parchisSquare} from './game-core/index.js';
import {parchisGeometry,pawnSpot,NUMBER_FONT,NEST_FONT} from './parchis-geometry.js';
export const PARCHIS_PALETTE={yellow:{name:'Amarillo',fill:'#e8b942',ink:'#392c10'},green:{name:'Verde',fill:'#439968',ink:'#102d20'},red:{name:'Rojo',fill:'#cf6260',ink:'#461b1b'},blue:{name:'Azul',fill:'#568ec5',ink:'#152c49'},orange:{name:'Naranja',fill:'#e48a3c',ink:'#47250c'},purple:{name:'Morado',fill:'#9a6dc4',ink:'#2d1846'}};
export const BOARD_SHAPES={3:'triangular',4:'cuadrado',5:'pentagonal',6:'hexagonal'};
const sidesOf=view=>view.sides||4,goalOf=view=>view.goal??parchisGeometry(sidesOf(view)).layout.goal;
const fixed=n=>+n.toFixed(3);
const points=list=>list.map(p=>`${fixed(p[0])},${fixed(p[1])}`).join(' ');
// Board units of a pawn's centre, shared by drawing and animation.
export function pawnPoint(color,progress,piece,sides=4){return pawnSpot(sides,color,progress,piece).point;}
// Drawing and animation share the same centring, stack offsets and sizes.
export function pawnPlacement(view,id,piece,progress=view.pieces[id][piece]){
 const sides=sidesOf(view),{viewBox}=parchisGeometry(sides),[x,y]=pawnPoint(view.colors[id],progress,piece,sides),peers=[];
 for(const player of view.players)for(let index=0;index<4;index++){
  const point=player===id&&index===piece?[x,y]:pawnPoint(view.colors[player],view.pieces[player][index],index,sides);
  if(Math.hypot(point[0]-x,point[1]-y)<1e-6)peers.push(`${player}:${index}`);
 }
 const stacked=peers.length===2,spot=pawnSpot(sides,view.colors[id],progress,piece,peers.length,peers.indexOf(`${id}:${piece}`));
 const size=fixed(spot.size/viewBox.width*100);
 return {left:`${fixed((spot.point[0]-viewBox.x)/viewBox.width*100)}%`,top:`${fixed((spot.point[1]-viewBox.y)/viewBox.height*100)}%`,width:`${size}%`,size,stacked};
}
export function renderPawnFace(view,id,piece){return `<span class="parchis-pawn-avatar">${renderAvatarArtwork(mascotForSeat(view.players,view.players.indexOf(id),view.characters))}</span><b class="parchis-pawn-number">${piece+1}</b>`;}
export function renderParchisBoard(view,playerId,name){
 const sides=sidesOf(view),g=parchisGeometry(sides),{x,y,width,height}=g.viewBox,goal=goalOf(view),used=new Set(Object.values(view.colors));
 let svg=`<svg viewBox="${fixed(x)} ${fixed(y)} ${fixed(width)} ${fixed(height)}" aria-hidden="true"><defs><radialGradient id="board-paper"><stop stop-color="#f8f0d9"/><stop offset="1" stop-color="#d9c8a7"/></radialGradient></defs><path d="${g.paperPath}" fill="url(#board-paper)" stroke="#bc9b64" stroke-width=".08"/>`;
 for(const arm of g.arms){
  const p=PARCHIS_PALETTE[arm.color],nest=g.nests[arm.color],label=nest.label;
  svg+=`<g class="parchis-nest" data-nest="${arm.color}" opacity="${used.has(arm.color)?1:.45}"><path d="${nest.path}" fill="${p.fill}" fill-opacity=".22" stroke="${p.fill}" stroke-width=".09" stroke-linejoin="round"/><circle cx="${fixed(nest.center[0])}" cy="${fixed(nest.center[1])}" r="${fixed(nest.radius*.97)}" fill="${p.fill}" fill-opacity=".12" stroke="${p.fill}" stroke-width=".04"/>${label?`<text x="${fixed(label.x)}" y="${fixed(label.y+NEST_FONT*.36)}" transform="rotate(${fixed(label.rotate)} ${fixed(label.x)} ${fixed(label.y)})" text-anchor="middle" textLength="${fixed(label.width)}" lengthAdjust="spacingAndGlyphs" font-size="${NEST_FONT}" font-weight="700" fill="${p.ink}">${label.name}</text>`:''}</g>`;
  for(const c of g.lanes[arm.color])svg+=`<polygon class="parchis-lane" points="${points(c.corners)}" fill="${p.fill}" fill-opacity=".65" stroke="#746146" stroke-width=".035"/>`;
 }
 for(const c of g.track){
  const color=g.layout.colors.find(k=>g.layout.starts[k]===c.index),safe=g.layout.safe.includes(c.index),mark=add(c.center,c.v,-c.side*.31),{number}=c;
  svg+=`<polygon points="${points(c.corners)}" fill="${color?PARCHIS_PALETTE[color].fill:safe?'#e6d6b5':'#f7efdc'}" stroke="#746146" stroke-width=".035"/>${safe?`<circle cx="${fixed(mark[0])}" cy="${fixed(mark[1])}" r=".34" fill="none" stroke="#8b7853" stroke-width=".04"/>`:''}<text class="parchis-cell-number" data-cell-number="${c.index+1}" x="${fixed(number.x)}" y="${fixed(number.y+NUMBER_FONT*.36)}" text-anchor="middle" textLength="${fixed(number.box.width)}" lengthAdjust="spacingAndGlyphs" fill="#51432e" font-size="${NUMBER_FONT}" font-weight="700">${c.index+1}</text>`;
 }
 for(const arm of g.arms)svg+=`<polygon class="parchis-goal" points="${points(g.goals[arm.color].polygon)}" fill="${PARCHIS_PALETTE[arm.color].fill}" stroke="#746146" stroke-width=".035"/>`;
 svg+=`<circle cx="0" cy="0" r="${fixed(Math.min(.32,g.apothem*.3))}" fill="#f3e3b9"/><text x="0" y=".11" text-anchor="middle" font-size=".3" fill="#6b542f">★</text></svg>`;
 const tokens=[];
 for(const id of view.players)for(let piece=0;piece<4;piece++){
  const progress=view.pieces[id][piece],color=view.colors[id],position=pawnPlacement(view,id,piece),move=id===playerId&&view.legalMoves.find(m=>m.piece===piece),square=parchisSquare(color,progress,sides),label=`${name(id)}, ficha ${piece+1}, ${progress<0?'en espera':progress===goal?'en meta':square!==null?'casilla '+(square+1):'pasillo de llegada'}`;
  tokens.push(`<button class="parchis-pawn ${move?'can-move':''} ${position.stacked?'stacked':''} ${progress===goal?'at-goal':progress<0?'in-nest':''}" style="--pawn-color:${PARCHIS_PALETTE[color].fill};--d:${position.size};left:${position.left};top:${position.top};width:${position.width}" data-action="parchis-move" data-piece="${piece}" ${move?`data-dice="${move.dice.join(',')}"`:''} data-progress="${progress}" data-pawn="${esc(id)}:${piece}" data-player-id="${esc(id)}" ${move?'':'disabled'} aria-label="${esc(label)}">${renderPawnFace(view,id,piece)}</button>`);
 }
 const ratio=`${fixed(width)} / ${fixed(height)}`;
 return `<div class="parchis-board" data-sides="${sides}" style="--board-ratio:${fixed(width/height)};--zoom-width:${Math.round(width*37)}px;aspect-ratio:${ratio}" aria-label="Tablero ${BOARD_SHAPES[sides]} de Parchís: ${g.layout.cells} casillas y ${sides} colores">${svg}${tokens.join('')}</div>`;
}
const add=(a,b,k)=>[a[0]+b[0]*k,a[1]+b[1]*k];
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
   const arriving=changes.some(p=>p.to>=0&&pawnPoint(view.colors[p.player],p.to,p.piece,sidesOf(view)).join(',')===pawnPoint(view.colors[player],view.pieces[player][piece],piece,sidesOf(view)).join(','));
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
  const animation=el.animate(settledFrames(flight.points,({left,top,width})=>({left,top,width}),flight.steps),{duration:flight.duration,delay:flight.delay,fill:'backwards'});animation.currentTime=elapsed;
 }
}
export function renderParchisScreen(app,view,playerId,name,error=''){
 const menuOpen=app.querySelector('.game-menu')?.open,zoomOpen=app.querySelector('.parchis-zoom')?.open;
 const mine=view.colors[playerId],active=view.turnPlayer===playerId&&!view.finished,rolling=view.phase==='roll'||view.phase==='start',goal=goalOf(view),two=view.diceCount===2,sortition=['setup','start'].includes(view.phase);
 const displayOrder=sortition?view.players:view.turnOrder||view.players,home=id=>view.pieces[id].filter(p=>p===goal).length;
 const rivals=displayOrder.map((id,offset)=>{const index=view.players.indexOf(id),character=mascotForSeat(view.players,index,view.characters);return {id,turnPosition:sortition?null:offset+1,isSelf:id===playerId,roll:(view.phase==='start'||view.lastRoll?.initial)?view.startingRolls[id]??(view.startingCandidates?.includes(id)===false?'—':'…'):undefined,character,mascot:MASCOTS[character],name:name(id),count:home(id),unit:'en meta',teamLabel:PARCHIS_PALETTE[view.colors[id]].name,active:!view.finished&&view.turnPlayer===id};});
 const board=renderParchisBoard(view,playerId,name),dice=two?'los dados':'el dado';
 const free=(view.rolled||[]).filter((_,i)=>!view.used?.[i]),turnName=active?'Has':`${name(view.turnPlayer)} ha`;
 const instruction=view.finished?`${name(view.winner)} ha llevado sus cuatro fichas a meta.`
  :view.phase==='setup'?(active?`Mesa de ${view.players.length}: elige si jugáis con uno o con dos dados.`:`${name(view.turnPlayer)} está eligiendo si se juega con uno o con dos dados.`)
  :view.phase==='start'?`${(view.initialRound??1)>1?'Desempate':'Tirada inicial'}: ${active?'tira tú':'tira '+name(view.turnPlayer)}. Empieza la mayor. Esta tirada no saca fichas.`
  :view.phase==='bonus'?`Bonificación: avanza ${view.bonuses[0]} casillas.`
  :view.phase==='move'?(two?`${active?'Elige ficha para':'Dados por jugar:'} ${free.map(v=>v===6&&!view.pieces[view.turnPlayer].includes(-1)?'6 (cuenta 7)':v).join(' y ')}. Con un 5${free.length===2&&free[0]+free[1]===5?' o la suma 5':''} sale una ficha.`
   :view.die===5&&active&&view.legalMoves.some(m=>m.from===-1)?'Has sacado 5: pulsa Salir o una ficha de casa para ponerla en juego.':`Elige una ficha para avanzar ${view.die===6&&!view.pieces[view.turnPlayer].includes(-1)?7:view.die}.`)
  :view.lastRoll?.initial&&view.phase==='roll'?`${name(view.turnPlayer)} empieza con ${view.startingRolls[view.turnPlayer]}. Ahora vuelve a tirar para mover; el resultado inicial no saca fichas.`
  :view.sixes>0&&(two||view.die===6)?`${turnName} sacado ${two?'dobles':'6'}. Vuelve a tirar.`
  :`Tira ${dice} para mover tus fichas.`;
 const label=move=>move.from===-1?(move.dice.length>1?`Salir ${view.rolled[move.dice[0]]}+${view.rolled[move.dice[1]]}`:'Salir'):move.to===goal?'Meta':`Avanza ${move.steps}`;
 // The button names the piece; the move it makes goes underneath.
 const caption=(piece,move)=>`<span><b>Ficha ${piece+1}</b>${move?`<small>${label(move)}</small>`:''}</span>`;
 // With two dice each piece offers one button per usable die, stacked in its column.
 const choices=view.phase==='setup'?(view.diceChoice?`<div class="parchis-dice-choice" role="group" aria-label="Número de dados">${[1,2].map(count=>`<button data-action="parchis-dice" data-count="${count}">${count===1?'1 dado':'2 dados'}</button>`).join('')}</div>`:'')
  :!rolling&&!view.finished?`<div class="parchis-piece-choices" role="group" aria-label="Elegir ficha">${[0,1,2,3].map(piece=>{const moves=view.legalMoves.filter(m=>m.piece===piece),face=`<i>${renderPawnFace(view,playerId,piece)}</i>`,style=`style="--pawn-color:${PARCHIS_PALETTE[mine].fill}"`;
   if(!two||!moves.length){const move=moves[0];return `<button data-action="parchis-move" data-piece="${piece}" ${move?`data-dice="${move.dice.join(',')}"`:''} ${active&&move?'':'disabled'} ${style}>${face}${caption(piece,move)}</button>`;}
   return `<div class="parchis-piece-moves">${moves.map(move=>`<button data-action="parchis-move" data-piece="${piece}" data-dice="${move.dice.join(',')}" ${active?'':'disabled'} ${style}>${face}${caption(piece,move)}</button>`).join('')}</div>`;}).join('')}</div>`:'';
 const rules=`<p>Salida con 5; el 6 repite y cuenta 7 si no quedan fichas en espera. Tres seises devuelven la última ficha movida a la espera. Barreras de dos fichas del mismo color: no se atraviesan y deben abrirse con 6. Captura fuera de seguros: +20. Meta exacta: +10. Gana quien lleva cuatro fichas a meta.</p>${two?'<p>Con dos dados: cada dado se juega por separado, con la misma ficha o con dos distintas. Se sale con un 5 o con la suma 5. Los dobles repiten tirada y obligan a abrir barrera; tres dobles seguidos devuelven la última ficha movida. Un dado sin movimiento válido se pierde.</p>':''}<a href="./reglas_juegos/lectura/parchis.html">Reglamento original</a><p>Tablero ${BOARD_SHAPES[sidesOf(view)]} de ${view.cells??68} casillas (17 por color), seguros señalados con círculo y pasillos de siete casillas. Máximo dos fichas por casilla. Con 5 puedes elegir salir o mover. Sin captura en salidas seguras. Las bonificaciones se usan completas si hay movimiento válido. En la tirada inicial, los empatados repiten.</p>`;
 app.innerHTML=`<section class="parchis-screen" data-phase="${view.phase}" data-dice="${two?2:1}" data-sides="${sidesOf(view)}"><header class="play-header"><div class="play-title"><h1><span>ELTETO</span> Parchís</h1><p class="parchis-subtitle">Tu color: ${PARCHIS_PALETTE[mine].name} · ${home(playerId)}/4 en meta${two?' · 2 dados':''}</p></div><button data-action="parchis-zoom-open" aria-label="Ampliar el tablero de Parchís">Tablero ↗</button><button class="game-menu-button" data-action="open-game-menu" aria-label="Jugadores, reglas y opciones">⋯</button></header><section class="parchis-info" aria-label="Jugadores y turno">${renderRivalRoster(rivals,esc)}<div class="parchis-round-banner ${sortition?'is-sortition':''}"><strong>${view.phase==='setup'?'¿UNO O DOS DADOS?':view.phase==='start'?(view.initialRound>1?'DESEMPATE DEL SORTEO':'SORTEO: ¿QUIÉN EMPIEZA?'):'ORDEN DE TURNO · 1º → '+view.players.length+'º'}</strong><p>${view.phase==='setup'?'Con cinco o seis jugadores se puede jugar con dos dados.':view.phase==='start'?'Gana la tirada más alta. Todavía no se mueven fichas.':esc(instruction)}</p></div><div class="player-turn-announcement" role="status">${esc(instruction)}</div><div class="parchis-status"><p role="alert"></p></div>${error?`<p class="error-message" role="alert">${esc(error)}</p>`:''}</section><section class="parchis-table" aria-label="Mesa de Parchís">${board}</section><section class="parchis-dock" aria-label="${two?'Dados':'Dado'} y movimientos"><div class="parchis-actions">${renderParchisDie(view,name)}<button class="dice-roll-button" title="Tirar ${dice}" aria-label="Tirar ${dice}" data-action="parchis-roll" data-roll-sequence="${view.lastRoll?.sequence??0}" ${active&&rolling?'':'disabled'}> ${view.phase==='start'?'Sortear':'Tirar'}</button></div>${choices}</section><dialog class="game-menu"><header><h2>Tu partida de Parchís</h2><button data-action="close-game-menu">Volver</button></header><div class="game-menu-content"><ol class="scoreboard">${view.players.map(id=>`<li><span>${esc(name(id))} · ${PARCHIS_PALETTE[view.colors[id]].name}</span><strong>${home(id)}/4</strong></li>`).join('')}</ol><details><summary>Reglas de esta mesa</summary>${rules}</details><details><summary>Historial</summary><ol>${view.log.slice().reverse().map(line=>`<li>${esc(readable(line,view,name))}</li>`).join('')}</ol></details><button class="leave-game" data-action="leave-room">${view.finished?'Volver al inicio':'Salir de la partida'}</button></div></dialog><dialog class="parchis-zoom" aria-label="Tablero ampliado"><header><h2>Parchís · tablero ampliado</h2><button data-action="parchis-zoom-close">Volver</button></header><div class="parchis-zoom-scroll">${board.replaceAll('data-pawn=','data-zoom-pawn=').replaceAll('board-paper','zoom-paper')}</div><p>Desliza para explorar el tablero. Los botones de ficha también permiten mover sin tocar casillas pequeñas.</p></dialog></section>`;
 finishDiceRender(app,view,error);
 revealActivePlayer(app);
 const menu=app.querySelector('.game-menu'),zoom=app.querySelector('.parchis-zoom');if(menuOpen)menu.showModal();if(zoomOpen)zoom.showModal();
 menu.addEventListener('close',()=>app.querySelector('.game-menu-button')?.focus({preventScroll:true}));
 zoom.addEventListener('close',()=>app.querySelector('[data-action="parchis-zoom-open"]')?.focus({preventScroll:true}));
 finishParchisTravel(app,view);
}
