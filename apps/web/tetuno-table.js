import {escapeHtml as esc} from './table-view.js';
import {renderDrawPile} from './card-art.js';

// El Tetuno: cartas propias de Elteto, pintadas con los avatares de la casa.
// Cada color tiene su avatar y cada carta especial su gamberro.
export const TETUNO_COLORS=['rojo','amarillo','verde','azul'];
export const TETUNO_COLOR_LABELS={rojo:'Rojo Boletus',amarillo:'Amarillo Banana',verde:'Verde Guaca',azul:'Azul Gotelé'};
const COLOR_AVATAR={rojo:6,amarillo:2,verde:4,azul:7};
// Chúpate 2: Peluson (morritos); Te salto: Ohio (bandera); Media vuelta: Huevada (dos huevos espalda con espalda);
// Comodín: Berenjeno; Chúpate 4: Moñigo; el reverso es de Cerdaco.
const SPECIAL={
 '+2':{avatar:1,index:'+2',banner:'¡CHÚPATE 2!',name:'Chúpate 2'},
 salto:{avatar:3,index:'⊘',banner:'¡TE SALTO!',name:'Te salto'},
 vuelta:{avatar:9,index:'⇄',banner:'MEDIA VUELTA',name:'Media vuelta'},
 color:{avatar:0,index:'★',banner:'COMODÍN',name:'Comodín'},
 '+4':{avatar:8,index:'+4',banner:'¡CHÚPATE 4!',name:'Chúpate 4'},
};
const NUMBER_BANNER={rojo:'BOLETUS',amarillo:'BANANA',verde:'GUACA',azul:'GOTELÉ'};
const avatarImg=n=>`<img class="tetuno-avatar" src="./assets/avatars/${n}.webp" alt="" draggable="false" decoding="async">`;
export const isTetunoCard=card=>card&&(TETUNO_COLORS.includes(card.suit)||card.suit==='comodin');
export function tetunoCardName(card){const special=SPECIAL[card.rank];if(card.suit==='comodin')return special.name;return `${special?special.name:card.rank} ${TETUNO_COLOR_LABELS[card.suit].toLowerCase()}`;}
export function renderTetunoFace(card){
 const special=SPECIAL[card.rank],index=special?special.index:card.rank,wild=card.suit==='comodin';
 const avatar=special?special.avatar:COLOR_AVATAR[card.suit],banner=special?special.banner:NUMBER_BANNER[card.suit];
 return `<span class="tetuno-face tetuno-${wild?'wild':card.suit} ${special?'is-special':'is-number'}" aria-hidden="true"><i class="tetuno-index">${esc(index)}</i><i class="tetuno-index is-bottom">${esc(index)}</i><span class="tetuno-blob">${avatarImg(avatar)}</span>${special?'':`<b class="tetuno-big">${esc(index)}</b>`}<small class="tetuno-banner">${esc(banner)}</small></span>`;
}
export function renderTetunoBack(){return `<span class="tetuno-face tetuno-back" aria-hidden="true"><span class="tetuno-blob">${avatarImg(5)}</span><small class="tetuno-banner">TETUNO</small></span>`;}
const ORDER=['0','1','2','3','4','5','6','7','8','9','+2','salto','vuelta','color','+4'];
export function sortTetunoHand(cards){const suits=[...TETUNO_COLORS,'comodin'];return cards.slice().sort((a,b)=>suits.indexOf(a.suit)-suits.indexOf(b.suit)||ORDER.indexOf(a.rank)-ORDER.indexOf(b.rank));}
function stock(count){
 if(!(count>0))return '<span class="tetuno-empty">Sin mazo</span>';
 return `<div class="deck-stock tetuno-stock" role="img" aria-label="Mazo del Tetuno: ${count} cartas"><span class="deck-stock-card">${renderTetunoBack()}</span><span class="deck-stock-card">${renderTetunoBack()}</span><b class="deck-stock-count">${count}</b></div>`;
}
function lastPlayText(view,who){
 const last=view.lastPlay;if(!last)return '';
 const actor=last.player?who(last.player):'',me=actor==='Tú';
 // En segunda persona cuando la jugada es tuya.
 if(me){
  if(last.kind==='catch')return `Pillas a ${who(last.target)} sin cantar: se chupa ${last.count}`;
  if(last.kind==='eat')return `Te chupas ${last.count} ${last.count===1?'carta':'cartas'}`;
  if(last.kind==='draw')return 'Robas';
  if(last.kind==='pass')return 'Pasas';
  if(last.kind==='play')return `Juegas ${tetunoCardName(last.card)}${last.card.suit==='comodin'?` · pides ${TETUNO_COLOR_LABELS[last.color].toLowerCase()}`:''}${last.called?' · ¡TETUNO!':''}`;
 }
 if(last.kind==='start')return `Sale ${tetunoCardName(last.card)}`;
 if(last.kind==='catch')return last.target===view.players.find(p=>who(p)==='Tú')?`${actor} te pilla sin cantar: te chupas ${last.count}`:`${actor} pilla a ${who(last.target)} sin cantar: se chupa ${last.count}`;
 if(last.kind==='eat')return `${actor} se chupa ${last.count} ${last.count===1?'carta':'cartas'}`;
 if(last.kind==='draw')return `${actor} roba`;
 if(last.kind==='pass')return `${actor} pasa`;
 return `${actor} juega ${tetunoCardName(last.card)}${last.card.suit==='comodin'?` · pide ${TETUNO_COLOR_LABELS[last.color].toLowerCase()}`:''}${last.called?' · ¡TETUNO!':''}`;
}
/** Mesa: mazo, descarte con el color que manda, sentido, castigo acumulado y marcador. */
export function tetunoTable(view,name,playerId,cardHtml,summary){
 const who=p=>p===playerId?'Tú':name(p);
 const strip=`<div class="catalog-scoreline trick-score">${view.players.map(p=>`<span class="${p===playerId?'is-own':''} ${view.unsaid===p?'is-unsaid':''}"><small>${esc(who(p))} · ${view.handSizes[p]} ${view.handSizes[p]===1?'carta':'cartas'}</small><b>${view.scores[p]}</b></span>`).join('')}</div>`;
 if(view.phase==='result'||view.finished)return `${summary}${strip}`;
 // El castigo pendiente va en la fila de arriba, en lugar de «Después»: no roba altura a las cartas.
 const pending=view.pending>0?`<span class="tetuno-pending" role="status"><b>¡Chúpate ${view.pending}!</b><small>${view.turnPlayer===playerId?'Devuélvelo o cómetelas':`Le toca a ${esc(who(view.turnPlayer))}`}</small></span>`:'';
 const direction=`<span class="tetuno-direction ${view.direction<0?'is-reverse':''}" role="img" aria-label="Sentido de la mesa: ${view.direction>0?'hacia delante':'al revés'}"><b aria-hidden="true">${view.direction>0?'↻':'↺'}</b><small>${view.direction>0?'Sentido normal':'¡Media vuelta!'}</small></span>`;
 const next=pending?pending:view.players.length>2?`<span class="tetuno-next"><small>Después</small><b>${esc(who(view.players[((view.players.indexOf(view.turnPlayer)+view.direction)%view.players.length+view.players.length)%view.players.length]))}</b></span>`:'';
 return `<div class="trick-meta tetuno-meta">${direction}${next}<span class="tetuno-goal"><small>Meta</small><b>${view.target}</b></span></div><div class="tetuno-center"><div class="tetuno-pile">${stock(view.stockCount)}<small>Mazo</small></div><div class="tetuno-pile is-discard tetuno-manda-${esc(view.color)}">${cardHtml(view.top)}<small>Manda <b>${esc(TETUNO_COLOR_LABELS[view.color])}</b></small></div></div><p class="tetuno-last" aria-live="polite">${esc(lastPlayText(view,who))}</p>${strip}`;
}
/** Selector de color tras elegir un comodín, más el botón de cantar ¡Tetuno! con dos cartas. */
export function tetunoControls(view,playerId,ui,actionButton){
 const mine=view.turnPlayer===playerId&&!view.finished&&view.phase==='play';
 if(!mine)return '';
 const wild=[...ui.cards].find(id=>view.myHand.some(c=>c.id===id&&c.suit==='comodin'));
 const call=view.myHand.length===2&&view.playable.length?actionButton(ui.call?'¡Tetuno! cantado':'Cantar ¡Tetuno!','catalog-tetuno-call',`class="tetuno-call ${ui.call?'is-on':''}" aria-pressed="${ui.call}"`):'';
 if(wild)return `<span class="tetuno-color-caption">¿Qué color manda?</span>${TETUNO_COLORS.map(color=>actionButton(TETUNO_COLOR_LABELS[color],'catalog-tetuno-color',`class="tetuno-color-choice tetuno-${color}" data-color="${color}"`)).join('')}${call}${actionButton('Cancelar','catalog-clear')}`;
 return call;
}

