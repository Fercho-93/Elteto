import {PhysicalCard,shuffle} from '../deck';
import {State,base,check,choices,finish,finishHand,makeEngine,mapPlayers,note,publicView,random,requireTurn} from './shared';

/**
 * El Tetuno: el juego de descartes por colores de Elteto. 108 cartas propias: cuatro colores
 * (cada uno con su avatar), números del 0 al 9, «Chúpate 2», «Te salto», «Media vuelta»,
 * comodines de color y «Chúpate 4». Se descarta por color o por símbolo; quien se queda
 * sin cartas gana la mano. Gana la partida quien llegue antes a 5 manos.
 */
export const TETUNO_COLORS=['rojo','amarillo','verde','azul'] as const;
export const TETUNO_ACTIONS=['+2','salto','vuelta'] as const;
export const TETUNO_WILDS=['color','+4'] as const;
export const TETUNO_TARGET=5;
const HAND=7;
export const TETUNO_COLOR_NAMES:Record<string,string>={rojo:'rojo Boletus',amarillo:'amarillo Banana',verde:'verde Guaca',azul:'azul Gotelé'};
const RANK_TEXT:Record<string,string>={'+2':'Chúpate 2','salto':'Te salto','vuelta':'Media vuelta','color':'Comodín','+4':'Chúpate 4'};
export const tetunoCardText=(c:PhysicalCard)=>c.suit==='comodin'?RANK_TEXT[c.rank]:`${RANK_TEXT[c.rank]||c.rank} ${c.suit}`;

export function buildTetunoDeck():PhysicalCard[]{
 const cards:PhysicalCard[]=[];
 for(const suit of TETUNO_COLORS){
  cards.push({suit,rank:'0',pack:0,id:`${suit}:0:0`});
  for(const rank of ['1','2','3','4','5','6','7','8','9',...TETUNO_ACTIONS])for(const copy of [0,1])cards.push({suit,rank,pack:copy,id:`${suit}:${rank}:${copy}`});
 }
 for(const rank of TETUNO_WILDS)for(let copy=0;copy<4;copy++)cards.push({suit:'comodin',rank,pack:copy,id:`comodin:${rank}:${copy}`});
 return cards;
}

const top=(s:State):PhysicalCard=>s.discard[s.discard.length-1];
// El sentido manda: con «Media vuelta» la mesa gira al revés.
function step(s:State,times=1){const n=s.players.length;for(let i=0;i<times;i++)s.turn=(s.turn+s.direction+n)%n;}
function drawOne(s:State,p:string):PhysicalCard|null{
 if(!s.stock.length&&s.discard.length>1){const keep=s.discard.pop();s.stock=shuffle(s.discard,()=>random(s));s.discard=[keep];note(s,'Se acaba el mazo: se baraja el descarte.');}
 const card=s.stock.pop();if(!card)return null;s.hands[p].push(card);return card;
}
function drawMany(s:State,p:string,count:number){let got=0;for(let i=0;i<count;i++)if(drawOne(s,p))got++;return got;}

/** Cartas que `p` puede jugar ahora mismo, según el descarte, el color y los «Chúpate» pendientes. */
export function tetunoPlayable(s:State,p:string):string[]{
 if(s.phase!=='play'||s.players[s.turn]!==p)return [];
 const hand:PhysicalCard[]=s.hands[p],t=top(s);
 const fits=(c:PhysicalCard)=>{
  if(s.pending>0)return c.rank==='+4'||(c.rank==='+2'&&s.pendingKind==='+2');
  if(c.rank==='+4')return !hand.some(x=>x.suit===s.color);
  if(c.suit==='comodin')return true;
  return c.suit===s.color||c.rank===t.rank;
 };
 return hand.filter(c=>(!s.drawn||c.id===s.drawn)&&fits(c)).map(c=>c.id);
}

