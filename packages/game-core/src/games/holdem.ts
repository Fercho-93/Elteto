import {PhysicalCard} from '../deck';
import {State,base,check,choices,clone,deck,finish,finishHand,integer,makeEngine,mapPlayers,next,note,publicView,requireTurn} from './shared';

const rank=(c:PhysicalCard)=>['2','3','4','5','6','7','8','9','10','J','Q','K','A'].indexOf(c.rank)+2;
export function comparePoker(a:number[],b:number[]){for(let i=0;i<Math.max(a.length,b.length);i++)if((a[i]||0)!==(b[i]||0))return (a[i]||0)-(b[i]||0);return 0;}
function five(cards:PhysicalCard[]){const values=cards.map(rank).sort((a,b)=>b-a),groups=[...new Set(values)].map(r=>({r,n:values.filter(v=>v===r).length})).sort((a,b)=>b.n-a.n||b.r-a.r),flush=cards.every(c=>c.suit===cards[0].suit);const unique=[...new Set(values)];let straight=unique.length===5&&unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0;
 if(flush&&straight)return [8,straight];if(groups[0].n===4)return [7,groups[0].r,groups[1].r];if(groups[0].n===3&&groups[1].n===2)return [6,groups[0].r,groups[1].r];if(flush)return [5,...values];if(straight)return [4,straight];if(groups[0].n===3)return [3,...groups.map(g=>g.r)];if(groups[0].n===2&&groups[1].n===2)return [2,...groups.map(g=>g.r)];if(groups[0].n===2)return [1,...groups.map(g=>g.r)];return [0,...values];}
export function evaluatePokerHand(cards:PhysicalCard[]){check(cards.length>=5&&cards.length<=7);let best:number[]=[],chosen:PhysicalCard[]=[];for(let a=0;a<cards.length-4;a++)for(let b=a+1;b<cards.length-3;b++)for(let c=b+1;c<cards.length-2;c++)for(let d=c+1;d<cards.length-1;d++)for(let e=d+1;e<cards.length;e++){const score=five([cards[a],cards[b],cards[c],cards[d],cards[e]]);if(comparePoker(score,best)>0){best=score;chosen=[cards[a],cards[b],cards[c],cards[d],cards[e]];}}return {score:best,cards:chosen};}
export function evaluatePoker(cards:PhysicalCard[]){return evaluatePokerHand(cards).score;}
const alive=(s:State)=>s.players.filter(p=>!s.folded[p]);
function pay(s:State,p:string,n:number){check(n>=0&&n<=s.chips[p]);s.chips[p]-=n;s.street[p]+=n;s.paid[p]+=n;}
function seatAfter(s:State,seat:number,predicate:(p:string)=>boolean){for(let i=1;i<=s.players.length;i++){const j=(seat+i)%s.players.length;if(predicate(s.players[j]))return j;}return seat;}
// Blinds rise after one full lap of the button: as many hands as players still holding chips.
function advanceBlinds(s:State){const seated=s.players.filter(p=>s.chips[p]>0&&!s.departed?.[p]).length;
 if(s.handNumber===1){s.blindLevel=0;s.blindHandsLeft=seated;return;}
 if(s.blindHandsLeft===undefined){s.blindLevel=s.blindLevel||0;s.blindHandsLeft=seated;return;}
 s.blindHandsLeft--;if(s.blindHandsLeft<=0){s.blindLevel=(s.blindLevel||0)+1;s.blindHandsLeft=seated;}}
