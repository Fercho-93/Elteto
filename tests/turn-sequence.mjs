import assert from 'node:assert/strict';
import {getGame,listGames,nextBotMove} from '../dist/game-core/index.js';
import {TurnSequence} from '../dist/turn-sequence.js';
import {publicTurnEvent,TURN_INTRO,TURN_RESULT,readableTurn,parchisRoutes} from '../dist/turn-events.js';
let checked=0;
for(const engine of listGames()){
 const ids=Array.from({length:engine.minPlayers},(_,i)=>'p'+i);let state=engine.createInitialState(ids,91);
 for(let step=0;step<12&&!state.finished;step++){
  const move=nextBotMove(engine,state,ids);if(!move)break;
  const next=engine.applyAction(state,move.playerId,move.action),events=ids.map(id=>publicTurnEvent(engine.view(state,id),engine.view(next,id)));
  for(const event of events){if(engine.id==='cinquillo'&&move.action.type==='play')assert.equal(event.action,'Juega carta');assert.ok(event,`${engine.id}: public action detected`);assert.equal(event.actor,move.playerId,`${engine.id}/${move.action.type}: same actual actor in every POV`);assert.deepEqual(event,events[0],`${engine.id}: same public timeline from every POV`);assert.ok(event.motion>=220);}
  state=next;checked++;
 }
}
const privateOnly=getGame('cinquillo').view(getGame('cinquillo').createInitialState(['a','b'],17),'a');
assert.equal(publicTurnEvent(privateOnly,{...privateOnly,myHand:[],validCards:[]}),null,'Private hand/options changes never announce an opponent action');
assert.equal(readableTurn('p10 gana a p1',['p1','p10'],id=>({p1:'Ana',p10:'Bea'})[id]),'Bea gana a Ana');
// A deterministic clock validates ordering, duplicate packets and cancellation.
let now=0,timers=[],n=0,display=[],phases=[];
const advance=ms=>{const until=now+ms;while(true){timers.sort((a,b)=>a.at-b.at);const next=timers[0];if(!next||next.at>until)break;timers.shift();now=next.at;next.fn();}now=until;};
const engine=getGame('domino');let game=engine.createInitialState(['a','b','c','d'],22);
const change=g=>({gameId:'domino',playerId:'a',view:engine.view(g,'a')});
const sequence=new TurnSequence({apply:c=>display.push(c.view.chain.length),phaseChanged:()=>phases.push(sequence.phase),setTimer:(fn,ms)=>{const id=++n;timers.push({id,at:now+ms,fn});return id;},clearTimer:id=>{timers=timers.filter(t=>t.id!==id);}});
sequence.receive(change(game));const snapshots=[];
for(let i=0;i<3;i++){const move=nextBotMove(engine,game,game.players);game=engine.applyAction(game,move.playerId,move.action);snapshots.push(change(game));sequence.receive(change(game));}
assert.deepEqual(display,[0]);assert.equal(sequence.phase,'announce');sequence.receive(snapshots.at(-1));assert.equal(sequence.queue.length,2);
advance(TURN_INTRO);assert.deepEqual(display,[0,1]);assert.equal(sequence.phase,'move');advance(850);assert.equal(sequence.phase,'result');advance(TURN_RESULT);assert.equal(sequence.phase,'announce');
advance(10000);assert.deepEqual(display,[0,1,2,3]);assert.equal(sequence.busy,false);assert.equal(sequence.queue.length,0);
sequence.receive({...snapshots[0],playerId:'b'});assert.equal(sequence.busy,false,'A new POV never replays old turns');
sequence.receive({...snapshots[1],playerId:'b'});sequence.reset();advance(10000);assert.equal(display.at(-1),1,'Leaving cancels pending renders');
sequence.receive(snapshots[0]);sequence.receive(snapshots[1]);sequence.receive(snapshots[2]);sequence.flush();assert.equal(display.at(-1),3);assert.equal(sequence.busy,false);
// A long burst also preserves every received action; only an explicit resume flush skips history.
sequence.reset();game=engine.createInitialState(['a','b','c','d'],22);display=[];sequence.receive(change(game));const expected=[0];
for(let i=0;i<10;i++){const move=nextBotMove(engine,game,game.players);game=engine.applyAction(game,move.playerId,move.action);expected.push(engine.view(game,'a').chain.length);sequence.receive(change(game));}
assert.equal(sequence.queue.length,9);advance(30000);assert.deepEqual(display,expected);assert.equal(sequence.busy,false);
const routes=parchisRoutes({pieces:{a:[2,-1,-1,-1],b:[8,-1,-1,-1]}},{players:['a','b'],pieces:{a:[22,-1,-1,-1],b:[-1,-1,-1,-1]}});assert.equal(routes[0].route.length,21);assert.equal(routes[0].duration,6000);assert.deepEqual(routes[1].route,[8,-1]);
console.log(`Turn sequence: ${checked} public actions across all 20 games/POVs; ordered phases, duplicates, cancellation, reconnect and Parchis routes: OK`);