function deal(s:State){
 s.stock=shuffle(buildTetunoDeck(),()=>random(s));s.hands=mapPlayers(s.players,()=>[]);
 for(let i=0;i<HAND;i++)for(const p of s.players)s.hands[p].push(s.stock.pop()!);
 // La primera carta del descarte siempre es un número: los especiales vuelven al mazo.
 let first=s.stock.pop()!;while(!/^\d$/.test(first.rank)){s.stock.unshift(first);first=s.stock.pop()!;}
 s.discard=[first];s.color=first.suit;s.direction=1;s.pending=0;s.pendingKind=null;s.drawn=null;s.unsaid=null;s.phase='play';
 // La primera mano la abre quien salga del sorteo (según la semilla de la sala); después la salida rota por la mesa.
 if(s.firstDealer===undefined)s.firstDealer=Math.floor(random(s)*s.players.length);
 s.dealer=(s.firstDealer+s.handNumber-1)%s.players.length;s.turn=(s.dealer+1)%s.players.length;
 s.lastPlay={sequence:(s.lastPlay?.sequence??0)+1,player:null,card:first,color:first.suit,kind:'start'};
 note(s,`Mano ${s.handNumber}: empieza ${s.players[s.turn]} y sale ${tetunoCardText(first)}.`);
}

function endHand(s:State,winner:string){
 // Si la última carta era un «Chúpate», el siguiente se lo come igualmente.
 if(s.pending>0){const victim=s.players[s.turn],got=drawMany(s,victim,s.pending);note(s,`${victim} se chupa ${got} ${got===1?'carta':'cartas'} de propina.`);s.pending=0;s.pendingKind=null;}
 s.scores[winner]+=1;s.unsaid=null;s.drawn=null;
 note(s,`${winner} se queda sin cartas y gana la mano: ya lleva ${s.scores[winner]}.`);
 finishHand(s,winner);
 if(s.scores[winner]>=TETUNO_TARGET){finish(s,winner);note(s,`${winner} llega a ${s.scores[winner]} manos y gana la partida.`);}
}

