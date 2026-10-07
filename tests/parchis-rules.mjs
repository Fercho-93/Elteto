import assert from 'node:assert/strict';
import {parchisEngine as engine,legalParchisMoves,parchisSquare,PARCHIS_STARTS,PARCHIS_SAFE,createRng} from '../dist/game-core/index.js';
const base=()=>({...engine.createInitialState(['a','b'],1),phase:'move',turn:0,die:1,pieces:{a:[5,-1,-1,-1],b:[-1,-1,-1,-1]}});
function dieState(s,die){for(let seed=0;seed<1000;seed++)if(1+Math.floor(createRng(seed+s.rollCount*104729)()*6)===die)return {...s,seed};throw Error('No die seed');}
const enemy=square=>(square-PARCHIS_STARTS.red+68)%68;
assert.throws(()=>engine.createInitialState(['a'],1));assert.throws(()=>engine.createInitialState(['a','a'],1));
assert.equal(PARCHIS_SAFE.length,12);assert.equal(new Set(PARCHIS_SAFE).size,12);
for(const color of Object.keys(PARCHIS_STARTS)){
 const route=Array.from({length:64},(_,i)=>parchisSquare(color,i));assert.equal(new Set(route).size,64);assert.equal(route[0],PARCHIS_STARTS[color]);assert.equal(route[63],(PARCHIS_STARTS[color]+63)%68);assert.equal(parchisSquare(color,64),null);
}
let s=base();assert.throws(()=>engine.applyAction(s,'b',{type:'move',piece:0}));assert.throws(()=>engine.applyAction(s,'a',{type:'roll'}));
s={...s,die:5};assert.deepEqual(legalParchisMoves(s).map(m=>m.piece),[0,1,2,3]);assert.equal(engine.applyAction(s,'a',{type:'move',piece:1}).pieces.a[1],0);
assert.equal(legalParchisMoves({...base(),die:4}).some(m=>m.from===-1),false);
// Capture and bonus come from the exact public location, not progress in another color.
s=base();s.pieces.b[0]=enemy(10);let next=engine.applyAction(s,'a',{type:'move',piece:0});assert.equal(next.pieces.b[0],-1);assert.equal(next.phase,'bonus');assert.deepEqual(next.bonuses,[20]);
next=engine.applyAction(next,'a',{type:'move',piece:0});assert.equal(next.pieces.a[0],26);assert.equal(next.phase,'roll');assert.equal(next.turn,1);
// On a safe cell rivals coexist. A third piece may not enter.
s=base();s.pieces.a[0]=6;s.pieces.b[0]=enemy(11);next=engine.applyAction(s,'a',{type:'move',piece:0});assert.notEqual(next.pieces.b[0],-1);assert.equal(next.bonuses.length,0);
s=base();s.pieces.b=[enemy(10),enemy(10),-1,-1];s.die=3;assert.equal(legalParchisMoves(s).length,0);
s=base();s.pieces.a=[0,0,8,-1];s.die=6;assert.deepEqual(legalParchisMoves(s).map(m=>m.piece),[0,1]);assert.ok(legalParchisMoves(s).every(m=>m.steps===6));
s={...base(),die:6,pieces:{a:[0,4,20,40],b:[-1,-1,-1,-1]}};assert.ok(legalParchisMoves(s).every(m=>m.steps===7));
// Full starts cannot accept a third counter, including an exit on five.
s={...base(),die:5,pieces:{a:[0,0,-1,-1],b:[-1,-1,-1,-1]}};assert.equal(legalParchisMoves(s).some(m=>m.from===-1),false);
// Finish requires exact steps; bonuses chain and unusable bonuses are skipped.
s={...base(),die:2,pieces:{a:[70,-1,-1,-1],b:[-1,-1,-1,-1]}};assert.equal(legalParchisMoves(s).length,0);
s={...s,die:1};next=engine.applyAction(s,'a',{type:'move',piece:0});assert.equal(next.pieces.a[0],71);assert.equal(next.phase,'roll');assert.match(next.log.at(-1),/bonificación de 10/);
s={...base(),phase:'bonus',bonuses:[20],pieces:{a:[51,0,-1,-1],b:[-1,-1,-1,-1]}};next=engine.applyAction(s,'a',{type:'move',piece:0});assert.deepEqual(next.bonuses,[10]);next=engine.applyAction(next,'a',{type:'move',piece:1});assert.equal(next.pieces.a[1],10);
s={...base(),die:1,pieces:{a:[70,71,71,71],b:[-1,-1,-1,-1]}};next=engine.applyAction(s,'a',{type:'move',piece:0});assert.equal(next.winner,'a');assert.equal(next.finished,true);assert.throws(()=>engine.applyAction(next,'a',{type:'roll'}));
// The supplied rule has no exception for the latest piece reaching home before a third six.
s=dieState({...base(),phase:'roll',sixes:2,lastPiece:0,pieces:{a:[71,1,2,3],b:[-1,-1,-1,-1]}},6);next=engine.applyAction(s,'a',{type:'roll'});assert.equal(next.pieces.a[0],-1);assert.equal(next.turn,1);assert.equal(next.sixes,0);
s=dieState(engine.createInitialState(['a','b','c'],1),4);s=engine.applyAction(s,'a',{type:'roll'});s=dieState(s,4);s=engine.applyAction(s,'b',{type:'roll'});s=dieState(s,2);s=engine.applyAction(s,'c',{type:'roll'});assert.deepEqual(s.candidates,['a','b']);assert.equal(s.phase,'start');s=dieState(s,5);s=engine.applyAction(s,'a',{type:'roll'});s=dieState(s,3);s=engine.applyAction(s,'b',{type:'roll'});assert.equal(s.turn,0);assert.equal(s.phase,'roll');
// Each player has exactly one opening roll; only tied players reroll. Results survive transitions.
for(const count of [2,3,4]){
 let opening=engine.createInitialState(['a','b','c','d'].slice(0,count),18);
 for(let i=0;i<count;i++){
  const id=opening.players[opening.turn];opening=dieState(opening,i+1);
  const before=opening.lastRoll?.sequence??0;
  opening=engine.applyAction(opening,id,{type:'roll',expectedRoll:before});
  assert.equal(opening.lastRoll.player,id);assert.equal(opening.lastRoll.value,i+1);
  for(const viewer of opening.players)assert.deepEqual(engine.view(opening,viewer).lastRoll,opening.lastRoll);
 }
 assert.equal(opening.phase,'roll');assert.equal(opening.turn,count-1);assert.equal(opening.die,null);
 assert.equal(opening.lastRoll.value,count);
 assert.throws(()=>engine.applyAction(opening,opening.players[opening.turn],{type:'roll',expectedRoll:opening.lastRoll.sequence-1}),/ya fue procesada/);
 const copy=engine.view(opening,opening.players[0]);copy.lastRoll.value=99;copy.startingCandidates.length=0;assert.equal(opening.lastRoll.value,count);assert.equal(opening.candidates.length,count);
}
s=engine.createInitialState(['a','b','c','d'],6);
for(const value of [6,6,2,1]){const id=s.players[s.turn];s=engine.applyAction(dieState(s,value),id,{type:'roll'});}
assert.equal(s.initialRound,2);assert.deepEqual(engine.view(s,'c').startingCandidates,['a','b']);assert.equal(s.lastRoll.value,1);assert.equal(s.die,null);
assert.throws(()=>engine.applyAction(s,'c',{type:'roll'}),/turno/);
for(const value of [4,4])s=engine.applyAction(dieState(s,value),s.players[s.turn],{type:'roll'});
assert.equal(s.initialRound,3);assert.deepEqual(s.candidates,['a','b']);
s=engine.applyAction(dieState(s,3),'a',{type:'roll'});s=engine.applyAction(dieState(s,5),'b',{type:'roll'});assert.equal(s.turn,1);assert.equal(s.phase,'roll');assert.equal(s.lastRoll.value,5);
// Consecutive equal results have different IDs. Skipped turns and third six keep the landed result.
s=dieState({...base(),phase:'roll',pieces:{a:[-1,-1,-1,-1],b:[-1,-1,-1,-1]}},2);s=engine.applyAction(s,'a',{type:'roll'});assert.equal(s.turn,1);assert.equal(s.die,null);assert.equal(s.lastRoll.value,2);
const previous=s.lastRoll.sequence;s=engine.applyAction(dieState(s,2),'b',{type:'roll',expectedRoll:previous});assert.equal(s.lastRoll.value,2);assert.equal(s.lastRoll.sequence,previous+1);
s=engine.applyAction(dieState({...base(),phase:'roll',sixes:2,lastPiece:0},6),'a',{type:'roll'});assert.equal(s.lastRoll.value,6);assert.equal(s.turn,1);
// Old saved states without visual metadata can still roll.
s=engine.createInitialState(['a','b'],1);delete s.lastRoll;delete s.initialRound;s=engine.applyAction(s,'a',{type:'roll',expectedRoll:0});assert.equal(s.lastRoll.round,1);
// Full deterministic games also verify input immutability, view isolation and color assignment.
for(let seed=1;seed<=90;seed++){
 const count=2+seed%3,ids=['a','b','c','d'].slice(0,count);let game=engine.createInitialState(ids,seed);
 for(let step=0;step<6000&&!game.finished;step++){
  const id=game.players[game.turn],view=engine.view(game,id),snapshot=JSON.stringify(game);
  assert.ok(!('seed' in view)&&!('rollCount' in view)&&!('candidates' in view));
  const moves=view.legalMoves;const action=moves.length?{type:'move',piece:[...moves].sort((a,b)=>(b.to===71)-(a.to===71)||(b.from===-1)-(a.from===-1)||b.to-a.to)[0].piece}:{type:'roll'};
  const next=engine.applyAction(game,id,action);assert.equal(JSON.stringify(game),snapshot);assert.deepEqual(next,engine.applyAction(JSON.parse(snapshot),id,action));game=next;
  for(const p of ids){assert.equal(game.pieces[p].length,4);assert.ok(game.pieces[p].every(n=>Number.isInteger(n)&&n>=-1&&n<=71));}
 }
 assert.ok(game.finished,`Game ${seed} did not finish`);assert.ok(game.pieces[game.winner].every(p=>p===71));
 const view=engine.view(game,ids[0]);view.pieces[ids[0]][0]=-999;assert.notEqual(game.pieces[ids[0]][0],-999);
}
console.log('Parchís: 90 full games, starting ties, safe cells, barriers, forced opening, captures, exact finish, bonus chains, third six, immutability and public views: OK');