function holdemDeal(s:State){s.shownHands={};s.playerActions={};s.hands=mapPlayers(s.players,()=>[]);s.stock=deck(s,'french-52');s.board=[];s.burn=[];s.folded=mapPlayers(s.players,p=>s.chips[p]<=0||!!s.departed?.[p]);s.street=mapPlayers(s.players,()=>0);s.paid=mapPlayers(s.players,()=>0);s.acted=mapPlayers(s.players,()=>-1);advanceBlinds(s);s.smallBlindAmount=5+s.blindLevel*5;s.bigBlindAmount=10+s.blindLevel*5;s.lastRaise=s.bigBlindAmount;s.currentBet=s.bigBlindAmount;s.payouts=[];s.phase='preflop';s.revealed=false;s.handWinner=null;const active=alive(s);if(active.length<2){finish(s,active[0]);return;}
 s.dealer=s.handNumber===1?seatAfter(s,s.players.length-1,p=>!s.folded[p]):seatAfter(s,s.dealer,p=>!s.folded[p]);
 for(let i=0;i<2;i++)for(let j=1;j<=s.players.length;j++){const p=s.players[(s.dealer+j)%s.players.length];if(!s.folded[p])s.hands[p].push(s.stock.pop()!);}
 const small=active.length===2?s.dealer:seatAfter(s,s.dealer,p=>!s.folded[p]),big=seatAfter(s,small,p=>!s.folded[p]);s.smallBlind=s.players[small];s.bigBlind=s.players[big];pay(s,s.smallBlind,Math.min(s.smallBlindAmount,s.chips[s.smallBlind]));pay(s,s.bigBlind,Math.min(s.bigBlindAmount,s.chips[s.bigBlind]));s.pending=active.filter(p=>s.chips[p]>0);s.turn=seatAfter(s,big,p=>s.pending.includes(p));note(s,`Ciegas ${s.smallBlindAmount} / ${s.bigBlindAmount}.`);advancePoker(s);
}
function drawStreet(s:State){s.burn.push(s.stock.pop()!);if(s.board.length===0){s.board.push(...s.stock.splice(-3));s.phase='flop';}else{s.board.push(s.stock.pop()!);s.phase=s.board.length===4?'turn':'river';}}
export function pokerPayout(s:State){const levels=[...new Set(Object.values(s.paid) as number[])].filter(x=>x>0).sort((a,b)=>a-b);let before=0;s.payouts=[];for(const level of levels){const contributors=s.players.filter(p=>s.paid[p]>=level),pot=(level-before)*contributors.length;before=level;const eligible=contributors.filter(p=>!s.folded[p]);if(!eligible.length){const awards=contributors.map(p=>({player:p,amount:pot/contributors.length}));awards.forEach(a=>s.chips[a.player]+=a.amount);s.payouts.push({pot,winners:contributors,awards,refund:true});continue;}const scores=eligible.map(p=>({p,score:evaluatePoker([...s.hands[p],...s.board])}));scores.sort((a,b)=>comparePoker(b.score,a.score));const winners=scores.filter(x=>comparePoker(x.score,scores[0].score)===0).map(x=>x.p);const share=Math.floor(pot/winners.length);let odd=pot%winners.length;const ordered=Array.from({length:s.players.length},(_,i)=>s.players[(s.dealer+i+1)%s.players.length]).filter(p=>winners.includes(p));for(const p of ordered)s.chips[p]+=share+(odd-->0?1:0);s.payouts.push({pot,winners,category:scores[0].score[0],awards:ordered.map((p,i)=>({player:p,amount:share+(i<pot%winners.length?1:0)})),refund:contributors.length===1});}
 s.scores={...s.chips};s.revealed=true;finishHand(s,s.payouts[0]?.winners[0]);endIfAlone(s);
}
// The match ends when only one seat still at the table has chips.
function stillPlaying(s:State){return s.players.filter(p=>s.chips[p]>0&&!s.departed?.[p]);}
function endIfAlone(s:State){const left=stillPlaying(s);if(left.length<=1){finish(s,left[0]);return;}if(s.phase==='result'&&!left.includes(s.players[s.turn]))s.turn=seatAfter(s,s.turn,p=>left.includes(p));}
function advancePoker(s:State){
 const contenders=alive(s);if(contenders.length===1){const winner=contenders[0],pot=(Object.values(s.paid) as number[]).reduce((a,b)=>a+b,0);s.chips[winner]+=pot;s.scores={...s.chips};s.payouts=[{pot,winners:[winner],awards:[{player:winner,amount:pot}]}];finishHand(s,winner);endIfAlone(s);return;}
 s.pending=s.pending.filter((p:string)=>!s.folded[p]&&s.chips[p]>0);
 const capable=contenders.filter(p=>s.chips[p]>0);if(capable.length<=1&&capable.every(p=>s.street[p]>=Math.max(...contenders.filter(q=>q!==p).map(q=>s.street[q]))))s.pending=[];
 if(s.pending.length){if(!s.pending.includes(s.players[s.turn]))s.turn=seatAfter(s,s.turn,p=>s.pending.includes(p));return;}
 if(s.board.length===5){pokerPayout(s);return;}
 if(capable.length<=1){while(s.board.length<5)drawStreet(s);pokerPayout(s);return;}
 drawStreet(s);s.street=mapPlayers(s.players,()=>0);s.acted=mapPlayers(s.players,()=>-1);s.currentBet=0;s.lastRaise=s.bigBlindAmount||10;s.pending=capable;s.turn=seatAfter(s,s.dealer,p=>s.pending.includes(p));
}
function canRaise(s:State,p:string){return s.acted[p]===-1||s.currentBet-s.acted[p]>=s.lastRaise;}
const holdemBase=makeEngine('texas_holdem',(p,seed)=>{const s=base('texas_holdem',p,seed);s.chips=mapPlayers(p,()=>1000);s.scores={...s.chips};s.dealer=0;holdemDeal(s);return s;},(s,p,a)=>{
 requireTurn(s,p);if(s.phase==='result'){check(a.type==='next-hand');s.handNumber++;holdemDeal(s);s.lastAction={sequence:(s.actionSequence||0)+1,handNumber:s.handNumber,player:p,type:'deal',amount:0,target:0};s.actionSequence=s.lastAction.sequence;return;}
 const beforePaid=s.paid[p],beforeStreet=s.street[p],actionPhase=s.phase,opening=s.currentBet===0;const owed=Math.max(0,s.currentBet-s.street[p]);
 if(a.type==='fold')s.folded[p]=true;
 else if(a.type==='check'){check(owed===0,'Tienes que igualar o retirarte.');}
 else if(a.type==='call')pay(s,p,Math.min(owed,s.chips[p]));
 else if(a.type==='raise'||a.type==='all-in'){
  const target=a.type==='all-in'?s.street[p]+s.chips[p]:integer(a.amount,s.currentBet+s.lastRaise,s.street[p]+s.chips[p]);
  if(target>s.currentBet){check(canRaise(s,p),'Esta subida corta no reabre tu apuesta.');const increase=target-s.currentBet;check(increase>=s.lastRaise||target===s.street[p]+s.chips[p],'La subida es demasiado pequeña.');if(increase>=s.lastRaise)s.lastRaise=increase;s.currentBet=target;s.pending=alive(s).filter(q=>q!==p&&s.chips[q]>0&&s.street[q]<target);}
  pay(s,p,target-s.street[p]);
 }else throw new Error('Acción de póker no válida.');
 s.lastAction={sequence:(s.actionSequence||0)+1,handNumber:s.handNumber,player:p,type:a.type,phase:actionPhase,amount:s.paid[p]-beforePaid,target:s.street[p],previousBet:beforeStreet,opening};s.actionSequence=s.lastAction.sequence;s.playerActions||={};s.playerActions[p]=s.lastAction;
 s.acted[p]=s.currentBet;s.pending=s.pending.filter((id:string)=>id!==p);note(s,`${p}: ${a.type==='fold'?'se retira':a.type==='check'?'pasa':a.type==='call'?'iguala':`apuesta hasta ${s.street[p]}`}.`);s.turn=seatAfter(s,s.turn,id=>s.pending.includes(id));advancePoker(s);
},(s,p)=>{let options:any[]=[];const owed=Math.max(0,s.currentBet-s.street[p]),max=s.street[p]+s.chips[p],min=s.currentBet+s.lastRaise;if(s.players[s.turn]===p&&!s.finished){if(s.phase==='result')options=choices(['Siguiente mano',{type:'next-hand'}]);else{options=choices(['Retirarme',{type:'fold'}],[owed?`Igualar ${Math.min(owed,s.chips[p])}`:'Pasar',{type:owed?'call':'check'}]);if(canRaise(s,p)&&max>=min)options.push({label:s.currentBet?'Subir':'Apostar',action:{type:'raise',amountInput:{min,max,value:min}}});if(max<=s.currentBet||canRaise(s,p))options.push(...choices([`All-in · ${s.chips[p]}`,{type:'all-in'}]));}}
 return publicView(s,p,{boardKind:'poker',board:s.board,playerId:p,currentBet:s.currentBet,lastAction:s.lastAction||null,playerActions:s.playerActions||{},paid:s.paid,canShowCards:!s.revealed&&['result','finished'].includes(s.phase)&&s.payouts.some((pay:any)=>pay.winners.includes(p))&&(s.shownHands?.[p]?.length||0)<s.hands[p].length,winningHands:s.revealed?Object.fromEntries([...new Set(s.payouts.filter((pay:any)=>!pay.refund).flatMap((pay:any)=>pay.winners))].map((id:any)=>[id,evaluatePokerHand([...s.hands[id],...s.board])])):{},chips:s.chips,street:['result','finished'].includes(s.phase)?mapPlayers(s.players,()=>0):s.street,smallBlindAmount:s.smallBlindAmount||5,bigBlindAmount:s.bigBlindAmount||10,blindLevel:s.blindLevel||0,blindHandsLeft:s.blindHandsLeft||1,eliminated:mapPlayers(s.players,id=>s.chips[id]===0&&(['result','finished'].includes(s.phase)||s.folded[id])),folded:s.folded,dealer:s.players[s.dealer],smallBlind:s.smallBlind,bigBlind:s.bigBlind,pot:(Object.values(s.paid) as number[]).reduce((a,b)=>a+b,0),payouts:s.payouts,publicHands:mapPlayers(s.players,id=>s.revealed&&!s.folded[id]?s.hands[id]:s.shownHands?.[id]||[]),instruction:s.phase==='result'?'Bote repartido.':`Sin límite · ciegas ${s.smallBlindAmount||5} / ${s.bigBlindAmount||10}${owed?` · faltan ${owed}`:''}`,session:'1.000 fichas iniciales · las ciegas suben cada vuelta',options});});

