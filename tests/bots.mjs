import assert from 'node:assert/strict';
import {listGames, getGamePlan, chooseBotAction, nextBotMove, fillBotSeats, createRng, BotRunner} from '../dist/game-core/index.js';
import {LocalHostSession} from '../dist/local-session.js';

const random = createRng(317);
let moves = 0;
for (const engine of listGames()) {
  // All supported sizes, including fixed pairs and non-contiguous player counts.
  for (const count of getGamePlan(engine.id).players.filter(n => n <= engine.maxPlayers)) {
    const players = Array.from({length:count}, (_,i) => `p${i}`);
    let state = engine.createInitialState(players, 71 + count);
    for (let step = 0; step < 20000 && !engine.isOver(state); step++) {
      const before = JSON.stringify(state);
      const move = engine.id==='mus'&&state.version===2&&['dealing','cards-dealt','redeal','showing','counting'].includes(state.phase)?{playerId:players[0],action:{type:'advance'}}:nextBotMove(engine, state, players, random);
      assert.equal(JSON.stringify(state), before, 'choosing a move must not mutate state');
      assert.ok(move, `${engine.id}/${count}/${state.phase}: no move`);
      try { state = engine.applyAction(state, move.playerId, move.action); }
      catch (error) { throw new Error(`${engine.id}/${count}/${step}/${state.phase}: ${JSON.stringify(move)}: ${error.message}`); }
      moves++;
    }
    assert.ok(engine.isOver(state), `${engine.id}/${count} did not finish`);
    assert.equal(nextBotMove(engine, state, players), null);
    console.log(`IA ${engine.id}/${count}: complete match OK`);
  }
}

// Lobby operations are idempotent, respect capacity, and never remove humans.
for (const engine of listGames()) {
  const events = [];
  const session = new LocalHostSession(engine.id, 'Ana', 'Mesa', e => events.push(e));
  session.fillWithBots(); session.fillWithBots();
  assert.equal(session.players().length, engine.maxPlayers);
  assert.equal(new Set(session.players().map(p => p.id)).size, engine.maxPlayers);
  assert.equal(session.players().filter(p => p.isBot).length, engine.maxPlayers - 1);
  session.removePlayer('host'); assert.equal(session.players().length, engine.maxPlayers);
  session.removePlayer('bot-1'); assert.equal(session.players().length, engine.maxPlayers - 1);
  session.fillWithBots(); session.startGame(21);
  assert.throws(() => session.fillWithBots());
  assert.throws(() => session.startGame());
  assert.equal(events.findLast(e => e.kind === 'game').view.players.length,engine.maxPlayers);
  assert.equal(events.findLast(e => e.kind === 'game').view.hands,undefined);
  session.close();
}
assert.equal(fillBotSeats([{id:'host'}], 1).length, 0);

// Simultaneous Mus discards must progress even when the human has not discarded.
const {getGame} = await import('../dist/game-core/index.js');
const mus = getGame('mus'); let state = mus.createInitialState(['host','bot-1','bot-2','bot-3'],12);
while(['dealing','cards-dealt'].includes(state.phase))state=mus.applyAction(state,'host',{type:'advance'});
for (let i = 0; i < 4; i++) state = mus.applyAction(state,state.players[state.musTurn],{type:'mus',wantsMus:true});
assert.equal(state.phase,'discard');
for (let i = 0; i < 3; i++) { const move=nextBotMove(mus,state,['bot-1','bot-2','bot-3']); assert.ok(move); state=mus.applyAction(state,move.playerId,move.action); }
assert.deepEqual(mus.view(state,'host').awaitingDiscardFrom,['host']);
assert.equal(chooseBotAction(mus,mus.view(state,'host'),'bot-1'),null);

// The asynchronous runner advances bots and stops promptly on teardown.
const events=[];const session=new LocalHostSession('mus','Ana','Mesa',e=>events.push(e));
session.fillWithBots();session.startGame(99);session.botRunner.stop();session.botRunner.delay=1;
session.applyLocalAction({type:'advance'});session.applyLocalAction({type:'advance'});session.applyLocalAction({type:'mus',wantsMus:true});
await new Promise(resolve=>setTimeout(resolve,40));
assert.notEqual(session.state.phase,'mus');session.close();
const snapshot=JSON.stringify(session.state);await new Promise(resolve=>setTimeout(resolve,20));assert.equal(JSON.stringify(session.state),snapshot);
let called=0;const runner=new BotRunner(()=>({playerId:'b',action:{type:'pass'}}),()=>called++,()=>{},1);runner.schedule();runner.stop();
await new Promise(resolve=>setTimeout(resolve,10));assert.equal(called,0);
console.log(`IA: ${moves} legal moves, all 21 games, lobby, Mus discards and teardown OK`);

// Póker: la IA juega según su mano. No se tira all-in al azar ni iguala cualquier all-in,
// así que las partidas duran varias manos y gana con claridad a quien lo iguala todo.
{
  const poker = getGame('texas-holdem'); let hands = 0, wins = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const r = createRng(seed), ids = ['station','ia']; let s = poker.createInitialState(ids, seed);
    while (!poker.isOver(s)) {
      let move;
      if (s.players[s.turn] === 'station' && s.phase !== 'result') {
        const o = poker.view(s,'station').options.map(x => x.action);
        move = {playerId:'station', action:o.find(a => a.type === 'check') || o.find(a => a.type === 'call') || o.find(a => a.type === 'all-in')};
      } else move = nextBotMove(poker, s, ids, r);
      s = poker.applyAction(s, move.playerId, move.action);
    }
    hands += s.handNumber; if (s.chips.ia > 0) wins++;
  }
  assert.ok(hands / 12 >= 5, `póker: partidas demasiado cortas (${hands / 12} manos de media)`);
  assert.ok(wins >= 8, `póker: la IA solo gana ${wins}/12 a quien lo iguala todo`);
  console.log(`IA póker: ${(hands / 12).toFixed(1)} manos por partida y ${wins}/12 victorias contra quien lo iguala todo: OK`);
}
