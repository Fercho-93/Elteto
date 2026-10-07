import {buildCardMaterial, CardMaterial, PhysicalCard, createRng, shuffle} from '../deck';
import {GameEngine} from '../engine';
import {getGamePlan} from '../catalog';

export type Action = {type:string; [key:string]:any};
export type Choice = {label:string; action:Action};
export type State = {
 id:string; players:string[]; turn:number; seed:number; handNumber:number;
 hands:Record<string,PhysicalCard[]>; stock:PhysicalCard[]; scores:Record<string,number>;
 phase:string; finished:boolean; log:string[]; winner?:string; [key:string]:any;
};
export const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export const mapPlayers=<T>(players:string[],fn:(id:string,i:number)=>T):Record<string,T>=>Object.fromEntries(players.map((p,i)=>[p,fn(p,i)]));
export function check(ok:unknown,message='Jugada no válida.'):asserts ok {if(!ok)throw new Error(message);}
export function integer(n:unknown,min:number,max:number){check(Number.isSafeInteger(n)&&Number(n)>=min&&Number(n)<=max);return Number(n);}
export function base(id:string,players:string[],seed:number):State {
 const plan=getGamePlan(id);check(plan.players.includes(players.length)&&players.length<=8,'Número de jugadores no válido.');
 check(new Set(players).size===players.length&&players.every(p=>typeof p==='string'&&p.length>0),'Jugadores no válidos.');
 return {id,players:[...players],seed:seed>>>0,turn:0,handNumber:1,hands:mapPlayers(players,()=>[]),stock:[],scores:mapPlayers(players,()=>0),phase:'play',finished:false,log:[]};
}
export function random(s:State){s.seed=(s.seed+0x6d2b79f5)>>>0;return createRng(s.seed)();}
export function deck(s:State,material:CardMaterial='spanish-40',packs=1){return shuffle(buildCardMaterial(material,packs),()=>random(s));}
export function deal(s:State,n:number,players=s.players){for(let i=0;i<n;i++)for(const p of players){check(s.stock.length,'No quedan cartas.');s.hands[p].push(s.stock.pop()!);}}
export function take(s:State,p:string,id:string){const i=s.hands[p].findIndex(c=>c.id===id);check(i>=0,'Esa carta no está en tu mano.');return s.hands[p].splice(i,1)[0];}
export function selected(s:State,p:string,ids:unknown):PhysicalCard[]{check(Array.isArray(ids)&&new Set(ids).size===ids.length,'Selecciona cartas distintas.');return ids.map(id=>{const c=s.hands[p].find(c=>c.id===id);check(c,'Esa carta no está en tu mano.');return c;});}
export function next(s:State,eligible=(p:string)=>true){for(let i=0;i<s.players.length;i++){s.turn=(s.turn+1)%s.players.length;if(eligible(s.players[s.turn]))return;}throw new Error('No hay siguiente jugador.');}
export function note(s:State,text:string){s.log.push(text);s.log=s.log.slice(-60);}
export function finishHand(s:State,winner?:string){s.phase='result';s.handWinner=winner||null;s.turn=winner?s.players.indexOf(winner):s.dealer??0;}
export function finish(s:State,winner?:string){s.finished=true;s.winner=winner;s.phase='finished';}
export function choices(...items:[string,Action][]):Choice[]{return items.map(([label,action])=>({label,action}));}
export function publicView(s:State,p:string,extra:Record<string,any>={}){
 check(s.players.includes(p),'No estás en esta partida.');
 return clone({id:s.id,players:s.players,turnPlayer:s.players[s.turn],handNumber:s.handNumber,phase:s.phase,finished:s.finished,winner:s.winner,handWinner:s.handWinner,myHand:s.hands[p],handSizes:mapPlayers(s.players,id=>s.hands[id].length),scores:s.scores,stockCount:s.stock.length,log:s.log,options:[],...extra});
}
export function makeEngine(id:string,init:(players:string[],seed:number)=>State,apply:(s:State,p:string,a:Action)=>void,view:(s:State,p:string)=>any):GameEngine<State,any,Action>{
 const plan=getGamePlan(id);
 return {id:id.replace(/_/g,"-"),label:plan.label,minPlayers:Math.min(...plan.players),maxPlayers:Math.min(8,Math.max(...plan.players)),createInitialState:init,
 applyAction(state,p,a){check(state.players.includes(p),'No estás en esta partida.');check(!state.finished,'La partida ha terminado.');check(a&&typeof a.type==='string');const s=clone(state);apply(s,p,a);return s;},
 view,isOver:s=>s.finished};
}
export function requireTurn(s:State,p:string){check(s.players[s.turn]===p,'Espera tu turno.');}
export const cardName=(c:PhysicalCard)=>`${c.rank} de ${c.suit}`;
