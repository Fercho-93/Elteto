import {PhysicalCard,SPANISH_SUITS,shuffle} from '../deck';
import {State,base,check,choices,deck,deal,finish,finishHand,makeEngine,mapPlayers,next,note,publicView,random,requireTurn,selected,take,integer} from './shared';

const order=(id:string)=>id==='butifarra'?['2','3','4','5','6','7','8','10','11','12','1','9']:id==='pocha'?['2','3','4','5','6','7','10','11','12','1']:id==='guinote'?['2','4','5','6','7','11','10','12','3','1']:['2','4','5','6','7','10','11','12','3','1'];
const strength=(s:State,c:PhysicalCard)=>order(s.id).indexOf(c.rank);
const value=(s:State,c:PhysicalCard)=>s.id==='butifarra'?({'9':5,'1':4,'12':3,'11':2,'10':1}[c.rank]||0):s.id==='guinote'?({'1':11,'3':10,'12':4,'10':3,'11':2}[c.rank]||0):({'1':11,'3':10,'12':4,'11':3,'10':2}[c.rank]||0);
const paired=(s:State)=>['butifarra','guinote'].includes(s.id)||['brisca','tute'].includes(s.id)&&s.players.length>=4;
const team=(s:State,p:string)=>paired(s)?String(s.players.indexOf(p)%2):p;
const peers=(s:State,p:string)=>s.players.filter(id=>team(s,id)===team(s,p));
function add(s:State,p:string,n:number){peers(s,p).forEach(id=>s.points[id]+=n);}
function beat(s:State,c:PhysicalCard,b:PhysicalCard){return c.suit===b.suit?strength(s,c)>strength(s,b):c.suit===s.trump;}
export function trickWinner(s:State){return s.trick.reduce((best:any,t:any)=>beat(s,t.card,best.card)?t:best,s.trick[0]);}
export function legalTrickCards(s:State,p:string):PhysicalCard[]{
 const hand=s.hands[p];if(!s.trick.length||s.id==='brisca')return hand;
 const lead=s.trick[0].card.suit,winning=trickWinner(s),follow=hand.filter(c=>c.suit===lead),trumps=hand.filter(c=>c.suit===s.trump);
 if(s.id==='tute'&&s.players.length===2&&s.stock.length){return lead===s.trump&&follow.length?follow:hand;}
 if(s.id==='butifarra'&&team(s,winning.player)===team(s,p))return follow.length?follow:hand;
 if(follow.length){const higher=follow.filter(c=>beat(s,c,winning.card));return higher.length?higher:follow;}
 if(trumps.length){const higher=trumps.filter(c=>beat(s,c,winning.card));return higher.length?higher:s.id==='julepe'?trumps:hand;}
 return hand;
}
function handCount(s:State){if(s.id==='brisca')return 3;if(s.id==='tute')return s.players.length===2?8:s.players.length===3?13:10;if(s.id==='butifarra')return 12;if(s.id==='guinote')return 10;if(s.id==='julepe')return s.players.length===5?6:5;return s.schedule[s.handNumber-1]??1;}
function initHand(s:State){s.stock=deck(s,s.id==='butifarra'?'spanish-48':'spanish-40');if(s.id==='pocha'&&s.players.length===3||s.id==='brisca'&&s.players.length===6)s.stock=s.stock.filter(c=>c.rank!=='2');if(s.id==='brisca'&&s.players.length===3)s.stock=s.stock.filter(c=>!(c.rank==='2'&&c.suit==='oros'));
 s.hands=mapPlayers(s.players,()=>[]);s.points=mapPlayers(s.players,p=>s.carry?.[p]||0);s.tricks=mapPlayers(s.players,()=>0);s.predictions={};s.captured=[];s.discard=[];s.trick=[];s.lastTrick=[];s.sung=mapPlayers(s.players,()=>[]);s.capote=null;s.capoteWindow=false;s.joined=[];s.multiplier=1;s.delegated=false;s.takenPinta=false;s.substitute=null;
 s.dealer=s.nextDealer??(s.handNumber-1)%s.players.length;s.nextDealer=null;s.leader=(s.dealer+1)%s.players.length;s.turn=s.leader;
 let participants=s.players;if(s.id==='julepe'&&s.players.length===7){s.sitting=s.players[(s.dealer+s.players.length-1)%s.players.length];participants=s.players.filter(p=>p!==s.sitting);}else s.sitting=null;
 deal(s,handCount(s),participants);s.pinta=s.stock.length?s.stock[0]:s.hands[s.players[s.dealer]][s.hands[s.players[s.dealer]].length-1];s.trump=s.pinta.suit;s.phase=s.id==='pocha'?'predict':s.id==='butifarra'?'choose':s.id==='julepe'?'join':'play';if(s.id==='butifarra')s.turn=s.dealer;if(s.id==='tute'&&s.players.length===3){s.phase='exchange';s.queue=Array.from({length:3},(_,i)=>s.players[(s.leader+i)%3]);}
 if(s.id==='julepe'){s.pot=s.pot||0;if(!s.pot){s.players.forEach(p=>s.scores[p]--);s.pot=s.players.length;}else{s.scores[s.players[s.dealer]]--;s.pot++;}if(s.players[s.turn]===s.sitting)next(s,p=>p!==s.sitting);}
}
function awardGame(s:State,p:string){peers(s,p).forEach(id=>s.scores[id]++);s.carry=null;finishHand(s,p);if(s.scores[p]>=3)finish(s,p);}
export function settleJulepe(s:State){
 const winners=s.joined.filter((p:string)=>s.tricks[p]>=2),losers=s.joined.filter((p:string)=>s.tricks[p]<2),amount=s.pot,dealer=s.players[s.dealer];
 if(s.substitute){
  if(losers.includes(dealer)){const payment=amount*(s.takenPinta?2:1);s.scores[dealer]-=payment;s.pot+=payment;}
  else if(losers.length){s.scores[dealer]+=amount;s.pot=0;}
  else{s.scores[dealer]+=amount/2;s.pot=amount/2;}
 }else if(!losers.length){for(const p of winners)s.scores[p]+=amount/winners.length;s.pot=0;}
 else{let payments=0;for(const p of losers){const payment=amount*(p===dealer&&s.takenPinta?2:1);s.scores[p]-=payment;payments+=payment;}if(winners.length)for(const p of winners)s.scores[p]+=payments/winners.length;else s.pot+=payments;}
 finishHand(s,winners.find((p:string)=>p!==s.substitute)||dealer);if(s.handNumber>=10)finish(s,s.players.reduce((a,b)=>s.scores[a]>=s.scores[b]?a:b));
}
function endHand(s:State){
 const winner=s.lastWinner; if(['tute','guinote'].includes(s.id))add(s,winner,10);
 if(s.id==='pocha'){for(const p of s.players){const delta=Math.abs(s.tricks[p]-s.predictions[p]);s.scores[p]+=delta?-5*delta:10+5*s.tricks[p];}const high=Math.max(...Object.values(s.scores)),winners=s.players.filter(p=>s.scores[p]===high);finishHand(s,winner);if(s.handNumber>=s.schedule.length&&winners.length===1)finish(s,winners[0]);return;}
 if(s.id==='butifarra'){for(const p of s.players)s.scores[p]+=Math.max(0,s.points[p]-36)*s.multiplier;finishHand(s,winner);if(s.scores[winner]>=100||s.scores[s.players[(s.players.indexOf(winner)+1)%4]]>=100)finish(s,s.players.reduce((a,b)=>s.scores[a]>=s.scores[b]?a:b));return;}
 if(s.id==='julepe'){settleJulepe(s);return;}

 if(s.capote){awardGame(s,s.capote);return;}
 const high=Math.max(...(Object.values(s.points) as number[])),best=s.players.filter(p=>s.points[p]===high),p=best.includes(winner)?winner:best[0];
 if(s.id==='guinote'||s.id==='tute'&&s.players.length===2){if(high>=101)awardGame(s,p);else{s.carry={...s.points};s.nextDealer=s.players.indexOf(winner);finishHand(s,winner);}}
 else if(s.id==='brisca'&&best.length===s.players.length){finishHand(s,winner);note(s,'Empate: nadie suma juego.');}else awardGame(s,p);
}
function collectDone(s:State){const winner=s.lastWinner;
 if(s.stock.length&&['brisca','tute'].includes(s.id)&&(s.id==='brisca'||s.players.length===2)){
  for(let i=0;i<s.players.length;i++){const p=s.players[(s.players.indexOf(winner)+i)%s.players.length];if(s.stock.length)s.hands[p].push(s.stock.pop()!);}s.pinta=s.stock.length?s.stock[0]:null;
  if(s.id==='tute'&&s.players.length===2&&!s.stock.length)s.capoteWindow=true;
 }
 if(s.players.every(p=>s.hands[p].length===0)||s.id==='julepe'&&s.joined.every((p:string)=>!s.hands[p].length)){endHand(s);return;}
 s.turn=s.players.indexOf(winner);s.phase='play';s.trick=[];
}
function songs(s:State,p:string){const rank=s.id==='guinote'?'10':'11';let suits=SPANISH_SUITS.filter(suit=>!s.sung[p].includes(suit)&&s.hands[p].some(c=>c.suit===suit&&c.rank===rank)&&s.hands[p].some(c=>c.suit===suit&&c.rank==='12'));if(suits.includes(s.trump))suits=[s.trump];return suits;}
function exchange(s:State,p:string){if(!s.pinta||!s.stock.some(c=>c.id===s.pinta.id))return undefined;const rank=strength(s,s.pinta)>=strength(s,{rank:'10'} as PhysicalCard)?'7':'2';return s.hands[p].find(c=>c.suit===s.trump&&c.rank===rank);}
function finishJoins(s:State){const dealer=s.players[s.dealer];if(!s.joined.includes(dealer))s.joined.push(dealer);if(s.joined.length===1){s.substitute=s.players[s.leader];if(s.substitute===s.sitting)s.substitute=s.players[(s.leader+1)%s.players.length];s.joined.push(s.substitute);s.stock.push(...s.hands[s.substitute]);s.hands[s.substitute]=[];deal(s,6,[s.substitute]);}
 for(const p of s.players)if(!s.joined.includes(p)){s.discard.push(...s.hands[p]);s.hands[p]=[];}s.phase='discard';s.queue=s.players.filter(p=>s.joined.includes(p));s.turn=s.players.indexOf(s.queue[0]);}
