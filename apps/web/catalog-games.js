import {organizePokerDock} from './poker-celebration.js';
import {pokerControls,syncPokerAmounts,pokerPrefs} from './poker-controls.js';
import {renderPokerTable,renderPokerShowdown,renderPokerInfo,collectPokerBets,pokerSnapshot} from './poker-table.js';
import {finishTableSpeech,speechText} from './table-speech.js';
import {renderCheckersBoard,renderGooseBoard,GOOSE_COLORS,GOOSE_COLOR_NAMES} from './board-games.js';
import {renderParchisDie,beginParchisRoll,finishDiceRender,OCA_DICE_TARGETS} from './parchis-dice.js';
import {finishBoardMotion,preparePublicMotion,finishPublicMotion} from './board-motion.js';
import {getGamePlan} from './game-core/index.js';
import {cardName} from './card-names.js';
import {secondPerson} from './turn-sequence.js';
import {renderRivalRoster,revealActivePlayer} from './rival-portraits.js';
import {mascotForSeat,MASCOTS,escapeHtml as esc,suitArt} from './table-view.js';
import {renderCardArtwork,renderCardBack,renderDrawPile} from './card-art.js';
import {isTetunoCard,renderTetunoFace,tetunoCardName,sortTetunoHand,tetunoTable,tetunoControls} from './tetuno-table.js';

