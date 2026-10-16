import {createRng} from '../deck';
import {GameEngine,PlayerId} from '../engine';

// Colours follow the arms of the board in play order; 5 and 6 add orange and purple.
export const PARCHIS_COLORS=['yellow','green','red','blue','orange','purple'] as const;
export type ParchisColor=typeof PARCHIS_COLORS[number];
// Every arm keeps the classic 17 squares: start on the fifth, safes on its 5th, 12th and 17th.
export const PARCHIS_ARM=17;
export type ParchisLayout={sides:number;cells:number;shared:number;goal:number;starts:Partial<Record<ParchisColor,number>>;safe:number[];colors:ParchisColor[]};
// One side per player: triangle, square, pentagon or hexagon.
export function parchisSides(players:number):number{return players;}
export function parchisLayout(sides=4):ParchisLayout{
 const colors=PARCHIS_COLORS.slice(0,sides) as ParchisColor[],cells=sides*PARCHIS_ARM;
 return {sides,cells,shared:cells-4,goal:cells+3,colors,starts:Object.fromEntries(colors.map((c,k)=>[c,k*PARCHIS_ARM+4])),safe:colors.flatMap((_,k)=>[4,11,16].map(n=>k*PARCHIS_ARM+n))};
}
const CLASSIC=parchisLayout(4);
export const PARCHIS_STARTS=CLASSIC.starts as Record<'yellow'|'green'|'red'|'blue',number>; // zero-based squares 5,22,39,56
export const PARCHIS_SAFE=CLASSIC.safe;
export const PARCHIS_GOAL=CLASSIC.goal; // 64 shared squares from start, seven lane cells, exact home
export type ParchisPhase='setup'|'start'|'roll'|'move'|'bonus'|'finished';
export type ParchisRoll={sequence:number;player:PlayerId;value:number;values?:number[];initial:boolean;round:number};
export type ParchisState={lastRoll?:ParchisRoll;initialRound?:number;startingPlayer?:PlayerId;players:PlayerId[];colors:Record<PlayerId,ParchisColor>;pieces:Record<PlayerId,number[]>;seed:number;rollCount:number;turn:number;phase:ParchisPhase;die:number|null;sixes:number;lastPiece:number|null;bonuses:number[];startingRolls:Record<PlayerId,number>;candidates:PlayerId[];winner:PlayerId|null;finished:boolean;log:string[];
 /** Board sides (3–6); older saves without it use the square board. */ sides?:number;
 /** Dice per roll: 1, or 2 when a table of 5 or 6 chooses it. Null while that choice is pending. */ diceCount?:number|null;
 rolled?:number[];used?:boolean[];repeat?:boolean};