// Leaving folds the hand in play; the seat keeps its chips but is never dealt in again.
function leaveTable(state:State,p:string){
 check(state.players.includes(p),'No estás en esta partida.');
 const s=clone(state);s.departed||={};s.departed[p]||=p;if(s.finished)return s;
 if(s.phase!=='result'&&!s.folded[p]){
  s.folded[p]=true;s.pending=(s.pending||[]).filter((q:string)=>q!==p);note(s,`${s.departed[p]} sale de la mesa y se retira.`);
  if(s.players[s.turn]===p)s.turn=seatAfter(s,s.turn,q=>s.pending.includes(q));
  advancePoker(s);
 }
 if(!s.finished)endIfAlone(s);
 return s;
}
// Explicit disclosure is legal only after the hand, and only for the winner's own cards.
export const holdemEngine={...holdemBase,applyAction(state:State,p:string,a:any){
 if(a?.type==='leave')return leaveTable(state,p);
 if(a?.type!=='show-cards')return holdemBase.applyAction(state,p,a);
 check(state.players.includes(p)&&['result','finished'].includes(state.phase)&&!state.revealed&&state.payouts.some((pay:any)=>pay.winners.includes(p)),'Solo puedes enseñar tus cartas después de ganar la mano sin showdown.');
 const ids=a.cards??state.hands[p].map(c=>c.id);check(Array.isArray(ids)&&ids.length>0&&ids.length<=2&&new Set(ids).size===ids.length,'Elige una o dos cartas propias.');
 check(ids.every((id:string)=>state.hands[p].some(c=>c.id===id)),'Solo puedes enseñar tus cartas.');
 const s=clone(state);s.shownHands||={};const shown=new Set([...(s.shownHands[p]||[]).map((c:PhysicalCard)=>c.id),...ids]);s.shownHands[p]=s.hands[p].filter(c=>shown.has(c.id));
 s.lastAction={sequence:(s.actionSequence||0)+1,handNumber:s.handNumber,player:p,type:'show-cards',amount:0,target:0};s.actionSequence=s.lastAction.sequence;s.playerActions||={};s.playerActions[p]=s.lastAction;note(s,`${p}: enseña ${s.shownHands[p].length} cartas.`);return s;
}};