// Gritos de la mesa: quien canta, pilla, castiga o se queda sin turno lo anuncia sobre su retrato.
// Se recrean en cada redibujado conservando su progreso, como el resto de la física pública.
const SHOUT=1900;
const shoutContexts=new WeakMap();
function shoutsFor(last){
 const out=new Map(),add=(player,text,hit=false)=>{if(!player)return;const old=out.get(player);out.set(player,{text:old?`${old.text} ${text}`:text,hit:hit||old?.hit});};
 if(last.kind==='play'){
  if(last.card.rank==='+2'||last.card.rank==='+4')add(last.player,`¡CHÚPATE ${last.card.rank.slice(1)}!`);
  else if(last.card.rank==='color')add(last.player,`¡${TETUNO_COLOR_LABELS[last.color].split(' ')[0].toUpperCase()}!`);
  else if(last.card.rank==='vuelta'&&!last.skipped)add(last.player,'¡MEDIA VUELTA!');
  if(last.called)add(last.player,'¡TETUNO!');
  if(last.skipped)add(last.skipped,'¡SALTADO!',true);
 }
 if(last.kind==='catch'){add(last.player,'¡PILLADO!');add(last.target,`+${last.count}`,true);}
 if(last.kind==='eat')add(last.player,`¡ÑAM! +${last.count}`,true);
 return [...out].map(([player,shout])=>({player,...shout}));
}
export function finishTetunoEffects(app,view,name,playerId){
 const last=view.lastPlay,key=`${view.players.join('|')}:${view.handNumber}`;
 let ctx=shoutContexts.get(app);
 if(!ctx||ctx.key!==key){shoutContexts.set(app,{key,sequence:last?.sequence,started:0,shouts:[]});return;}
 if(last&&last.sequence!==ctx.sequence){ctx.sequence=last.sequence;ctx.started=performance.now();ctx.shouts=shoutsFor(last);}
 const elapsed=performance.now()-ctx.started,panel=app.querySelector('.catalog-screen .players-panel');
 if(!panel||elapsed>=SHOUT||!ctx.shouts.length||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 const origin=panel.getBoundingClientRect();
 for(const shout of ctx.shouts){
  const seat=[...panel.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===shout.player),token=seat?.querySelector('.rival-token');if(!token)continue;
  const bubble=document.createElement('div');bubble.className=`player-speech tetuno-shout${shout.hit?' is-hit':''}`;bubble.dataset.speaker=shout.player;bubble.setAttribute('role','status');
  bubble.setAttribute('aria-label',`${shout.player===playerId?'Tú':name(shout.player)}: ${shout.text}`);bubble.textContent=shout.text;panel.append(bubble);
  const box=token.getBoundingClientRect(),width=bubble.getBoundingClientRect().width,centreX=box.x+box.width/2-origin.x,left=Math.max(2,Math.min(origin.width-width-2,centreX-width/2));
  bubble.style.left=left+'px';bubble.style.top=box.bottom-origin.y-3+'px';bubble.style.setProperty('--speech-pointer',Math.max(12,Math.min(width-12,centreX-left))+'px');
  const pop=bubble.animate([{opacity:0,transform:'translateY(8px) scale(.6) rotate(-6deg)'},{opacity:1,transform:'translateY(-3px) scale(1.12) rotate(2deg)',offset:.14},{opacity:1,transform:'none',offset:.22},{opacity:1,transform:'none',offset:.85},{opacity:0,transform:'translateY(-6px) scale(.95)'}],{duration:SHOUT,easing:'ease-out',fill:'both'});
  pop.currentTime=elapsed;pop.onfinish=()=>bubble.remove();
  if(shout.hit&&elapsed<600){const shake=token.animate([{transform:'none'},{transform:'translateX(-5px) rotate(-6deg)',offset:.2},{transform:'translateX(5px) rotate(5deg)',offset:.45},{transform:'translateX(-3px) rotate(-3deg)',offset:.7},{transform:'none'}],{duration:600,easing:'ease-out'});shake.currentTime=elapsed;}
 }
}
