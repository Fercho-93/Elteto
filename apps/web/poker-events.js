export function pokerBoardDelay(index,start){let delay=0;for(let i=start;i<index;i++)delay+=i===2||i===3?1200:160;return delay;}
export const POKER_CATEGORIES=['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full','Póker','Escalera de color'];
export function pokerActionText(a){if(!a)return '';return ({fold:'Se retira',check:'Pasa',call:`Iguala ${a.amount}`,raise:`${a.opening?'Apuesta':'Sube a'} ${a.target}`, 'all-in':`All-in · ${a.amount}`,deal:'Nueva mano','show-cards':'Enseña sus cartas'})[a.type]||'';}
export function pokerTimeline(before,after){
 const fresh=!before||before.handNumber!==after.handNumber;
 if(fresh){const active=after.players.filter(p=>!after.folded[p]).length;return {fresh:true,bet:700,collect:0,board:1600+active*300,show:0,payout:0,total:2300+active*300};}
 const a=after.lastAction,bet=a?.sequence!==before.lastAction?.sequence&&a?.amount>0?900:0;
 const collect=Object.values(before.street||{}).some(n=>n>0)&&Object.values(after.street||{}).every(n=>n===0)?900:0;
 const added=Math.max(0,after.board.length-before.board.length),board=added?900+pokerBoardDelay(after.board.length-1,before.board.length):0;
 const result=['result','finished'].includes(after.phase)&&!['result','finished'].includes(before.phase),show=result&&Object.values(after.publicHands||{}).some(h=>h.length)?900:0;
 const payout=result?(after.payouts?.length||1)*950:0,celebration=result?2800:0;
 return {fresh:false,bet,collect,board,show,payout,celebration,total:Math.max(900,bet+collect+board+show+payout+celebration)};
}
export function pokerPublicEvent(before,after){
 const fresh=before.handNumber!==after.handNumber,a=after.lastAction;
 if(!fresh&&a?.sequence===before.lastAction?.sequence&&JSON.stringify(before.log)===JSON.stringify(after.log)&&before.phase===after.phase)return null;
 const actor=a?.player||before.turnPlayer,label=fresh?'Nueva mano':pokerActionText(a)||after.log?.at(-1)||'Jugada';
 const ended=['result','finished'].includes(after.phase),pay=after.payouts?.filter(p=>!p.refund)||[];
 const result=ended?pay.map(p=>`${p.winners.join(' y ')} recibe ${p.pot} fichas${p.category!==undefined?' · '+POKER_CATEGORIES[p.category]:''}`).join(' · '):label;
 return {actor,action:label,detail:`${actor}: ${label}`,result,kind:'poker',motion:pokerTimeline(before,after).total,pawns:[]};
}
