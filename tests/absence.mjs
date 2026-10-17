import assert from 'node:assert/strict';
import {listGames, getGamePlan, nextBotMove, absentMove, pendingActors, skipTurnState, departGame, createRng} from '../dist/game-core/index.js';

// Every game: when someone is absent or expelled the table keeps going — nobody waits for them.
const random = createRng(911);
const ADVANCE = ['dealing','cards-dealt','redeal','showing','counting'];
let checked = 0;
for (const engine of listGames()) {
  for (const count of getGamePlan(engine.id).players.filter(n => n <= engine.maxPlayers && n >= Math.max(3, engine.minPlayers))) {
    const players = Array.from({length:count}, (_,i) => `p${i}`);
    let state = engine.createInitialState(players, 31 + count);
    const step = (ids) => {
      if (engine.id === 'mus' && state.version === 2 && ADVANCE.includes(state.phase)) return {playerId: players[0], action: {type: 'advance'}};
      return nextBotMove(engine, state, ids, random);
    };
    // A few ordinary moves first, so the absence happens mid-game.
    for (let i = 0; i < 25 && !engine.isOver(state); i++) { const m = step(players); if (!m) break; state = engine.applyAction(state, m.playerId, m.action); }
    if (engine.isOver(state)) continue;
    // The host can skip whoever has to act.
    const actors = pendingActors(engine, state);
    if (actors.length) {
      const before = JSON.stringify(state);
      const next = skipTurnState(engine, state, actors[0], random);
      assert.equal(JSON.stringify(state), before, `${engine.id}/${count}: skipping must not mutate the state`);
      assert.notEqual(JSON.stringify(next), before, `${engine.id}/${count}: skipping changes the table`);
      state = next;
    }
    // Expel one person: the table still reaches its end with the autopilot covering that seat.
    const out = players.at(-1), rest = players.filter(p => p !== out);
    state = departGame(engine.id, state, out, 'Fuera', true);
    assert.ok(state.departed[out] && state.expelled[out]);
    assert.equal(departGame(engine.id, state, out, 'Fuera', true), state, 'expelling twice changes nothing');
    for (let i = 0; i < 20000 && !engine.isOver(state); i++) {
      const m = (engine.id === 'mus' && state.version === 2 && ADVANCE.includes(state.phase)) ? {playerId: players[0], action: {type: 'advance'}} : nextBotMove(engine, state, rest, random) || absentMove(engine, state, [out], random);
      assert.ok(m, `${engine.id}/${count}/${state.phase}: the table is stuck after an expulsion`);
      state = engine.applyAction(state, m.playerId, engine.id === 'mus' ? {...m.action, at: Date.now()} : m.action);
    }
    assert.ok(engine.isOver(state), `${engine.id}/${count} did not finish after an expulsion`);
    checked++;
  }
}
console.log(`Ausencias: turno saltado y expulsión en ${checked} mesas de todos los juegos, sin mesas bloqueadas: OK`);
