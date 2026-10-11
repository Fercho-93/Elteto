import assert from 'node:assert/strict';
import {getGame,pokerAbsentAction} from '../dist/game-core/index.js';
import {PokerAbsenceRunner} from '../dist/poker-presence.js';
const engine=getGame('texas-holdem'),players=['ana','bea','carla'];
let state=engine.createInitialState(players,91);
const total=()=>Object.values(state.chips).reduce((a,b)=>a+b,0)+(['result','finished'].includes(state.phase)?0:Object.values(state.paid).reduce((a,b)=>a+b,0));
assert.equal(total(),3000);
assert.deepEqual(players.map(p=>state.chips[p]+state.paid[p]),[1000,1000,1000]);
for(let hand=1;hand<=6;hand++){
 assert.equal(state.smallBlindAmount,5+Math.floor((hand-1)/2)*5);
 assert.equal(state.bigBlindAmount,10+Math.floor((hand-1)/2)*5);
 assert.equal(engine.view(state,'ana').nextBlindHand,2*(Math.floor((hand-1)/2)+1)+1);
 while(state.phase!=='result')state=engine.applyAction(state,state.players[state.turn],{type:'fold'});
 assert.equal(total(),3000);assert.ok(Object.values(engine.view(state,'ana').street).every(n=>n===0));
 state=engine.applyAction(state,state.players[state.turn],{type:'next-hand'});
}
let now=0,away=new Set([state.players[state.turn]]),moves=0;
const runner=new PokerAbsenceRunner(()=>({engine,state,players:players.map(id=>({id,away:away.has(id)}))}),async move=>{state=engine.applyAction(state,move.playerId,move.action);moves++;},{delay:12000,clock:()=>now});
assert.equal(pokerAbsentAction(state).type,'fold');
await runner.tick();now=11999;await runner.tick();assert.equal(moves,0);
away.clear();now=13000;await runner.tick();assert.equal(moves,0,'reconnection cancels automatic fold');
away.add(state.players[state.turn]);await runner.tick();now=25000;await runner.tick();assert.equal(moves,1);
away=new Set(players);now=50000;await runner.tick();now=80000;await runner.tick();assert.equal(moves,1,'all absent waits');
state.phase='flop';state.currentBet=0;state.street[state.players[state.turn]]=0;assert.equal(pokerAbsentAction(state).type,'check');
state.chips[state.players[state.turn]]=0;assert.equal(pokerAbsentAction(state),null,'all-in remains eligible');
state.finished=true;assert.equal(pokerAbsentAction(state),null);
console.log('Póker: 1.000 fichas, niveles de ciegas, bote y ausencia/reenganche verificados.');
