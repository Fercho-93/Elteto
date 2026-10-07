import {createRng} from '../deck';
import {GameEngine,PlayerId} from '../engine';

export const PARCHIS_COLORS=['yellow','green','red','blue'] as const;
export type ParchisColor=typeof PARCHIS_COLORS[number];
export const PARCHIS_STARTS={yellow:4,green:21,red:38,blue:55}; // zero-based squares 5,22,39,56
export const PARCHIS_SAFE=[4,11,16,21,28,33,38,45,50,55,62,67];
export const PARCHIS_GOAL=71; // 64 shared squares from start, seven lane cells, exact home
export type ParchisPhase='start'|'roll'|'move'|'bonus'|'finished';
export type ParchisState={players:PlayerId[];colors:Record<PlayerId,ParchisColor>;pieces:Record<PlayerId,number[]>;seed:number;rollCount:number;turn:number;phase:ParchisPhase;die:number|null;sixes:number;lastPiece:number|null;bonuses:number[];startingRolls:Record<PlayerId,number>;candidates:PlayerId[];winner:PlayerId|null;finished:boolean;log:string[]};
export type ParchisMove={piece:number;from:number;to:number;steps:number;capture:PlayerId|null};
export type ParchisView=Omit<ParchisState,'seed'|'rollCount'|'turn'|'lastPiece'|'candidates'> & {turnPlayer:PlayerId;legalMoves:ParchisMove[]};
export type ParchisAction={type:'roll'}|{type:'move';piece:number};
export function parchisSquare(color:ParchisColor,progress:number):number|null{return progress>=0&&progress<64?(PARCHIS_STARTS[color]+progress)%68:null;}
function location(state:ParchisState,id:PlayerId,progress:number):string|null {
 if(progress<0||progress===PARCHIS_GOAL)return null;
 const square=parchisSquare(state.colors[id],progress);return square===null?`${state.colors[id]}:${progress}`:`track:${square}`;
}
function occupants(state:ParchisState,key:string):{id:PlayerId;piece:number}[]{
 return state.players.flatMap(id=>state.pieces[id].flatMap((p,piece)=>location(state,id,p)===key?[{id,piece}]:[]));
}
function barrier(state:ParchisState,key:string):boolean {const people=occupants(state,key);return people.length>=2&&people[0].id===people[1].id;}
export function legalParchisMoves(state:ParchisState):ParchisMove[]{
 if(!['move','bonus'].includes(state.phase)||state.finished)return [];
 const id=state.players[state.turn],steps=state.phase==='bonus'?state.bonuses[0]:state.die===6&&!state.pieces[id].includes(-1)?7:state.die!;
 const forced=new Set<number>();
 if(state.phase==='move'&&state.die===6)state.pieces[id].forEach((p,i)=>{const key=location(state,id,p);if(key&&barrier(state,key))forced.add(i);});
 return state.pieces[id].flatMap((from,piece)=>{
  if(from===PARCHIS_GOAL||forced.size&&!forced.has(piece))return [];
  const exit=from===-1;
  if(exit&&(state.phase!=='move'||state.die!==5))return [];
  const to=exit?0:from+steps;
  if(to>PARCHIS_GOAL)return [];
  for(let p=exit?0:from+1;p<to;p++){const key=location(state,id,p);if(key&&barrier(state,key))return [];}
  const target=location(state,id,to),people=target?occupants(state,target):[];
  if(people.length>=2)return [];
  const square=parchisSquare(state.colors[id],to),safe=square!==null&&PARCHIS_SAFE.includes(square);
  const capture=!safe&&people.length&&people[0].id!==id?people[0].id:null;
  return [{piece,from,to,steps:exit?0:steps,capture}];
 });
}
function endTurn(state:ParchisState):ParchisState {
 return state.die===6?{...state,phase:'roll',bonuses:[]}:{...state,turn:(state.turn+1)%state.players.length,phase:'roll',die:null,sixes:0,lastPiece:null,bonuses:[]};
}
function settle(state:ParchisState):ParchisState {
 while(state.bonuses.length){state={...state,phase:'bonus'};if(legalParchisMoves(state).length)return state;state={...state,bonuses:state.bonuses.slice(1),log:[...state.log,`No hay movimiento exacto para la bonificación de ${state.bonuses[0]}.`]};}
 return endTurn(state);
}
function nextDie(state:ParchisState):number{return 1+Math.floor(createRng(state.seed+state.rollCount*104729)()*6);}
export const parchisEngine:GameEngine<ParchisState,ParchisView,ParchisAction>={
 id:'parchis',label:'Parchís',minPlayers:2,maxPlayers:4,
 createInitialState(players,seed){
  if(players.length<2||players.length>4||new Set(players).size!==players.length)throw Error('Parchís requiere de 2 a 4 jugadores distintos.');
  const palette:readonly ParchisColor[]=players.length===2?['yellow','red']:PARCHIS_COLORS;
  return {players:[...players],colors:Object.fromEntries(players.map((id,i)=>[id,palette[i]])),pieces:Object.fromEntries(players.map(id=>[id,[-1,-1,-1,-1]])),seed,rollCount:0,turn:0,phase:'start',die:null,sixes:0,lastPiece:null,bonuses:[],startingRolls:{},candidates:[...players],winner:null,finished:false,log:['Cada jugador tira el dado. Empieza quien saque la puntuación más alta.']};
 },
 applyAction(state,id,action){
  if(state.finished)throw Error('La partida ya ha terminado.');
  if(id!==state.players[state.turn])throw Error('No es tu turno.');
  if(action.type==='roll'){
   if(state.phase!=='roll'&&state.phase!=='start')throw Error('Elige primero una ficha.');
   const die=nextDie(state);let next:ParchisState={...state,rollCount:state.rollCount+1,die,log:[...state.log,`${id} saca un ${die}.`]};
   if(state.phase==='start'){
    next.startingRolls={...state.startingRolls,[id]:die};
    const pending=state.candidates.filter(p=>next.startingRolls[p]===undefined);
    if(pending.length)return {...next,turn:state.players.indexOf(pending[0])};
    const high=Math.max(...state.candidates.map(p=>next.startingRolls[p])),tied=state.candidates.filter(p=>next.startingRolls[p]===high);
    if(tied.length>1)return {...next,candidates:tied,startingRolls:{},turn:state.players.indexOf(tied[0]),die:null,log:[...next.log,'Empate en la salida: vuelven a tirar los empatados.']};
    return {...next,turn:state.players.indexOf(tied[0]),phase:'roll',die:null,log:[...next.log,`${tied[0]} empieza la partida.`]};
   }
   next={...next,phase:'move',sixes:die===6?state.sixes+1:0};
   if(next.sixes===3){
    const pieces={...next.pieces,[id]:[...next.pieces[id]]};
    if(state.lastPiece!==null)pieces[id][state.lastPiece]=-1;
    return {...next,pieces,turn:(state.turn+1)%state.players.length,phase:'roll',sixes:0,lastPiece:null,bonuses:[],log:[...next.log,state.lastPiece===null?'Tres seises: termina el turno.':`${id}: tres seises; la última ficha movida vuelve a la espera.`]};
   }
   return legalParchisMoves(next).length?next:{...endTurn(next),log:[...next.log,'No hay movimiento válido.']};
  }
  if(action.type!=='move'||!Number.isInteger(action.piece))throw Error('Acción de Parchís no válida.');
  const move=legalParchisMoves(state).find(m=>m.piece===action.piece);if(!move)throw Error('Esa ficha no puede moverse con esta tirada.');
  const pieces=Object.fromEntries(state.players.map(p=>[p,[...state.pieces[p]]]));
  pieces[id][move.piece]=move.to;
  if(move.capture){const key=location(state,id,move.to),captured=state.pieces[move.capture].findIndex(p=>location(state,move.capture!,p)===key);pieces[move.capture][captured]=-1;}
  const bonuses=state.phase==='bonus'?state.bonuses.slice(1):[];
  let next:ParchisState={...state,pieces,lastPiece:move.piece,bonuses:[...bonuses,...(move.capture?[20]:[]),...(move.to===PARCHIS_GOAL?[10]:[])],log:[...state.log,`${id} mueve la ficha ${move.piece+1}${move.from===-1?' a la salida':` ${move.steps} casillas`}.${move.capture?' Captura: bonificación de 20.':''}${move.to===PARCHIS_GOAL?' Llega a meta: bonificación de 10.':''}`]};
  if(pieces[id].every(p=>p===PARCHIS_GOAL))return {...next,phase:'finished',finished:true,winner:id,bonuses:[],log:[...next.log,`${id} gana la partida.`]};
  return settle(next);
 },
 view(state,id){
  const {seed,rollCount,turn,lastPiece,candidates,...publicState}=state;
  return {...publicState,players:[...state.players],colors:{...state.colors},pieces:Object.fromEntries(state.players.map(p=>[p,[...state.pieces[p]]])),startingRolls:{...state.startingRolls},bonuses:[...state.bonuses],log:state.log.slice(-30),turnPlayer:state.players[state.turn],legalMoves:id===state.players[state.turn]?legalParchisMoves(state):[]};
 },
 isOver:state=>state.finished,
};