export const tetunoEngine=makeEngine('tetuno',(players,seed)=>{const s=base('tetuno',players,seed);s.lastPlay=null;deal(s);return s;},(s,p,a)=>{
 // Cantar «¡Tetuno!» con una sola carta: hay que hacerlo tras echarla y antes de que el siguiente eche la suya.
 if(a.type==='call'){
  check(s.phase==='play'&&s.unsaid===p&&s.hands[p].length===1,'Ya no puedes cantar Tetuno.');
  s.unsaid=null;s.lastPlay={sequence:(s.lastPlay?.sequence??0)+1,player:p,kind:'call',card:top(s),color:s.color};
  note(s,`${p} canta ¡Tetuno!`);return;
 }
 requireTurn(s,p);
 if(s.phase==='result'){check(a.type==='next-hand','Espera a la siguiente mano.');s.handNumber++;deal(s);return;}
 if(a.type==='draw'){
  check(!s.drawn,'Ya has robado: juega esa carta o pasa.');
  if(s.pending>0){const want=s.pending,got=drawMany(s,p,want);note(s,`${p} se chupa ${got} ${got===1?'carta':'cartas'}.`);s.lastPlay={sequence:(s.lastPlay?.sequence??0)+1,player:p,kind:'eat',count:got,card:top(s),color:s.color};s.pending=0;s.pendingKind=null;step(s);return;}
  const card=drawOne(s,p);s.lastPlay={sequence:(s.lastPlay?.sequence??0)+1,player:p,kind:'draw',count:card?1:0,card:top(s),color:s.color};
  if(card){s.drawn=card.id;if(tetunoPlayable(s,p).length){note(s,`${p} roba una carta.`);return;}}
  s.drawn=null;note(s,card?`${p} roba y pasa.`:`${p} no puede robar: pasa.`);step(s);return;
 }
 if(a.type==='pass'){check(s.drawn,'Solo puedes pasar después de robar.');s.drawn=null;note(s,`${p} pasa.`);s.lastPlay={sequence:(s.lastPlay?.sequence??0)+1,player:p,kind:'pass',card:top(s),color:s.color};step(s);return;}
 check(a.type==='play','Jugada no válida.');
 check(tetunoPlayable(s,p).includes(a.card),s.pending>0?`Te toca chuparte ${s.pending} o devolver otro «Chúpate».`:'Esa carta no casa: mismo color, mismo símbolo o un comodín.');
 if(s.hands[p].find((c:PhysicalCard)=>c.id===a.card)?.suit==='comodin')check(TETUNO_COLORS.includes(a.color),'Elige el color que manda.');
 // Quien se quedó con una carta y no cantó antes de que otro eche la suya se lleva del mazo tantas cartas como jugadores hay.
 let penalty:{player:string;count:number}|null=null;
 if(s.unsaid&&s.unsaid!==p&&s.hands[s.unsaid].length===1){const victim=s.unsaid,got=drawMany(s,victim,s.players.length);penalty={player:victim,count:got};note(s,`${victim} no cantó ¡Tetuno!: se lleva ${got} ${got===1?'carta':'cartas'} del mazo.`);}
 const i=s.hands[p].findIndex((c:PhysicalCard)=>c.id===a.card),card:PhysicalCard=s.hands[p].splice(i,1)[0];
 s.discard.push(card);s.color=card.suit==='comodin'?a.color:card.suit;s.drawn=null;s.unsaid=null;
 const left=s.hands[p].length;
 if(left===1){if(a.call)note(s,`${p} canta ¡Tetuno!`);else s.unsaid=p;}
 s.lastPlay={sequence:(s.lastPlay?.sequence??0)+1,player:p,kind:'play',card,color:s.color,called:left===1&&!!a.call,...(penalty?{penalty}:{})};
 note(s,`${p} juega ${tetunoCardText(card)}${card.suit==='comodin'?` y pide ${TETUNO_COLOR_NAMES[s.color]}`:''}.`);
 if(card.rank==='+2'||card.rank==='+4'){s.pending+=card.rank==='+2'?2:4;s.pendingKind=card.rank;}
 if(card.rank==='vuelta'){s.direction=-s.direction;if(s.players.length>2)note(s,'Media vuelta: cambia el sentido.');}
 if(!left){step(s);endHand(s,p);return;}
 if(card.rank==='salto'||(card.rank==='vuelta'&&s.players.length===2)){step(s);s.lastPlay.skipped=s.players[s.turn];note(s,`${s.players[s.turn]} se queda sin turno.`);step(s);return;}
 step(s);
},(s,p)=>{
 const mine=s.players[s.turn]===p&&!s.finished,playable=tetunoPlayable(s,p);
 const options=[
  ...(s.phase==='play'&&s.unsaid===p&&s.hands[p].length===1?choices(['Cantar ¡Tetuno!',{type:'call'}]):[]),
  ...(!mine?[]:s.phase==='result'?choices(['Siguiente mano',{type:'next-hand'}]):s.drawn?choices(['Pasar',{type:'pass'}]):choices([s.pending>0?`Chuparme ${s.pending}`:'Robar',{type:'draw'}])),
 ];
 const instruction=s.phase==='result'?'Mano terminada.':s.pending>0?`¡Chúpate ${s.pending}! Devuelve otro «Chúpate» o cómetelas.`:s.drawn?'Puedes jugar la carta que has robado o pasar.':'Mismo color, mismo símbolo o un comodín.';
 return publicView(s,p,{boardKind:'tetuno',top:top(s),color:s.color,direction:s.direction,pending:s.pending,pendingKind:s.pendingKind,drawn:s.drawn,playable,unsaid:s.unsaid,canCall:s.phase==='play'&&s.unsaid===p,lastPlay:s.lastPlay,target:TETUNO_TARGET,discardCount:s.discard.length,unit:'cartas',selectable:mine&&s.phase==='play',instruction,options});
});
