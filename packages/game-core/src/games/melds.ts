import {PhysicalCard,shuffle} from '../deck';
import {State,base,check,choices,deck,deal,finish,finishHand,makeEngine,mapPlayers,next,note,publicView,random,requireTurn,selected,take} from './shared';

const ranks=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const sequence=(id:string)=>id==='chinchon'?['1','2','3','4','5','6','7','10','11','12']:ranks;
export function meldKind(cards:PhysicalCard[],id:string):'set'|'run'|null {
 const natural=cards.filter(c=>c.suit!=='joker');if(!natural.length||cards.length<3)return null;
 if(natural.every(c=>c.rank===natural[0].rank))return 'set';
 if(cards.length<(id==='continental'?4:3)||!natural.every(c=>c.suit===natural[0].suit))return null;
 const order=sequence(id),values=natural.map(c=>order.indexOf(c.rank));if(values.some(v=>v<0)||new Set(values).size!==values.length||cards.length>order.length)return null;
 for(let start=0;start<order.length;start++){
  const run=Array.from({length:cards.length},(_,i)=>(start+i)%order.length);
  const wrap=start+cards.length>order.length;
  if(wrap&&id==='chinchon'||wrap&&id==='remigio'&&start+cards.length>order.length+1)continue;
  if(values.every(v=>run.includes(v)))return 'run';
 }
 return null;
}
export function meldValue(c:PhysicalCard,id:string){if(c.suit==='joker')return id==='continental'?50:20;if(id==='chinchon')return Number(c.rank)>7?Number(c.rank)-2:Number(c.rank);const r=ranks.indexOf(c.rank)+1;return id==='continental'?(r===1?20:r>=8?10:5):Math.min(r,10);}
type Group={cards:PhysicalCard[];kind:'set'|'run'};
// Hand sizes are small. Unique physical identities keep repeated decks separate.
export function meldGroups(cards:PhysicalCard[],id:string):Group[]{
 const found:Group[]=[],seen=new Set<string>();
 function add(group:PhysicalCard[]){const key=group.map(c=>c.id).sort().join('|');if(seen.has(key))return;const kind=meldKind(group,id);if(kind){seen.add(key);found.push({cards:group,kind});}}
 const jokers=cards.filter(c=>c.suit==='joker');
 for(const rank of new Set(cards.filter(c=>c.suit!=='joker').map(c=>c.rank))){const candidates=cards.filter(c=>c.rank===rank&&c.suit!=='joker').concat(jokers);function subsets(i:number,g:PhysicalCard[]){if(g.length>=3)add(g);for(let j=i;j<candidates.length;j++)subsets(j+1,[...g,candidates[j]]);}subsets(0,[]);}
 const order=sequence(id),min=id==='continental'?4:3;
 for(const suit of new Set(cards.filter(c=>c.suit!=='joker').map(c=>c.suit)))for(let start=0;start<order.length;start++){
  const visited=new Set<string>();
  function run(offset:number,g:PhysicalCard[],unused:PhysicalCard[]){const key=g.map(c=>c.id).sort().join('|');if(visited.has(key))return;visited.add(key);if(g.length>=min)add(g);if(offset>=order.length)return;const at=start+offset;if(at>=order.length&&(id==='chinchon'||id==='remigio'&&at>order.length))return;const candidates=unused.filter(c=>c.suit==='joker'||c.suit===suit&&c.rank===order[at%order.length]);for(const c of candidates)run(offset+1,[...g,c],unused.filter(x=>x.id!==c.id));}
  run(0,[],cards);
 }
 return found;
}
export function analyzeMelds(cards:PhysicalCard[],id:string){
 const groups=meldGroups(cards,id),index=new Map(cards.map((c,i)=>[c.id,i])),masks=groups.map(g=>g.cards.reduce((m,c)=>m|1n<<BigInt(index.get(c.id)!),0n)),memo=new Map<bigint,{points:number;groups:Group[];loose:PhysicalCard[]}>();
 function solve(mask:bigint):{points:number;groups:Group[];loose:PhysicalCard[]}{if(!mask)return {points:0,groups:[],loose:[]};const old=memo.get(mask);if(old)return old;const i=cards.findIndex((_,i)=>(mask&1n<<BigInt(i))!==0n),bit=1n<<BigInt(i),rest=solve(mask^bit);let best={points:rest.points+meldValue(cards[i],id),groups:rest.groups,loose:[cards[i],...rest.loose]};groups.forEach((g,j)=>{const m=masks[j];if((m&bit)&&(m&mask)===m){const r=solve(mask^m);if(r.points<best.points)best={points:r.points,groups:[g,...r.groups],loose:r.loose};}});memo.set(mask,best);return best;}
 return solve((1n<<BigInt(cards.length))-1n);
}
const contracts=[[2,0],[1,1],[0,2],[3,0],[2,1],[1,2],[0,3]];
export function contractGroups(cards:PhysicalCard[],sets:number,runs:number):Group[]|null{
 const options=meldGroups(cards,'continental');
 function search(left:PhysicalCard[],a:number,b:number):Group[]|null{if(!a&&!b)return left.length?null:[];if(!left.length)return null;const first=left[0].id;for(const g of options){if(!g.cards.some(c=>c.id===first)||(g.kind==='set'?a:b)===0||!g.cards.every(c=>left.some(x=>x.id===c.id)))continue;const rest=search(left.filter(c=>!g.cards.some(x=>x.id===c.id)),a-(g.kind==='set'?1:0),b-(g.kind==='run'?1:0));if(rest)return [g,...rest];}return null;}return search(cards,sets,runs);
}
function refill(s:State){if(s.stock.length)return;if(s.discard.length>1){const top=s.discard.pop();s.stock=shuffle(s.discard,()=>random(s));s.discard=[top];}else if(s.penalty?.length){s.stock.push(...s.penalty);s.penalty=[];}}
function draw(s:State,p:string){refill(s);check(s.stock.length,'No quedan cartas para robar.');s.hands[p].push(s.stock.pop()!);}
function packs(s:State){if(s.id==='chinchon')return s.players.length>4?2:1;if(s.id==='remigio')return s.players.length>6?3:2;return s.players.length>=5?2+(s.handNumber>2?1:0)+(s.handNumber>4?1:0):s.players.length===4&&s.handNumber>=5?3:2;}
function meldDeal(s:State){s.hands=mapPlayers(s.players,()=>[]);s.stock=deck(s,s.id==='chinchon'?'spanish-40':s.id==='remigio'?'spanish-poker-54':'french-jokers-54',packs(s));s.discard=[];s.exposed=mapPlayers(s.players,()=>[]);s.opened=mapPlayers(s.players,()=>false);s.turn=(s.handNumber-1)%s.players.length;const active=s.players.filter(p=>!s.eliminated.includes(p));if(!active.includes(s.players[s.turn]))next(s,p=>active.includes(p));deal(s,s.id==='chinchon'?7:s.id==='remigio'?10:s.handNumber+5,active);s.penalty=s.id==='continental'?s.stock.splice(0,Math.floor(s.stock.length/3)):[];s.discard=[s.stock.pop()!];s.phase='draw';s.handWinner=null;}
function scoreMeld(s:State){
 if(s.id==='chinchon'){for(const p of s.players)if(!s.eliminated.includes(p)){const score=s.hands[p].reduce((n,c)=>n+meldValue(c,s.id),0);s.scores[p]+=p===s.closer&&s.chinchon?-10:score;if(s.scores[p]>100)s.eliminated.push(p);}const remaining=s.players.filter(p=>!s.eliminated.includes(p));finishHand(s,s.closer);if(remaining.length<=1)finish(s,remaining[0]);}
 else{for(const p of s.players)s.scores[p]+=s.hands[p].reduce((n,c)=>n+meldValue(c,s.id),0);finishHand(s,s.closer);if(s.handNumber>=(s.id==='continental'?7:6)){const low=Math.min(...Object.values(s.scores));s.winners=s.players.filter(p=>s.scores[p]===low);finish(s,s.winners[0]);}}
}
function beginShow(s:State){s.phase='show';s.queue=s.players.filter(p=>!s.eliminated.includes(p)&&p!==s.closer);s.queue.sort((a:string,b:string)=>(s.players.indexOf(a)-s.players.indexOf(s.closer)+s.players.length)%s.players.length-(s.players.indexOf(b)-s.players.indexOf(s.closer)+s.players.length)%s.players.length);if(!s.queue.length){scoreMeld(s);return;}s.turn=s.players.indexOf(s.queue[0]);}
function allowedExtensions(s:State,p:string){const out:any[]=[];s.players.forEach(owner=>(s.exposed[owner] as Group[]).forEach((g,index)=>{if(s.chinchon&&owner===s.closer)return;for(const card of s.hands[p])if(meldKind([...g.cards,card],s.id)===g.kind)out.push({label:`${card.rank} de ${card.suit} → ${g.kind==='set'?'grupo':'escalera'} ${index+1}`,action:{type:'extend',owner,index,cards:[card.id]}});}));return out;}
export const meldEngines=['chinchon','remigio','continental'].map(id=>makeEngine(id,(p,seed)=>{const s=base(id,p,seed);s.eliminated=[];meldDeal(s);return s;},(s,p,a)=>{
 requireTurn(s,p);if(s.phase==='result'){check(a.type==='next-hand');s.handNumber++;meldDeal(s);return;}
 if(s.phase==='claim'){check(a.type==='claim-discard'||a.type==='continue');if(a.type==='claim-discard'){check(s.discard.length);s.hands[p].push(s.discard.pop()!);if(s.penalty.length)s.hands[p].push(s.penalty.pop());else draw(s,p);s.queue=[];}else s.queue.shift();if(s.queue.length)s.turn=s.players.indexOf(s.queue[0]);else{s.turn=s.resume;s.phase='discard';}return;}
 if(s.phase==='draw'){
  check(a.type==='draw');check(a.source==='stock'||a.source==='discard');if(a.source==='discard'){check(s.discard.length);s.hands[p].push(s.discard.pop()!);}else draw(s,p);s.phase='discard';
  if(s.id==='continental'&&a.source==='stock'&&s.discard.length){s.resume=s.turn;s.queue=Array.from({length:s.players.length-1},(_,i)=>s.players[(s.turn+i+1)%s.players.length]);s.phase='claim';s.turn=s.players.indexOf(s.queue[0]);}return;
 }
 if(s.phase==='show'||s.phase==='layoff'){
  if(a.type==='extend'){const g=s.exposed[a.owner]?.[a.index];check(g&&!(s.chinchon&&a.owner===s.closer));const cs=selected(s,p,a.cards);check(cs.length&&meldKind([...g.cards,...cs],s.id)===g.kind);g.cards.push(...cs.map(c=>take(s,p,c.id)));return;}
  check(a.type==='continue');if(s.phase==='show'){const analysis=analyzeMelds(s.hands[p],s.id);s.exposed[p]=analysis.groups;analysis.groups.flatMap(g=>g.cards).forEach(c=>take(s,p,c.id));}s.queue.shift();if(!s.queue.length&&s.phase==='show'){s.phase='layoff';s.queue=s.players.filter(id=>!s.eliminated.includes(id)&&s.hands[id].length);}if(s.queue.length)s.turn=s.players.indexOf(s.queue[0]);else scoreMeld(s);return;
 }
 check(s.phase==='discard');
 if(a.type==='meld'){check(s.id==='continental'&&!s.opened[p]);const cards=selected(s,p,a.cards),[sets,runs]=contracts[s.handNumber-1],groups=contractGroups(cards,sets,runs);check(groups,'La selección no cumple el contrato de esta mano.');s.exposed[p]=groups;s.opened[p]=true;cards.forEach(c=>take(s,p,c.id));if(!s.hands[p].length){s.closer=p;scoreMeld(s);}return;}
 if(a.type==='extend'){check(s.id==='continental'&&s.opened[p]);const g=s.exposed[a.owner]?.[a.index],cards=selected(s,p,a.cards);check(g&&cards.length&&meldKind([...g.cards,...cards],s.id)===g.kind);g.cards.push(...cards.map(c=>take(s,p,c.id)));if(!s.hands[p].length){s.closer=p;scoreMeld(s);}return;}
 if(a.type==='replace-joker'){check(s.id==='continental'&&s.opened[p]);const g=s.exposed[a.owner]?.[a.index],c=s.hands[p].find(c=>c.id===a.card),j=g?.cards.findIndex((c:PhysicalCard)=>c.id===a.joker&&c.suit==='joker');check(c&&c.suit!=='joker'&&g&&j>=0);const trial=g.cards.map((x:PhysicalCard,i:number)=>i===j?c:x);check(meldKind(trial,s.id)===g.kind);const joker=g.cards[j];g.cards[j]=take(s,p,c.id);s.hands[p].push(joker);return;}
 check(a.type==='discard'||a.type==='close');const c=s.hands[p].find(c=>c.id===a.card);check(c);if(a.type==='close'){
  check(s.id!=='continental');const remaining=s.hands[p].filter(x=>x.id!==c.id),analysis=analyzeMelds(remaining,s.id);const naturals=remaining.filter(c=>c.suit!=='joker'),color=s.id==='remigio'&&naturals.every(c=>c.suit===naturals[0]?.suit);
  check(s.id==='chinchon'?analysis.points<=5:analysis.points===0||color,'Todavía no puedes cerrar.');s.discard.push(take(s,p,c.id));s.closer=p;
  if(s.id==='remigio'){s.exposed[p]=color?[{kind:'run',cards:[...s.hands[p]]}]:analysis.groups;s.hands[p]=[];scoreMeld(s);return;}
  s.chinchon=analysis.points===0;s.exposed[p]=analysis.groups;analysis.groups.flatMap(g=>g.cards).forEach(c=>take(s,p,c.id));beginShow(s);return;
 }
 s.discard.push(take(s,p,c.id));if(!s.hands[p].length){s.closer=p;scoreMeld(s);return;}next(s,p=>!s.eliminated.includes(p));s.phase='draw';
},(s,p)=>{
 const mine=s.players[s.turn]===p&&!s.finished;let options:any[]=[];
 if(mine){if(s.phase==='result')options=choices(['Siguiente mano',{type:'next-hand'}]);else if(s.phase==='draw')options=[...choices(['Robar del mazo',{type:'draw',source:'stock'}]),...(s.discard.length?choices(['Coger descarte',{type:'draw',source:'discard'}]):[])];else if(s.phase==='claim')options=choices(['Dejar pasar',{type:'continue'}],['Coger descarte + castigo',{type:'claim-discard'}]);else if(s.phase==='show'||s.phase==='layoff')options=[...choices([s.phase==='show'?'Exponer cartas':'Terminar',{type:'continue'}]),...allowedExtensions(s,p)];else{options=choices(['Descartar',{type:'discard',singleCard:true}]);if(s.id==='continental'){if(!s.opened[p])options.push(...choices(['Exponer contrato',{type:'meld',selection:true}]));else{options.push(...allowedExtensions(s,p));s.players.forEach(owner=>(s.exposed[owner] as Group[]).forEach((g,index)=>{for(const joker of g.cards.filter(c=>c.suit==='joker'))options.push(...choices(['Sustituir comodín',{type:'replace-joker',owner,index,joker:joker.id,singleCard:true} ]));}));}}else options.push(...choices(['Cerrar con esta carta',{type:'close',singleCard:true}]));}}
 const [sets,runs]=contracts[Math.min(s.handNumber-1,6)],contract=s.id==='continental'?`${sets?`${sets} tríos`:''}${sets&&runs?' + ':''}${runs?`${runs} escaleras`:''}`:s.id==='chinchon'?'Cierre con 5 puntos o menos · límite 100':'Combina diez cartas · seis manos';
 return publicView(s,p,{boardKind:'melds',discard:s.discard[s.discard.length-1],exposed:s.exposed,eliminated:s.eliminated,contract,instruction:s.phase==='draw'?'Roba una carta.':s.phase==='claim'?'El descarte está libre. ¿Lo coges con castigo?':(s.phase==='show'||s.phase==='layoff')?'Coloca cartas en las combinaciones expuestas y termina.':'Selecciona cartas para combinar o descartar.',selectable:mine&&s.phase==='discard',options});
}));
