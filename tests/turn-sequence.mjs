import assert from 'node:assert/strict';
import {getGame,listGames,nextBotMove,createMusState} from '../dist/game-core/index.js';
import {TurnSequence} from '../dist/turn-sequence.js';
import {publicTurnEvent,TURN_INTRO,TURN_RESULT,readableTurn,parchisRoutes} from '../dist/turn-events.js';
import {PAWN_STEP,PIECE_TRANSFER} from '../dist/game-physics.js';
import {BotPacing} from '../dist/bot-pacing.js';
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
advance(TURN_INTRO);assert.deepEqual(display,[0,1]);assert.equal(sequence.phase,'move');advance(PIECE_TRANSFER);assert.equal(sequence.phase,'result');advance(TURN_RESULT);assert.equal(sequence.phase,'announce');
advance(20000);assert.deepEqual(display,[0,1,2,3]);assert.equal(sequence.busy,false);assert.equal(sequence.queue.length,0);
sequence.receive({...snapshots[0],playerId:'b'});assert.equal(sequence.busy,false,'A new POV never replays old turns');
sequence.receive({...snapshots[1],playerId:'b'});sequence.reset();advance(20000);assert.equal(display.at(-1),1,'Leaving cancels pending renders');
sequence.receive(snapshots[0]);sequence.receive(snapshots[1]);sequence.receive(snapshots[2]);sequence.flush();assert.equal(display.at(-1),3);assert.equal(sequence.busy,false);
// A long burst also preserves every received action; only an explicit resume flush skips history.
sequence.reset();game=engine.createInitialState(['a','b','c','d'],22);display=[];sequence.receive(change(game));const expected=[0];
for(let i=0;i<10;i++){const move=nextBotMove(engine,game,game.players);game=engine.applyAction(game,move.playerId,move.action);expected.push(engine.view(game,'a').chain.length);sequence.receive(change(game));}
assert.equal(sequence.queue.length,9);advance(60000);assert.deepEqual(display,expected);assert.equal(sequence.busy,false);
const routes=parchisRoutes({pieces:{a:[2,-1,-1,-1],b:[8,-1,-1,-1]}},{players:['a','b'],pieces:{a:[22,-1,-1,-1],b:[-1,-1,-1,-1]}});assert.equal(routes[0].route.length,21);assert.equal(routes[0].duration,20*PAWN_STEP);assert.deepEqual(routes[1].route,[8,-1]);
console.log(`Turn sequence: ${checked} public actions across all 20 games/POVs; ordered phases, duplicates, cancellation, reconnect and Parchis routes: OK`);

// Bots wait for the entire visible route, not just a fixed thinking delay.
const pacing=new BotPacing();let stops=0;const runner={stop(){stops++;}};
const longBefore={players:['a','b'],pieces:{a:[2],b:[8]},turnPlayer:'a',log:[]};
const longAfter={...longBefore,pieces:{a:[22],b:[-1]},turnPlayer:'b',log:['captura']};
pacing.observe(longBefore,runner,0);pacing.observe(longAfter,runner,100);
const event=publicTurnEvent(longBefore,longAfter);
assert.equal(pacing.delay(4800,100),TURN_INTRO+event.motion+TURN_RESULT+800);
assert.equal(stops,1);pacing.observe(longAfter,runner,200);assert.equal(stops,1,'Presence redraws do not restart the bot timer');
assert.equal(pacing.delay(4800,99999),4800);
// Mus announcements come only from public events and remain identical in four POVs.
const mus=getGame('mus');let m=createMusState(['a','b','c','d'],17);for(let i=0;i<2;i++)m=mus.applyAction(m,'a',{type:'advance'});
const cut=mus.applyAction(m,'a',{type:'mus',wantsMus:false});
const musEvents=m.players.map(id=>publicTurnEvent(mus.view(m,id),mus.view(cut,id)));
assert.ok(musEvents[0]);assert.equal(musEvents[0].actor,'a');for(const e of musEvents)assert.deepEqual(e,musEvents[0]);
// An automatic, non-action snapshot received during animation must still be applied.
sequence.reset();display=[];sequence.receive(snapshots[0]);sequence.receive(snapshots[1]);
const automatic={...snapshots[1],view:{...snapshots[1].view,revision:42}};
sequence.receive(automatic);advance(20000);assert.equal(sequence.current.view.revision,42);
console.log('Pacing: slow ordered moves, complete-route AI waits, public Mus announcements and automatic-state retention: OK');

// A simple checker move releases the opponent in under a second, after visible motion.
sequence.reset();sequence.apply=()=>{};display=[];const checkers=getGame('damas-espanolas');let c=checkers.createInitialState(['a','b'],11);
const checkerChange=g=>({gameId:'damas-espanolas',playerId:'a',view:checkers.view(g,'a')});
sequence.receive(checkerChange(c));const cm=nextBotMove(checkers,c,c.players);c=checkers.applyAction(c,cm.playerId,cm.action);sequence.receive(checkerChange(c));
assert.equal(sequence.phase,'announce');advance(180);assert.equal(sequence.phase,'move');advance(500);assert.equal(sequence.phase,'result');advance(250);assert.equal(sequence.busy,false);
console.log('Damas: complete simple move and opponent turn in 930 ms: OK');

// Pieces retain chosen player characters, including crowns and pawn identifiers.
const {renderCheckerPiece}=await import('../dist/board-games.js');
const {renderPawnFace}=await import('../dist/parchis-board.js');
const characters={a:4,b:7},avatarView={players:['a','b'],characters};
assert.match(renderCheckerPiece(avatarView,1),/data-avatar="4"/);
assert.match(renderCheckerPiece(avatarView,-1),/data-avatar="7"/);
assert.match(renderCheckerPiece(avatarView,-2),/checker-crown/);
assert.match(renderPawnFace(avatarView,'b',3),/data-avatar="7"/);
assert.match(renderPawnFace(avatarView,'b',3),/parchis-pawn-number">4/);
console.log('Board pieces: chosen characters, owner identity, king crowns and numbered pawns: OK');