export const trickEngines=['brisca','tute','pocha','julepe','guinote','butifarra'].map(id=>makeEngine(id,(p,seed)=>{const s=base(id,p,seed);const max=(p.length===3?36:40)/p.length|0;s.schedule=[...Array.from({length:max-1},(_,i)=>i+1),...Array(p.length).fill(max),...Array.from({length:max-1},(_,i)=>max-1-i)];initHand(s);return s;},(s,p,a)=>{
 requireTurn(s,p);if(s.phase==='result'){check(a.type==='next-hand');s.handNumber++;initHand(s);return;}
 if(s.phase==='exchange'){if(a.type==='exchange-trump'){const c=exchange(s,p);check(c);const old=s.pinta;s.stock[0]=take(s,p,c.id);s.hands[p].push(old);s.pinta=s.stock[0];}else check(a.type==='continue');s.queue.shift();if(s.queue.length)s.turn=s.players.indexOf(s.queue[0]);else{s.phase='play';s.turn=s.leader;}return;}
 if(s.phase==='choose'){if(a.type==='delegate'){check(!s.delegated);s.delegated=true;s.turn=(s.turn+2)%4;return;}check(a.type==='choose-trump'&&(a.suit==='none'||SPANISH_SUITS.includes(a.suit)));s.trump=a.suit;s.multiplier=a.suit==='none'?2:1;s.phase='double';s.queue=[s.players[(s.dealer+1)%4],s.players[(s.dealer+3)%4]];s.turn=(s.dealer+1)%4;return;}
 if(s.phase==='double'||s.phase==='redouble'){check(a.type==='double'||a.type==='continue');if(a.type==='double'){s.multiplier*=2;if(s.phase==='double'){s.phase='redouble';s.queue=[s.players[s.dealer],s.players[(s.dealer+2)%4]];s.turn=s.dealer;return;}s.queue=[];}else s.queue.shift();if(s.queue.length){s.turn=s.players.indexOf(s.queue[0]);return;}s.phase='play';s.turn=s.leader;return;}
 if(s.phase==='predict'){check(a.type==='predict');const n=integer(a.amount,0,handCount(s));check(p!==s.players[s.dealer]||(Object.values(s.predictions) as number[]).reduce((sum:any,v:any)=>sum+v,0)!==handCount(s)-n,'El dador no puede cuadrar todas las bazas.');s.predictions[p]=n;next(s);if(Object.keys(s.predictions).length===s.players.length){s.phase='play';s.turn=s.leader;}return;}
 if(s.phase==='join'){check(a.type==='join'||a.type==='fold');check(a.type==='join'||s.turn!==s.dealer,'El dador debe jugar.');if(a.type==='join')s.joined.push(p);else{s.discard.push(...s.hands[p]);s.hands[p]=[];}if(s.turn===s.dealer)finishJoins(s);else next(s,p=>p!==s.sitting);return;}
 if(s.phase==='discard'){if(a.type==='take-pinta'){check(s.turn===s.dealer&&!s.takenPinta&&s.pinta);const i=s.stock.findIndex(c=>c.id===s.pinta.id);check(i>=0);s.hands[p].push(s.stock.splice(i,1)[0]);s.takenPinta=true;return;}
  check(a.type==='discard');const cards=selected(s,p,a.cards);check(s.hands[p].length-cards.length<=5);cards.forEach(c=>take(s,p,c.id));if(s.stock.length<5-s.hands[p].length){s.stock.push(...shuffle(s.discard as PhysicalCard[],()=>random(s)));s.discard=[];}while(s.hands[p].length<5){check(s.stock.length,'No quedan cartas para ese descarte.');s.hands[p].push(s.stock.pop()!);}s.discard.push(...cards);s.queue.shift();if(s.queue.length)s.turn=s.players.indexOf(s.queue[0]);else{s.phase='play';s.turn=s.dealer;next(s,p=>s.joined.includes(p));}return;}
 if(a.type==='declare-tute'){check(['tute','guinote'].includes(s.id)&&!(s.id==='tute'&&s.players.length===2));check(['12',s.id==='guinote'?'10':'11'].some(rank=>s.hands[p].filter(c=>c.rank===rank).length===4));awardGame(s,p);return;}
 if(a.type==='declare-101'){check(s.carry&&s.points[p]>=101);awardGame(s,p);return;}
 if(s.phase==='collect'){
  if(a.type==='sing'){check(['tute','guinote'].includes(s.id)&&songs(s,p).includes(a.suit));s.sung[p].push(a.suit);add(s,p,a.suit===s.trump?40:20);note(s,`${p} canta ${a.suit===s.trump?40:20} en ${a.suit}.`);}
  else if(a.type==='exchange-trump'){const c=exchange(s,p);check(s.lastWinner===p&&c&&s.stock.length>s.players.length);const pinta=s.pinta,i=s.stock.findIndex(c=>c.id===pinta.id);s.stock[i]=take(s,p,c.id);s.hands[p].push(pinta);s.pinta=s.stock[i];return;}
  else check(a.type==='continue');s.queue.shift();if(s.queue.length)s.turn=s.players.indexOf(s.queue[0]);else collectDone(s);return;
 }
 if(a.type==='declare-capote'){check(s.id==='tute'&&s.players.length===2&&s.capoteWindow&&!s.trick.length);s.capote=p;s.capoteWindow=false;return;}
 check(a.type==='play');check(legalTrickCards(s,p).some(c=>c.id===a.card),'Debes asistir, montar o jugar triunfo.');s.trick.push({player:p,card:take(s,p,a.card)});s.capoteWindow=false;
 const count=s.id==='julepe'?s.joined.length:s.players.length;
 if(s.trick.length===count){const win=trickWinner(s).player;s.tricks[win]++;add(s,win,s.trick.reduce((n:number,t:any)=>n+value(s,t.card),s.id==='butifarra'?1:0));s.captured.push(...s.trick.map((t:any)=>t.card));s.lastTrick=s.trick;s.lastWinner=win;note(s,`${win} gana la baza.`);if(s.capote&&win!==s.capote){awardGame(s,win);return;}s.phase='collect';s.queue=['tute','guinote'].includes(s.id)?peers(s,win):[win];s.turn=s.players.indexOf(s.queue[0]);}
 else next(s,p=>s.id!=='julepe'||s.joined.includes(p));
},(s,p)=>{
 const mine=s.players[s.turn]===p&&!s.finished;let options:any[]=[],valid:string[]=[];if(mine){switch(s.phase){
 case 'result':options=choices(['Siguiente mano',{type:'next-hand'}]);break;
 case 'exchange':options=choices(['Continuar',{type:'continue'}],...(exchange(s,p)?[['Cambiar triunfo',{type:'exchange-trump'}] as [string,any]]:[]));break;
 case 'choose':options=[...SPANISH_SUITS.map(suit=>({label:suit,action:{type:'choose-trump',suit}})),...choices(['Butifarra · sin triunfo',{type:'choose-trump',suit:'none'}]),...(!s.delegated?choices(['Delegar',{type:'delegate'}]):[])];break;
 case 'double':case 'redouble':options=choices(['Sin doblar',{type:'continue'}],[s.phase==='double'?'Contrar':'Recontrar',{type:'double'}]);break;
 case 'predict':options=Array.from({length:handCount(s)+1},(_,amount)=>({label:`${amount} bazas`,action:{type:'predict',amount}})).filter(o=>p!==s.players[s.dealer]||(Object.values(s.predictions) as number[]).reduce((n:any,v:any)=>n+v,0)+o.action.amount!==handCount(s));break;
 case 'join':options=choices(['Juego',{type:'join'}],...(s.turn===s.dealer?[]:[['Paso',{type:'fold'}] as [string,any]]));break;
 case 'discard':options=choices(['Confirmar descarte',{type:'discard',selection:true}],...(s.turn===s.dealer&&!s.takenPinta?[['Tomar la pinta · riesgo doble',{type:'take-pinta'}] as [string,any]]:[]));break;
 case 'collect':options=choices(['Continuar',{type:'continue'}]);if(['tute','guinote'].includes(s.id))options.push(...songs(s,p).map(suit=>({label:`Cantar ${suit===s.trump?40:20} · ${suit}`,action:{type:'sing',suit}})));if(['brisca','tute'].includes(s.id)&&s.lastWinner===p&&exchange(s,p)&&s.stock.length>s.players.length)options.push(...choices(['Cambiar triunfo',{type:'exchange-trump'}]));break;
 case 'play':valid=legalTrickCards(s,p).map(c=>c.id);if(s.capoteWindow)options.push(...choices(['Intentar capote',{type:'declare-capote'}]));break;
 }if(['play','collect'].includes(s.phase)){if(['tute','guinote'].includes(s.id)&&!(s.id==='tute'&&s.players.length===2)&&['12',s.id==='guinote'?'10':'11'].some(rank=>s.hands[p].filter(c=>c.rank===rank).length===4))options.push(...choices(['Cantar tute',{type:'declare-tute'}]));if(s.carry&&s.points[p]>=101)options.push(...choices(['Cantar 101',{type:'declare-101'}]));}}
 const instructions:Record<string,string>={exchange:'Puedes cambiar la pinta antes de empezar.',choose:'Elige triunfo o juega sin triunfo.',double:'¿Contramos?',redouble:'¿Recontramos?',predict:'¿Cuántas bazas te llevas?',join:'¿Entras a esta mano?',discard:'Selecciona las cartas que cambias. Debes quedarte con cinco.',collect:'Baza resuelta.',play:'Las cartas válidas están marcadas.',result:'Recuento de la mano.'};
 return publicView(s,p,{boardKind:'tricks',trick:s.trick,points:s.points,tricks:s.tricks,predictions:s.predictions,trump:s.trump,pinta:s.pinta,pot:s.pot,multiplier:s.multiplier,validCards:valid,selectable:mine&&s.phase==='discard',instruction:instructions[s.phase]||'Partida terminada.',teamLabels:mapPlayers(s.players,id=>paired(s)?`Pareja ${team(s,id)==='0'?'A':'B'}`:s.predictions[id]!==undefined?`${s.tricks[id]} / ${s.predictions[id]} bazas`:''),options});
}));