let pokerSpanishView=false,frenchDeckView=false;
const ui={key:'',cards:new Set(),table:new Set(),path:[],tile:null,call:false};
const symbols={oros:'●',copas:'♜',espadas:'⚔',bastos:'♣',picas:'♠',corazones:'♥',diamantes:'♦',treboles:'♣'};
const actionButton=(label,action,extra='')=>`<button data-action="${action}" ${extra}>${esc(label)}</button>`;
function face(card){if(!card)return `<span class="catalog-card-back" aria-label="Carta oculta">${renderCardBack(pokerSpanishView===false&&frenchDeckView)}</span>`;
 if(isTetunoCard(card))return renderTetunoFace(card);
 if(card.suit==='joker')return `<span class="catalog-joker-face"><b>★</b><strong>★</strong><small>COMODÍN</small></span>`;
 // Póker español (Remigio): palos españoles con índices A–10 y J/Q/K. Las figuras son sota, caballo y rey.
 if(['oros','copas','espadas','bastos'].includes(card.suit)&&(pokerSpanishView||['A','J','Q','K'].includes(card.rank))){
  const index=`<i class="poker-spanish-index suit-${card.suit}">${esc(card.rank)}</i>`;
  if(card.rank==='10')return `<span class="poker-spanish-ten" aria-hidden="true">${index}<span class="ten-pips">${Array.from({length:10},()=>suitArt(card.suit)).join('')}</span></span>`;
  const rank=({A:'1',J:'10',Q:'11',K:'12'})[card.rank]||card.rank;
  return `${renderCardArtwork({suit:card.suit,rank})}${index}`;
 }
 return renderCardArtwork(card);
}
const cardLabel=card=>isTetunoCard(card)?tetunoCardName(card):cardName(card,{poker:pokerSpanishView});
function cardHtml(card,{action,chosen=false,disabled=false,label}={}){const title=label||cardLabel(card),tag=action?'button':'div';return `<${tag} class="catalog-card ${chosen?'is-selected':''} ${disabled?'is-muted':''}" data-public-piece="card-${esc(card.id)}" ${action?`data-action="${action}" data-card-id="${esc(card.id)}" aria-pressed="${chosen}" ${disabled?'disabled':''}`:''} aria-label="${esc(title)}">${face(card)}</${tag}>`;}
function tile(t){return `<span class="domino-half" aria-label="${t.left}">${pips(t.left)}</span><span class="domino-half" aria-label="${t.right}">${pips(t.right)}</span>`;}
function pips(n){const positions={0:[],1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]}[n];return Array.from({length:9},(_,i)=>`<i class="${positions.includes(i)?'pip':''}"></i>`).join('');}
// Mesa de dominó como en la vida real: la ficha de salida queda fija en el centro y cada
// extremo crece hacia su lado; al llegar al borde gira en una esquina (ficha en vertical) y
// vuelve en la fila siguiente: la derecha baja y la izquierda sube. Las fichas ya colocadas
// no cambian de sitio, los dobles van cruzados y los dos extremos abiertos quedan señalados.
const DOMINO_GAP=0.12,DOMINO_PITCH=2+DOMINO_GAP;
export function dominoLayout(chain,start=0,width=11){
 if(!chain.length)return {tiles:[],width,height:0};
 start=Math.min(Math.max(0,start|0),chain.length-1);
 const half=width/2,placed=[],isDouble=t=>t.left===t.right;
 const first=chain[start],w0=isDouble(first)?1:2;
 placed.push({index:start,t:first,x:-w0/2,y:isDouble(first)?-1:-0.5,w:w0,h:isDouble(first)?2:1,a:first.left,b:first.right,vertical:isDouble(first)});
 // vertical: 1 = la fila siguiente queda debajo (extremo derecho), -1 = encima (izquierdo).
 const branch=(indices,dir0,vertical,near,far)=>{
  let row=0,dir=dir0,cursor=dir0*(w0/2+DOMINO_GAP),rowItems=[];
  const fits=w=>dir>0?cursor+w<=half+1e-6:cursor-w>=-half-1e-6;
  const corner=(item,anchorEdge)=>{
   // Esquina: en vertical bajo (o sobre) la mitad exterior de la última ficha de la fila.
   const cy=row*DOMINO_PITCH*vertical,x=dir>0?anchorEdge-1:anchorEdge,top=vertical>0?cy+0.5+DOMINO_GAP:cy-0.5-DOMINO_GAP-2;
   placed.push({...item,x,y:top,w:1,h:2,vertical:true,a:vertical>0?near(item.t):far(item.t),b:vertical>0?far(item.t):near(item.t),corner:true});
   row++;dir=-dir;cursor=dir>0?x+1+DOMINO_GAP:x-DOMINO_GAP;rowItems=[];
  };
  indices.forEach((index,n)=>{
   const t=chain[index],w=isDouble(t)?1:2,item={index,t};
   if(!fits(w)){
    const last=rowItems.at(-1);
    if(last&&isDouble(last.t)){
     // Un doble no puede hacer de esquina cruzado: pasa a ser la esquina y la ficha actual abre fila.
     placed.splice(placed.indexOf(last.placed),1);cursor=dir>0?last.placed.x-DOMINO_GAP:last.placed.x+1+DOMINO_GAP;
     corner(last,dir>0?last.anchor:last.anchor);
    } else {
     const edge=dir>0?cursor-DOMINO_GAP:cursor+DOMINO_GAP;corner(item,edge);return;
    }
   }
   const cy=row*DOMINO_PITCH*vertical,x=dir>0?cursor:cursor-w;
   const tile={...item,x,y:isDouble(t)?cy-1:cy-0.5,w,h:isDouble(t)?2:1,vertical:isDouble(t),a:dir>0?near(t):far(t),b:dir>0?far(t):near(t)};
   placed.push(tile);rowItems.push({...item,placed:tile,anchor:dir>0?cursor-DOMINO_GAP:cursor+DOMINO_GAP});cursor=dir>0?x+w+DOMINO_GAP:x-DOMINO_GAP;
  });
 };
 branch(chain.map((_,i)=>i).slice(start+1),1,1,t=>t.left,t=>t.right);
 branch(chain.map((_,i)=>i).slice(0,start).reverse(),-1,-1,t=>t.right,t=>t.left);
 const top=Math.min(...placed.map(p=>p.y)),bottom=Math.max(...placed.map(p=>p.y+p.h));
 // La ficha de salida queda centrada en vertical: el tablero crece igual hacia arriba y abajo.
 const reach=Math.max(-top,bottom,2.5)+0.1;
 return {tiles:placed.map(p=>({...p,x:p.x+half,y:p.y+reach})),width,height:reach*2};
}
function dominoLine(chain,start){
 if(!chain.length)return '<div class="domino-line is-empty"><p class="catalog-empty">Coloca la primera ficha</p></div>';
 const last=chain.length-1,wide=typeof matchMedia==='function'&&matchMedia('(orientation: landscape) and (min-width: 600px)').matches;
 const {tiles,width,height}=dominoLayout(chain,start,wide?17:11);
 const pct=(n,of)=>`${(n/of*100).toFixed(3)}%`;
 const tileHtml=p=>{const i=p.index,end=i===0&&i===last?'both':i===0?'left':i===last?'right':'';
  const halves=`<span class="domino-half" aria-label="${p.a}">${pips(p.a)}</span><span class="domino-half" aria-label="${p.b}">${pips(p.b)}</span>`;
  return `<div class="domino-tile ${p.vertical?'is-vertical':''} ${p.t.left===p.t.right?'is-double':''} ${i===start?'is-start':''} ${end?'is-open-end end-'+end:''}" data-public-piece="tile-${esc(p.t.id)}" ${end&&end!=='both'?`data-end-label="${end==='left'?'Izq.':'Der.'}"`:''} style="left:${pct(p.x,width)};top:${pct(p.y,height)};width:${pct(p.w,width)};height:${pct(p.h,height)}" aria-label="${p.t.left} y ${p.t.right}${i===start?', ficha de salida':''}${i===0?', extremo izquierdo':''}${i===last?', extremo derecho':''}">${halves}</div>`;};
 return `<div class="domino-line"><p class="domino-ends"><span>Izquierda <b>${chain[0].left}</b></span><span>${chain.length} ${chain.length===1?'ficha':'fichas'}</span><span>Derecha <b>${chain[last].right}</b></span></p><div class="domino-chain" aria-label="Línea de juego"><div class="domino-board" style="--domino-w:${width};--domino-h:${height.toFixed(3)}">${[...tiles].sort((x,y)=>x.index-y.index).map(tileHtml).join('')}</div></div></div>`;
}
function publicCards(cards){return `<div class="catalog-public-cards">${cards.map(c=>c?cardHtml(c):'<div class="catalog-card">'+face(null)+'</div>').join('')}</div>`;}
// Mesa de bazas como en Mus: cada carta aparece delante de quien la juega, en el sentido real de
// la mesa (antihorario: el siguiente jugador queda a tu derecha). La carta que gana se resalta.
const SUIT_NAMES={oros:'oros',copas:'copas',espadas:'espadas',bastos:'bastos',none:'sin triunfo'};
function seatSpot(index,count){const angle=(90-index*360/count)*Math.PI/180;return {x:Math.cos(angle).toFixed(3),y:Math.sin(angle).toFixed(3)};}
function trickTable(view,name,playerId){
 const own=Math.max(0,view.players.indexOf(playerId)),count=view.players.length,who=p=>p===playerId?'Tú':name(p);
 const playing=view.joined||view.players.filter(p=>p!==view.sitting);
 const cards=view.trick.map((t,order)=>{const seat=(view.players.indexOf(t.player)-own+count)%count,spot=seatSpot(seat,count),win=view.trickWinner===t.player;
  return `<div class="trick-slot ${win?'is-winner':''} ${order===0?'is-lead':''}" style="--sx:${spot.x};--sy:${spot.y};--deal-order:${order}" data-trick-player="${esc(t.player)}"><small>${esc(who(t.player))}${order===0?' · sale':''}</small>${cardHtml(t.card)}${win?'<b class="trick-badge">Gana la baza</b>':''}</div>`;}).join('');
 const empty=view.trick.length?'':`<p class="trick-waiting">${view.phase==='play'?`${esc(who(view.turnPlayer))} ${view.turnPlayer===playerId?'sales':'sale'} a la baza`:view.phase==='result'?'Mano terminada':'La mesa está lista'}</p>`;
 const trumpCard=view.pinta&&view.stockCount?`<span class="trick-pinta">${cardHtml(view.pinta)}</span>`:'';
 const meta=`<div class="trick-meta">${view.stockCount?`<span class="trick-stock">${renderDrawPile(view.stockCount,false)}<span><small>Mazo</small><b>${view.stockCount}</b></span></span>`:'<span class="trick-stock">Sin mazo</span>'}<span class="trick-trump">${trumpCard}<span><small>Triunfo</small><b>${view.trump?esc(SUIT_NAMES[view.trump]||view.trump):'Por elegir'}</b></span></span>${view.multiplier>1?`<span class="trick-extra">×${view.multiplier}</span>`:''}${view.pot?`<span class="trick-extra">Plato <b>${view.pot}</b></span>`:''}</div>`;
 // Marcador: por parejas cuando las hay, con «Tú» en tu lado.
 const teams=view.teamLabels&&Object.values(view.teamLabels).some(l=>/^Pareja/.test(l))?[...new Set(view.players.map(p=>view.teamLabels[p]))]:null;
 const score=teams?teams.map(label=>{const members=view.players.filter(p=>view.teamLabels[p]===label);return `<span class="${members.includes(playerId)?'is-own':''}"><small>${esc(label)} · ${members.map(who).map(esc).join(' y ')}</small><b>${view.points[members[0]]} tantos</b></span>`;}).join(''):playing.map(p=>`<span class="${p===playerId?'is-own':''}"><small>${esc(who(p))}</small><b>${view.predictions[p]!==undefined?`${view.tricks[p]} de ${view.predictions[p]} bazas`:view.id==='julepe'||view.id==='pocha'?`${view.tricks[p]} bazas`:view.points[p]+' tantos'}</b></span>`).join('');
 // Recuento al cerrar la mano: las líneas del historial desde la última baza, legibles y con «Tú».
 if(view.phase==='result'||view.finished){const log=view.log||[],last=log.map((l,i)=>/ gana la baza\.$/.test(l)?i:-1).filter(i=>i>=0).at(-1)??-1,lines=log.slice(last+1);
  const read=line=>readLine(view,playerId,name,line);
  return `${meta}<section class="trick-summary" aria-label="Recuento de la mano"><h3>${view.finished?'Final de la partida':`Recuento · mano ${view.handNumber}`}</h3><ul>${lines.map(l=>`<li>${esc(read(l))}</li>`).join('')||'<li>Mano terminada.</li>'}</ul><p>${({pocha:'Puntos',butifarra:'Puntos · meta 100',julepe:'Fichas'})[view.id]||'Juegos ganados · gana quien llega a 3'}: ${(teams?teams.map(label=>{const m=view.players.filter(p=>view.teamLabels[p]===label);return `${esc(label)} ${view.scores[m[0]]}`;}):playing.map(p=>`${esc(who(p))} ${Number(view.scores[p]).toLocaleString('es-ES',{maximumFractionDigits:2})}`)).join(' · ')}</p></section><div class="catalog-scoreline trick-score">${score}</div>`;}
 return `${meta}<div class="trick-table" style="--seats:${count}" aria-label="Baza en juego">${cards}${empty}</div><div class="catalog-scoreline trick-score">${score}</div>`;
}
// Recuento de mano compartido: las líneas públicas del historial desde el último marcador.
function readLine(view,playerId,name,line){return view.players.reduce((t,id)=>t.split(id).join(id===playerId?`${name(id)} (tú)`:name(id)),secondPerson(line,playerId));}
function handSummary(view,playerId,name,{since,title,footer=''}){
 const log=view.log||[],start=log.map((l,i)=>since.test(l)?i:-1).filter(i=>i>=0).at(-1)??-1,lines=log.slice(start+1);
 return `<section class="trick-summary" aria-label="${esc(title)}"><h3>${esc(title)}</h3><ul>${lines.map(l=>`<li>${esc(readLine(view,playerId,name,l))}</li>`).join('')||'<li>Mano terminada.</li>'}</ul>${footer?`<p>${footer}</p>`:''}</section>`;
}
const youOr=(playerId,name)=>p=>p===playerId?'Tú':name(p);
function scoreStrip(view,playerId,name,value){const who=youOr(playerId,name);return `<div class="catalog-scoreline trick-score">${view.players.map(p=>`<span class="${p===playerId?'is-own':''}"><small>${esc(who(p))}</small><b>${value(p)}</b></span>`).join('')}</div>`;}
// Escoba: mesa grande en el centro, mazo y escobas a la vista, y recuento detallado al final.
function captureTable(view,name,playerId,interactive){
 const who=youOr(playerId,name),teams=view.players.length>=4;
 const meta=`<div class="trick-meta"><span class="trick-stock">${renderDrawPile(view.stockCount,false)}<span><small>Mazo</small><b>${view.stockCount}</b></span></span><span class="capture-goal"><small>Suma</small><b>15</b></span></div>`;
 const team=p=>teams?view.players.filter((_,i)=>i%2===view.players.indexOf(p)%2):[p];
 const points=p=>{const sw=team(p).reduce((n,id)=>n+(view.sweeps?.[id]||0),0);return `${view.scores[p]} ${view.scores[p]===1?'punto':'puntos'}${sw?` · ${sw} ${sw===1?'escoba':'escobas'}`:''}`;};
 const strip=teams?`<div class="catalog-scoreline trick-score">${[0,1].map(t=>{const m=view.players.filter((_,i)=>i%2===t);return `<span class="${m.includes(playerId)?'is-own':''}"><small>${m.map(who).map(esc).join(' y ')}</small><b>${points(m[0])}</b></span>`;}).join('')}</div>`:scoreStrip(view,playerId,name,points);
 if(view.phase==='result'||view.finished)return `${meta}${handSummary(view,playerId,name,{since:/ (juega|deja) .+ (y recoge|en la mesa)/,title:view.finished?'Final de la partida':`Recuento · mano ${view.handNumber}`,footer:`Puntos (meta ${view.target||21}): ${view.players.filter((p,i)=>!teams||i<2).map(p=>`${esc(teams?team(p).map(who).join(' y '):who(p))} ${view.scores[p]}`).join(' · ')}`})}${strip}`;
 const cards=view.table.map(c=>cardHtml(c,{action:interactive?'catalog-table-card':undefined,chosen:ui.table.has(c.id)})).join('')||'<p class="catalog-empty">Mesa limpia</p>';
 // Recibo de la última captura: la carta jugada y lo recogido (las cartas vuelan hacia su dueño).
 const last=view.lastPlay?.capturedCount?`<div class="capture-receipt">${cardHtml(view.lastPlay.card)}<span><strong>${esc(who(view.lastPlay.player))}</strong><small>${view.lastPlay.sweep?'¡Escoba! · ':''}Recoge ${view.lastPlay.captured?.length?view.lastPlay.captured.map(cardLabel).map(esc).join(', '):view.lastPlay.capturedCount}</small></span></div>`:view.lastPlay?`<p class="capture-last"><b>${esc(who(view.lastPlay.player))}</b> deja ${esc(cardLabel(view.lastPlay.card))}</p>`:'';
 return `${meta}<div class="capture-cards capture-felt">${cards}</div>${last}${strip}`;
}
// Mentiroso: el montón boca abajo y la declaración en palabras.
function bluffTable(view,name,playerId){
 const who=youOr(playerId,name),d=view.declaration;
 const said=d?`${esc(who(d.player))} ${d.player===playerId?'has declarado':'declara'} <b>${esc(speechText({kind:'declare',count:d.count,rank:d.rank}))}</b>`:'Nadie ha declarado todavía';
 return `<div class="catalog-bluff-pile"><span class="catalog-card-back">${renderCardBack(frenchDeckView)}</span><strong>${view.pileCount} ${view.pileCount===1?'carta':'cartas'} en el montón</strong><p>${said}</p></div>${view.reveal?`<div class="bluff-reveal ${view.reveal.truth?'is-truth':'is-lie'}"><p>${view.reveal.truth?'Decía la verdad':'Era mentira'}</p>${publicCards(view.reveal.cards)}</div>`:''}${scoreStrip(view,playerId,name,p=>`${view.handSizes[p]} cartas`)}`;
}
// Burro: eliges directamente una de las cartas boca abajo del vecino; las letras de cada uno a la vista.
function burroTable(view,name,playerId,interactive){
 const who=youOr(playerId,name),mine=interactive&&view.turnPlayer===playerId&&!view.finished&&view.phase!=='result';
 const backs=Array.from({length:view.hiddenCount||0},(_,i)=>{const index=view.options.findIndex(o=>o.action.type==='draw-hidden'&&o.action.index===i);return mine&&index>=0?`<button class="burro-back" data-action="catalog-choice" data-index="${index}" aria-label="Robar la carta ${i+1}">${renderCardBack(false)}</button>`:`<span class="burro-back">${renderCardBack(false)}</span>`;}).join('');
 const source=view.hiddenSource,pair=view.lastPair;
 const fan=view.phase==='result'||view.finished?'':`<section class="burro-source"><p>${mine?`Roba una carta a <b>${esc(who(source))}</b>`:`${esc(who(view.turnPlayer))} roba a ${esc(who(source))}`}</p><div class="burro-fan" style="--hand-count:${Math.max(1,view.hiddenCount||1)}">${backs}</div></section>`;
 const last=pair?`<div class="burro-last"><small>${esc(who(pair.player))} roba a ${esc(who(pair.from))}</small>${pair.cards.length?`<div>${pair.cards.map(c=>cardHtml(c)).join('')}</div><b>Pareja fuera</b>`:'<b>Sin pareja</b>'}</div>`:'';
 const result=view.phase==='result'||view.finished?handSummary(view,playerId,name,{since:/ (roba a|forma pareja)/,title:view.finished?'Final de la partida':'Fin de la mano'}):'';
 return `<div class="trick-meta"><span><small>Parejas fuera</small><b>${view.discardCount/2}</b></span></div>${result||fan}${result?'':last}${scoreStrip(view,playerId,name,p=>`<span class="burro-letters">${'BURRO'.split('').map((l,i)=>`<i class="${i<(view.letters?.[p]||0)?'on':''}">${l}</i>`).join('')}</span>`)}`;
}
// Siete y medio: banca destacada, apuestas en fichas y estado de cada jugador.
function bankTable(view,name,playerId){
 const who=youOr(playerId,name),half=n=>`${Math.floor(n)}${n%1?'½':''}`.replace(/^0½$/,'½');
 const value=c=>Number(c.rank)>=10?.5:Number(c.rank);
 const seats=view.players.map(p=>{const cards=view.publicHands[p]||[],open=cards.every(Boolean),sum=cards.filter(Boolean).reduce((n,c)=>n+value(c),0),bust=open&&sum>7.5,bank=p===view.bank;
  return `<section class="bank-seat ${bank?'is-bank':''} ${p===view.turnPlayer&&!view.finished?'is-active':''} ${bust?'is-bust':''}"><small>${esc(who(p))}${bank?' · banca':view.bets[p]?` · apuesta ${view.bets[p]}`:''}</small>${publicCards(cards)}<b>${bust?`Se pasa (${half(sum)})`:!cards.length?'':open?half(sum):sum?`Vista ${half(sum)} + oculta`:'Carta oculta'}</b><em>${view.chips[p]} fichas</em></section>`;}).join('');
 const result=view.phase==='result'||view.finished?handSummary(view,playerId,name,{since:/ (se planta|pide carta|se pasa|apuesta )/,title:view.finished?'Final de la partida':`Cobros · mano ${view.handNumber}`}):'';
 return `${result}<div class="bank-seats">${seats}</div>`;
}
// Combinaciones: mazo y descarte grandes en el centro, regla de la mano a la vista y combinaciones de cada jugador.
function meldTable(view,name,playerId){
 const who=youOr(playerId,name),out=p=>view.eliminated?.includes(p);
 const rule=view.id==='continental'?view.contract:view.id==='chinchon'?'Cierra con 5 puntos o menos sin ligar':'Cierra con las diez combinadas o del mismo palo';
 const piles=`<div class="meld-piles"><div class="meld-pile">${renderDrawPile(view.stockCount,frenchDeckView)||'<span class="meld-empty">Sin mazo</span>'}<small>Mazo · ${view.stockCount}</small></div><div class="meld-pile is-discard">${view.discard?cardHtml(view.discard):'<span class="meld-empty">Vacío</span>'}<small>Descarte</small></div></div>`;
 const groups=view.players.filter(p=>view.exposed[p]?.length).map(p=>`<section class="meld-owner"><small>${esc(who(p))}</small><div>${view.exposed[p].map((g,i)=>`<div class="meld-group" aria-label="${g.kind==='set'?'Grupo':'Escalera'} ${i+1} de ${esc(who(p))}">${g.cards.map(c=>cardHtml(c)).join('')}</div>`).join('')}</div></section>`).join('');
 const strip=scoreStrip(view,playerId,name,p=>out(p)?'Eliminado':`${view.scores[p]} ${view.scores[p]===1?'punto':'puntos'}`);
 if(view.phase==='result'||view.finished)return `<p class="meld-rule">${esc(rule)}</p>${handSummary(view,playerId,name,{since:/ (descarta|roba del mazo|coge el descarte)/,title:view.finished?'Final de la partida':`Recuento · mano ${view.handNumber}`,footer:view.id==='chinchon'?'Quien pasa de 100 queda eliminado. Gana el último que aguanta.':`Gana la menor suma tras ${view.id==='continental'?7:6} manos.`})}${groups?`<div class="catalog-melds">${groups}</div>`:''}${strip}`;
 return `<p class="meld-rule">${esc(rule)}</p>${piles}${groups?`<div class="catalog-melds">${groups}</div>`:''}${strip}`;
}
function board(view,name,interactive=true,playerId=view.players[0]){
 switch(view.boardKind){
 case 'tricks':return trickTable(view,name,playerId);
 case 'domino':return dominoLine(view.chain,view.chainStart??Math.floor(view.chain.length/2));
 case 'checkers':return renderCheckersBoard(view,ui.path,playerId,name,interactive);
 case 'oca':return renderGooseBoard(view,name,!interactive);
 case 'capture':return captureTable(view,name,playerId,interactive);
 case 'bluff':return bluffTable(view,name,playerId);
 case 'burro':return burroTable(view,name,playerId,interactive);
 case 'melds':return meldTable(view,name,playerId);
 case 'poker':return renderPokerTable(view,name,playerId,publicCards);
 case 'bank':return bankTable(view,name,playerId);
 case 'tetuno':return tetunoTable(view,name,playerId,c=>cardHtml(c),view.phase==='result'||view.finished?handSummary(view,playerId,name,{since:/^Mano \d+: sale /,title:view.finished?'Final de la partida':`Recuento · mano ${view.handNumber}`,footer:`Puntos para quien se queda sin cartas · meta ${view.target}`}):'');
 default:return '';
 }
}
export function renderCatalogGame(app,view,playerId,name,error=''){
 const previousPoker=view.boardKind==='poker'&&app.pokerSnapshot?.view.players.join()===view.players.join()?app.pokerSnapshot:null;app.pokerName=name;if(view.boardKind!=='poker')delete app.pokerSnapshot;
 const publicMotion=view.boardKind==='poker'?null:preparePublicMotion(app,view);
 pokerSpanishView=view.id==='remigio';frenchDeckView=getGamePlan(view.id).material.includes('french');
 const plan=getGamePlan(view.id),key=`${view.id}:${view.handNumber}:${view.turnPlayer}:${view.phase}:${view.boardKind==='poker'?JSON.stringify(view.street):''}`,amounts=ui.key===key?[...app.querySelectorAll('.catalog-amount input,[data-poker-amount]')].map(input=>({id:input.id,value:input.value,poker:input.hasAttribute('data-poker-amount'),focus:document.activeElement===input,caret:input.selectionStart})):[];if(ui.key!==key){ui.key=key;ui.cards.clear();ui.table.clear();ui.path=[];ui.tile=null;ui.call=false;}
 const zoom=app.querySelector('.catalog-zoom')?.open,zoomScroll=app.querySelector('.catalog-zoom-content')?.scrollTop||0;
 const menu=app.querySelector('.game-menu')?.open,menuScroll=app.querySelector('.game-menu-content')?.scrollTop||0,boardScroll=app.querySelector('.catalog-surface')?.scrollTop||0,handScroll=app.querySelector('.catalog-hand')?.scrollLeft||0;
 const own=view.players.indexOf(playerId),ordered=Array.from({length:view.players.length},(_,i)=>view.players[(own+i)%view.players.length]);
 const players=ordered.map(id=>{const seat=view.players.indexOf(id),character=mascotForSeat(view.players,seat,view.characters);return {id,name:name(id),character,mascot:MASCOTS[character],count:view.handSizes[id],unit:view.unit||'cartas',active:!view.finished&&view.turnPlayer===id,isSelf:id===playerId,teamLabel:view.boardKind==='checkers'?(seat===0?'Claras':'Oscuras'):view.teamLabels?.[id]||'',...(view.boardKind==='oca'?{pieceColor:GOOSE_COLORS[seat],pieceNumber:seat+1,pieceLabel:GOOSE_COLOR_NAMES[seat]}:{})};});
 const isTurn=view.turnPlayer===playerId&&!view.finished;
 const selectable=isTurn&&(view.selectable||view.boardKind==='tricks'&&view.phase==='play'||view.boardKind==='melds'&&['show','layoff'].includes(view.phase));
 const ranks=plan.material.includes('french')||plan.material.includes('poker')?['A','2','3','4','5','6','7','8','9','10','J','Q','K']:['1','2','3','4','5','6','7','8','9','10','11','12'];
 const suits=Object.keys(symbols).concat('joker');
 const myHand=view.boardKind==='tetuno'?sortTetunoHand(view.myHand):(view.boardKind==='poker'&&view.folded[playerId]?[]:view.myHand).slice().sort((a,b)=>suits.indexOf(a.suit)-suits.indexOf(b.suit)||ranks.indexOf(a.rank)-ranks.indexOf(b.rank));
 const result=['tricks','capture','burro','bank','tetuno'].includes(view.boardKind)&&view.phase==='result'&&!view.finished?'':view.finished?(view.loser?`${name(view.loser)} pierde`:view.winner?`${name(view.winner)} gana`:'Tablas'):view.phase==='result'?(view.id==='burro'?`${name(view.loser)}: ${'BURRO'.slice(0,view.scores[view.loser])}`:view.boardKind==='bank'?'Banca resuelta':view.handWinner?`${name(view.handWinner)} gana la mano`:'Mano terminada'):'';
 let controls=view.options.map((option,index)=>{if(option.action.type==='extend'||option.action.type==='draw-hidden')return '';const amount=option.action.amountInput;return `${amount?`<label class="catalog-amount">Hasta <input type="number" id="catalog-amount-${index}" min="${amount.min}" max="${amount.max}" value="${amount.value}" step="1"></label>`:''}${actionButton(view.boardKind==='oca'&&option.label==='Tirar dado'?'Tirar':option.label,'catalog-choice',`data-index="${index}" ${view.boardKind==='oca'&&option.action.type==='roll'&&!view.penalties[playerId]&&view.prison!==playerId?`data-roll-sequence="${view.lastRoll?.sequence??0}"`:''}`)}`;}).join('');
 // Apuestas como fila compacta de importes: todas visibles sin desplazar el panel.
 if(view.options.length>1&&view.options.every(o=>o.action.type==='bet'&&Number.isFinite(o.action.amount)))controls=`<span class="bet-caption">Fichas a apostar</span>${view.options.map((o,index)=>actionButton(String(o.action.amount),'catalog-choice',`class="bet-chip" data-index="${index}" aria-label="Apostar ${o.action.amount} ${o.action.amount===1?'ficha':'fichas'}"`)).join('')}`;
 if(view.boardKind==='poker')controls=pokerControls(view);
 if(view.boardKind==='tetuno'){const extra=tetunoControls(view,playerId,ui,actionButton);controls=[...ui.cards].length&&extra.includes('catalog-tetuno-color')?extra:extra+controls;}
 if(view.boardKind==='oca'&&!controls)controls=actionButton('Tirar','catalog-choice',`data-index="0" data-roll-sequence="${view.lastRoll?.sequence??0}" disabled aria-label="Tirar dado"`);
 // Play pieces directly; choosing an end never discloses which ends are legal.
 if(view.boardKind==='domino'&&view.phase==='play')controls=isTurn?(ui.tile?['left','right'].map(side=>actionButton(side==='left'?'Izquierda':'Derecha','catalog-place-tile',`data-side="${side}"`)).join('')+actionButton('Cancelar','catalog-clear'):actionButton('Pasar','catalog-pass')):'';
 if(selectable&&view.boardKind==='melds')controls+=Object.entries(view.exposed).map(([owner,groups])=>groups.map((group,index)=>actionButton(`Añadir a ${group.kind==='set'?'grupo':'escalera'} ${index+1} de ${name(owner)}`,'catalog-extend',`data-owner="${esc(owner)}" data-group="${index}"`)).join('')).join('');
 const ownsDecision=isTurn||view.options.length>0;
 const instruction=!ownsDecision&&!['oca','checkers','poker'].includes(view.boardKind)?(view.finished?'':`Esperando la jugada de ${name(view.turnPlayer)}.`):view.boardKind==='bank'&&!['bet','result'].includes(view.phase)?'Pide una carta o plántate.':view.boardKind==='oca'&&view.lastRoll&&!view.penalties[playerId]&&view.prison!==playerId?`${name(view.lastRoll.player)}: dado ${view.lastRoll.value} · ${view.lastRoll.from??'?'} → ${view.lastRoll.to??view.positions[view.lastRoll.player]}`:view.instruction||'';
 app.innerHTML=`<section class="catalog-screen game-page" data-game="${view.id}" data-phase="${view.phase}"><header class="play-header"><div><h1><span>ELTETO</span> ${esc(plan.label)}</h1><p>MANO ${view.handNumber}${view.session?' · '+esc(view.session):''}</p></div><button data-action="catalog-zoom" aria-label="Ampliar mesa">Mesa ↗</button><button class="game-menu-button" data-action="open-game-menu" aria-label="Marcador, reglas y opciones de partida">···</button></header>${view.boardKind==='poker'?'':`<section class="players-panel" aria-label="Jugadores y turno">${renderRivalRoster(players,esc)}</section>`}<section class="catalog-surface" aria-label="Mesa de ${esc(plan.label)}">${result&&view.boardKind!=='poker'?`<p class="catalog-result" role="status">${esc(result)}</p>`:''}${board(view,name,true,playerId)}</section><section class="catalog-dock ${view.boardKind==='oca'?'oca-dock':''}" aria-label="Tu mano y acciones"><p class="catalog-instruction" aria-live="polite">${view.finished||view.phase==='result'?'':`<span class="catalog-turn">${esc(view.eliminated?.[playerId]?'Observando · sin fichas':isTurn?'Tu turno':ownsDecision?'Te toca decidir':'Turno de '+name(view.turnPlayer))}</span>`}${esc(view.finished||view.phase==='result'?'':instruction)}${error?`<span role="alert">${esc(error)}</span>`:''}</p>${result&&view.boardKind==='poker'?`<p class="catalog-result" role="status">${esc(result)}</p>`:''}${view.boardKind==='poker'?renderPokerShowdown(view,name,publicCards):''}${view.boardKind==='oca'?renderParchisDie({...view,die:view.roll||null},name):''}<div class="catalog-hand ${view.myTiles||view.boardKind==='poker'?'':'is-fanned'}" style="--hand-count:${Math.max(1,(view.myTiles||myHand).length)}" aria-label="Tus cartas o fichas">${view.myTiles?view.myTiles.map(t=>`<button class="domino-tile ${ui.tile===t.id?'is-selected':''}" data-action="catalog-select-tile" data-tile-id="${esc(t.id)}" aria-pressed="${ui.tile===t.id}" ${!isTurn||view.phase!=='play'?'disabled':''} aria-label="${t.left} y ${t.right}">${tile(t)}</button>`).join(''):myHand.map(c=>cardHtml(c,{action:view.boardKind==='poker'?'catalog-poker-select-show':'catalog-select-card',chosen:ui.cards.has(c.id),disabled:view.boardKind==='poker'?!view.canShowCards:view.boardKind==='tetuno'?!selectable||!view.playable.includes(c.id):!selectable})).join('')}</div>${view.rankOptions?.length&&isTurn&&view.phase==='play'?`<label class="catalog-rank">Declaro <select id="catalog-rank">${view.rankOptions.map(rank=>`<option value="${rank}">${rank}</option>`).join('')}</select></label>`:''}<div class="catalog-options">${controls}</div></section><dialog class="game-menu" aria-label="Opciones de partida"><header><h2>Tu partida</h2><button data-action="close-game-menu">Volver</button></header><div class="game-menu-content"><p>${esc(plan.label)} · Mano ${view.handNumber}</p><ul class="scoreboard">${view.players.map(p=>`<li class="${p===playerId?'your-score':''}"><span>${esc(name(p))}${p===playerId?' · tú':''}</span><strong>${view.id==='burro'?('BURRO'.slice(0,view.scores[p])||'—'):Number(view.scores[p]).toLocaleString('es-ES',{maximumFractionDigits:2})}</strong></li>`).join('')}</ul><details><summary>Cómo jugar</summary><p>${esc(plan.summary)}</p><p>${esc(plan.implementationNotes)}</p><a href="./reglas_juegos/lectura/${view.id.replace(/-/g,'_')}.html">Ver reglas</a></details><details><summary>Historial de la partida</summary><ol>${view.log.slice().reverse().map(line=>`<li>${esc(view.players.reduce((text,id)=>text.split(id).join(name(id)),line))}</li>`).join('')}</ol></details>${view.boardKind==='poker'?`<button data-action="poker-sound-toggle" aria-pressed="${pokerPrefs.sound}">Sonido: ${pokerPrefs.sound?'activado':'desactivado'}</button><button data-action="poker-bb-toggle">Saldo: ${pokerPrefs.blinds?'ciegas grandes':'fichas'}</button>`:''}${view.boardKind==='poker'&&!view.finished?'<button data-action="poker-break" class="leave-game">Ausentarme y volver</button>':''}<button data-action="leave-room" class="leave-game">Salir de la partida</button></div></dialog>${view.boardKind==='poker'?renderPokerInfo(view,playerId,name,publicCards):''}<dialog class="catalog-zoom"><header><h2>${esc(plan.label)}</h2><button data-action="catalog-close-zoom">Volver</button></header><div class="catalog-zoom-content">${board(view,name,false,playerId)}</div></dialog></section>`;
 for(const saved of amounts){const input=app.querySelector('#'+saved.id);if(!input)continue;if(saved.poker||Number(saved.value)>=Number(input.min)&&Number(saved.value)<=Number(input.max))input.value=saved.value;if(saved.focus){input.focus({preventScroll:true});try{input.setSelectionRange(saved.caret??input.value.length,saved.caret??input.value.length);}catch{}}}
 app.querySelector('.catalog-surface').scrollTop=boardScroll;app.querySelector('.catalog-hand').scrollLeft=handScroll;if(menu){app.querySelector('.game-menu').showModal();app.querySelector('.game-menu-content').scrollTop=menuScroll;}if(zoom){app.querySelector('.catalog-zoom').showModal();app.querySelector('.catalog-zoom-content').scrollTop=zoomScroll;}revealActivePlayer(app);
 if(view.boardKind==='checkers'){const toolbar=app.querySelector('.catalog-surface .checkers-toolbar');if(toolbar)app.querySelector('.catalog-dock').prepend(toolbar);}
 if(view.boardKind==='poker'){organizePokerDock(app);for(const saved of amounts)if(saved.focus){const input=app.querySelector('#'+saved.id);if(input){input.focus({preventScroll:true});try{input.setSelectionRange(saved.caret??input.value.length,saved.caret??input.value.length);}catch{}}}syncPokerAmounts(app,view);collectPokerBets(app,previousPoker,view);app.pokerSnapshot=pokerSnapshot(app,view);}
 finishBoardMotion(app,view,playerId,name,error);
 if(view.boardKind!=='poker')finishPublicMotion(app,view,publicMotion);
 finishTableSpeech(app,view,name);
 if(view.boardKind==='oca')finishDiceRender(app,view,error,OCA_DICE_TARGETS);
}
export function handleCatalogAction(app,button,view,send,render){
 const action=button.dataset.action;if(!action.startsWith('catalog-'))return false;
 const reset=()=>{ui.cards.clear();ui.table.clear();ui.path=[];ui.tile=null;ui.call=false;};
 if(action==='catalog-zoom'){app.querySelector('.catalog-zoom').showModal();return true;}
 if(action==='catalog-close-zoom'){app.querySelector('.catalog-zoom').close();return true;}
 if(action==='catalog-clear'){reset();render();return true;}
 if(action==='catalog-select-tile'){const id=button.dataset.tileId;if(!view.chain.length){send({type:'place',tile:id,side:'right'});return true;}ui.tile=ui.tile===id?null:id;render();return true;}
 if(action==='catalog-place-tile'){if(ui.tile)send({type:'place',tile:ui.tile,side:button.dataset.side});reset();return true;}
 if(action==='catalog-pass'){send({type:'pass'});return true;}
 if(action==='catalog-extend'){if(ui.cards.size!==1)throw new Error('Selecciona una sola carta de tu mano.');send({type:'extend',owner:button.dataset.owner,index:Number(button.dataset.group),cards:[...ui.cards]});reset();return true;}
 if(action==='catalog-checker'){if(app.querySelector('.catalog-screen')?.dataset.motionBusy==='true')return true;const i=Number(button.dataset.square);if(ui.path.includes(i)){ui.path=[];render();return true;}const path=[...ui.path,i],moves=view.moves.filter(m=>path.every((x,j)=>m.path[j]===x));if(!moves.length)throw new Error('Movimiento no válido.');const exact=moves.find(m=>m.path.length===path.length);if(exact){send({type:'move',path});reset();}else{ui.path=path;render();}return true;}
 // El Tetuno: tocar una carta la juega; un comodín pide antes el color que manda.
 if(view.boardKind==='tetuno'&&action==='catalog-select-card'){const id=button.dataset.cardId,card=view.myHand.find(c=>c.id===id);if(!card)return true;if(card.suit==='comodin'){ui.cards.clear();ui.cards.add(id);render();return true;}send({type:'play',card:id,call:ui.call});reset();return true;}
 if(action==='catalog-tetuno-color'){const id=[...ui.cards][0];if(id)send({type:'play',card:id,color:button.dataset.color,call:ui.call});reset();return true;}
 if(action==='catalog-tetuno-call'){ui.call=!ui.call;render();return true;}
 if(action==='catalog-select-card'||action==='catalog-table-card'){const id=button.dataset.cardId;if(action==='catalog-select-card'&&view.boardKind==='tricks'&&view.phase==='play'){send({type:'play',card:id});return true;}const set=action==='catalog-table-card'?ui.table:ui.cards;if(set.has(id))set.delete(id);else{if(action==='catalog-select-card'&&!view.options.some(o=>o.action.selection))set.clear();set.add(id);}render();return true;}
 if(action==='catalog-choice'){const option=view.options[Number(button.dataset.index)];if(!option)return true;const a={...option.action};if(view.boardKind==='oca'&&a.type==='roll'&&button.dataset.rollSequence!==undefined){if(!beginParchisRoll(app,OCA_DICE_TARGETS))return true;a.expectedRoll=Number(button.dataset.rollSequence);}if(a.selection){a.cards=[...ui.cards];delete a.selection;}if(a.singleCard){if(ui.cards.size!==1)throw new Error('Selecciona una sola carta de tu mano.');a.card=[...ui.cards][0];delete a.singleCard;}if(a.tableSelection){a.table=[...ui.table];delete a.tableSelection;}if(a.rankInput){a.rank=app.querySelector('#catalog-rank').value;delete a.rankInput;}if(a.amountInput){a.amount=Number(app.querySelector(`#catalog-amount-${button.dataset.index}`).value);delete a.amountInput;}send(a);reset();return true;}
 return true;
}