export type ParchisMove={piece:number;from:number;to:number;steps:number;capture:PlayerId|null;dice:number[]};
export type ParchisView=Omit<ParchisState,'seed'|'rollCount'|'turn'|'lastPiece'|'candidates'> & {turnPlayer:PlayerId;legalMoves:ParchisMove[];startingCandidates:PlayerId[];turnOrder:PlayerId[];sides:number;goal:number;cells:number;diceCount:number|null;rolled:number[];used:boolean[];diceChoice:boolean};
export type ParchisAction={type:'roll';expectedRoll?:number}|{type:'move';piece:number;dice?:number[]}|{type:'dice';count:number};
const layoutOf=(state:{sides?:number})=>parchisLayout(state.sides??4);
export const parchisGoal=(state:{sides?:number})=>layoutOf(state).goal;
export function parchisSquare(color:ParchisColor,progress:number,sides=4):number|null{
 const layout=parchisLayout(sides),start=layout.starts[color];
 return start!==undefined&&progress>=0&&progress<layout.shared?(start+progress)%layout.cells:null;
}
function location(state:ParchisState,id:PlayerId,progress:number):string|null {
 if(progress<0||progress===parchisGoal(state))return null;
 const square=parchisSquare(state.colors[id],progress,state.sides??4);return square===null?`${state.colors[id]}:${progress}`:`track:${square}`;
}
function occupants(state:ParchisState,key:string):{id:PlayerId;piece:number}[]{
 return state.players.flatMap(id=>state.pieces[id].flatMap((p,piece)=>location(state,id,p)===key?[{id,piece}]:[]));
}
function barrier(state:ParchisState,key:string):boolean {const people=occupants(state,key);return people.length>=2&&people[0].id===people[1].id;}
const diceCount=(state:ParchisState)=>state.diceCount??1;
// Saved single-die states may only carry `die`; it is the one unused value then.
const rolledDice=(state:ParchisState)=>state.rolled?.length?state.rolled:state.die===null?[]:[state.die];
const usedDice=(state:ParchisState)=>rolledDice(state).map((_,i)=>!!state.rolled?.length&&!!state.used?.[i]);
const isDouble=(values:number[])=>values.length===2&&values[0]===values[1];
export function legalParchisMoves(state:ParchisState):ParchisMove[]{
 if(!['move','bonus'].includes(state.phase)||state.finished)return [];
 const id=state.players[state.turn],layout=layoutOf(state),rolled=rolledDice(state),used=usedDice(state);
 const nestEmpty=!state.pieces[id].includes(-1),free=rolled.flatMap((v,i)=>used[i]?[]:[i]);
 // One option per distinct unused value; a five exits, a six counts seven with nobody at home.
 type Option={dice:number[];steps:number;exit:boolean};const options:Option[]=[];
 if(state.phase==='bonus')options.push({dice:[],steps:state.bonuses[0],exit:false});
 else{
  free.filter((i,n)=>free.findIndex(j=>rolled[j]===rolled[i])===n).forEach(i=>options.push({dice:[i],steps:rolled[i]===6&&nestEmpty?7:rolled[i],exit:rolled[i]===5}));
  if(free.length===2&&rolled[free[0]]+rolled[free[1]]===5)options.push({dice:free,steps:0,exit:true});
 }
 // A barrier opens with the roll that grants another turn: a six, or a double with two dice.
 const forced=new Set<number>(),opening=state.phase==='move'&&(diceCount(state)===1?rolled[0]===6:isDouble(rolled)&&free.length===2);
 if(opening)state.pieces[id].forEach((p,i)=>{const key=location(state,id,p);if(key&&barrier(state,key))forced.add(i);});
 return state.pieces[id].flatMap((from,piece)=>{
  if(from===layout.goal||forced.size&&!forced.has(piece))return [];
  return options.flatMap(({dice,steps,exit}):ParchisMove[]=>{
   // From home only an exit is possible; on the board a single five moves five squares.
   const leaving=from===-1;if(leaving?!exit:dice.length>1)return [];
   const to=leaving?0:from+steps;
   if(to>layout.goal)return [];
   for(let p=leaving?0:from+1;p<to;p++){const key=location(state,id,p);if(key&&barrier(state,key))return [];}
   const target=location(state,id,to),people=target?occupants(state,target):[];
   if(people.length>=2)return [];
   const square=parchisSquare(state.colors[id],to,layout.sides),safe=square!==null&&layout.safe.includes(square);
   const capture=!safe&&people.length&&people[0].id!==id?people[0].id:null;
   return [{piece,from,to,steps:leaving?0:steps,capture,dice}];
  });
 });
}
function endTurn(state:ParchisState):ParchisState {
 const again=state.repeat??state.die===6;
 return again?{...state,phase:'roll',bonuses:[]}:{...state,turn:(state.turn+1)%state.players.length,phase:'roll',die:null,sixes:0,lastPiece:null,bonuses:[],rolled:[],used:[],repeat:false};
}
function settle(state:ParchisState):ParchisState {
 while(state.bonuses.length){state={...state,phase:'bonus'};if(legalParchisMoves(state).length)return state;state={...state,bonuses:state.bonuses.slice(1),log:[...state.log,`No hay movimiento exacto para la bonificación de ${state.bonuses[0]}.`]};}
 // With two dice the second value is played next; an unusable one is lost.
 if(usedDice(state).some(u=>!u)){
  const next:ParchisState={...state,phase:'move'};if(legalParchisMoves(next).length)return next;
  if(state.rolled?.length===2)return endTurn({...state,log:[...state.log,'El otro dado no tiene movimiento válido.']});
 }
 return endTurn(state);
}
function nextDie(state:ParchisState,n=0):number{return 1+Math.floor(createRng(state.seed+state.rollCount*104729+n*7919)()*6);}
export const parchisEngine:GameEngine<ParchisState,ParchisView,ParchisAction>={
 id:'parchis',label:'Parchís',minPlayers:3,maxPlayers:6,
 createInitialState(players,seed){
  if(players.length<3||players.length>6||new Set(players).size!==players.length)throw Error('Parchís requiere de 3 a 6 jugadores distintos.');
  const sides=parchisSides(players.length),palette:readonly ParchisColor[]=PARCHIS_COLORS.slice(0,sides),choose=players.length>=5;
  return {initialRound:1,players:[...players],colors:Object.fromEntries(players.map((id,i)=>[id,palette[i]])),pieces:Object.fromEntries(players.map(id=>[id,[-1,-1,-1,-1]])),seed,rollCount:0,turn:0,phase:choose?'setup':'start',die:null,sixes:0,lastPiece:null,bonuses:[],startingRolls:{},candidates:[...players],winner:null,finished:false,sides,diceCount:choose?null:1,rolled:[],used:[],repeat:false,
   log:[...(choose?[`Mesa de ${players.length}: ${players[0]} elige jugar con uno o dos dados.`]:[]),'Cada jugador tira el dado. Empieza quien saque la puntuación más alta.']};
 },
 applyAction(state,id,action){
  if(state.finished)throw Error('La partida ya ha terminado.');
  if(id!==state.players[state.turn])throw Error('No es tu turno.');
  if(state.phase==='setup'){
   if(action.type!=='dice'||![1,2].includes(action.count))throw Error('Elige primero si se juega con uno o dos dados.');
   return {...state,diceCount:action.count,phase:'start',log:[...state.log,`${id} elige jugar con ${action.count===2?'dos dados':'un dado'}.`]};
  }
  if(action.type==='roll'){
   if(action.expectedRoll!==undefined&&(!Number.isInteger(action.expectedRoll)||action.expectedRoll!==(state.lastRoll?.sequence??0)))throw Error('La tirada ya fue procesada. Espera al turno actual.');
   if(state.phase!=='roll'&&state.phase!=='start')throw Error('Elige primero una ficha.');
   const values=Array.from({length:diceCount(state)},(_,n)=>nextDie(state,n)),die=values[0],total=values.reduce((a,b)=>a+b,0);
   let next:ParchisState={...state,rollCount:state.rollCount+1,die,lastRoll:{sequence:state.rollCount+1,player:id,value:total,...(values.length>1?{values}:{}),initial:state.phase==='start',round:state.initialRound??1},log:[...state.log,values.length>1?`${id} saca ${values[0]} y ${values[1]}.`:`${id} saca un ${die}.`]};
   if(state.phase==='start'){
    next.startingRolls={...state.startingRolls,[id]:total};
    const pending=state.candidates.filter(p=>next.startingRolls[p]===undefined);
    if(pending.length)return {...next,turn:state.players.indexOf(pending[0])};
    const high=Math.max(...state.candidates.map(p=>next.startingRolls[p])),tied=state.candidates.filter(p=>next.startingRolls[p]===high);
    if(tied.length>1)return {...next,candidates:tied,initialRound:(state.initialRound??1)+1,startingRolls:{},turn:state.players.indexOf(tied[0]),die:null,log:[...next.log,'Empate en la salida: vuelven a tirar los empatados.']};
    return {...next,startingPlayer:tied[0],turn:state.players.indexOf(tied[0]),phase:'roll',die:null,log:[...next.log,`${tied[0]} empieza la partida.`]};
   }
   const repeat=values.length>1?isDouble(values):die===6;
   next={...next,phase:'move',rolled:values,used:values.map(()=>false),repeat,sixes:repeat?state.sixes+1:0};
   if(next.sixes===3){
    const pieces={...next.pieces,[id]:[...next.pieces[id]]},what=values.length>1?'tres dobles':'tres seises';
    if(state.lastPiece!==null)pieces[id][state.lastPiece]=-1;
    return {...next,pieces,turn:(state.turn+1)%state.players.length,phase:'roll',sixes:0,lastPiece:null,bonuses:[],rolled:[],used:[],repeat:false,log:[...next.log,state.lastPiece===null?`${what[0].toUpperCase()+what.slice(1)}: termina el turno.`:`${id}: ${what}; la última ficha movida vuelve a la espera.`]};
   }
   return legalParchisMoves(next).length?next:{...endTurn(next),log:[...next.log,'No hay movimiento válido.']};
  }
  if(action.type!=='move'||!Number.isInteger(action.piece))throw Error('Acción de Parchís no válida.');
  const wanted=Array.isArray(action.dice)?action.dice.join(','):null;
  const move=legalParchisMoves(state).find(m=>m.piece===action.piece&&(wanted===null||m.dice.join(',')===wanted));if(!move)throw Error('Esa ficha no puede moverse con esta tirada.');
  const goal=parchisGoal(state),pieces=Object.fromEntries(state.players.map(p=>[p,[...state.pieces[p]]]));
  pieces[id][move.piece]=move.to;
  if(move.capture){const key=location(state,id,move.to),captured=state.pieces[move.capture].findIndex(p=>location(state,move.capture!,p)===key);pieces[move.capture][captured]=-1;}
  const bonuses=state.phase==='bonus'?state.bonuses.slice(1):[],used=usedDice(state).map((u,i)=>u||move.dice.includes(i));
  let next:ParchisState={...state,pieces,rolled:[...rolledDice(state)],used,lastPiece:move.piece,bonuses:[...bonuses,...(move.capture?[20]:[]),...(move.to===goal?[10]:[])],log:[...state.log,`${id} mueve la ficha ${move.piece+1}${move.from===-1?' a la salida':` ${move.steps} casillas`}.${move.capture?' Captura: bonificación de 20.':''}${move.to===goal?' Llega a meta: bonificación de 10.':''}`]};
  if(pieces[id].every(p=>p===goal))return {...next,phase:'finished',finished:true,winner:id,bonuses:[],log:[...next.log,`${id} gana la partida.`]};
  return settle(next);
 },
 view(state,id){
  const {seed,rollCount,turn,lastPiece,candidates,...publicState}=state,layout=layoutOf(state);
  const firstId=state.startingPlayer||[...state.candidates].sort((a,b)=>(state.startingRolls[b]||0)-(state.startingRolls[a]||0))[0]||state.players[0];const first=['setup','start'].includes(state.phase)?0:state.players.indexOf(firstId);const turnOrder=Array.from({length:state.players.length},(_,i)=>state.players[(Math.max(0,first)+i)%state.players.length]);
  return {...publicState,sides:layout.sides,goal:layout.goal,cells:layout.cells,diceCount:state.diceCount===undefined?1:state.diceCount,rolled:[...rolledDice(state)],used:[...usedDice(state)],diceChoice:state.phase==='setup'&&id===state.players[state.turn],turnOrder,lastRoll:state.lastRoll?{...state.lastRoll,...(state.lastRoll.values?{values:[...state.lastRoll.values]}:{})}:undefined,startingCandidates:[...state.candidates],players:[...state.players],colors:{...state.colors},pieces:Object.fromEntries(state.players.map(p=>[p,[...state.pieces[p]]])),startingRolls:{...state.startingRolls},bonuses:[...state.bonuses],log:state.log.slice(-30),turnPlayer:state.players[state.turn],legalMoves:id===state.players[state.turn]?legalParchisMoves(state):[]};
 },
 isOver:state=>state.finished,
};
