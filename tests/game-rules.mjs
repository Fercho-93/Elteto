import assert from "node:assert/strict";
import { cinquilloEngine, musEngine } from "../dist/game-core/index.js";
import { canPlayCinquillo, renderSeats } from "../dist/table-view.js";
const players = ["a", "b", "c", "d"];
const key = (c) => `${c.suit}:${c.rank}`;
for (let seed = 1; seed <= 100; seed++) {
  let state = cinquilloEngine.createInitialState(players, seed);
  const first = state.players[state.turn];
  assert.throws(() =>
    cinquilloEngine.applyAction(state, first, { type: "pass" }),
  );
  assert.deepEqual(
    state.hands[first].filter((c) => canPlayCinquillo(state.table, c)),
    [{ suit: "oros", rank: "5" }],
  );
  const otherFive = state.hands[first].find(
    (c) => c.rank === "5" && c.suit !== "oros",
  );
  if (otherFive)
    assert.throws(() =>
      cinquilloEngine.applyAction(state, first, {
        type: "play",
        card: otherFive,
      }),
    );
  for (let turn = 0; !state.finished && turn < 3000; turn++) {
    if (state.handWinner) { state = cinquilloEngine.applyAction(state, state.handWinner, {type:"next-hand"}); continue; }
    const id = state.players[state.turn],
      playable = state.hands[id].filter((c) =>
        canPlayCinquillo(state.table, c),
      );
    state = cinquilloEngine.applyAction(
      state,
      id,
      playable.length ? { type: "play", card: playable[0] } : { type: "pass" },
    );
    const count =
      Object.values(state.hands).flat().length +
      Object.values(state.table).reduce((n, e) => n + e.high - e.low + 1, 0);
    assert.equal(count, 40);
    const view = cinquilloEngine.view(state, id);
    assert.equal("hands" in view, false);
  }
  assert.ok(state.finished && state.winner);
}
const checkDeck = (state) => {
  const all = [
    ...Object.values(state.hands).flat(),
    ...state.stock,
    ...state.discarded,
  ];
  assert.equal(all.length, 40);
  assert.equal(new Set(all.map(key)).size, 40);
};
let state = musEngine.createInitialState(players, 17);
assert.equal(state.phase, "mus");
assert.throws(() =>
  musEngine.applyAction(state, "b", { type: "mus", wantsMus: false }),
);
for (let round = 0; round < 12; round++) {
  for (let i = 0; i < 4; i++)
    state = musEngine.applyAction(state, players[state.musTurn], {
      type: "mus",
      wantsMus: true,
    });
  assert.equal(state.phase, "discard");
  assert.throws(() =>
    musEngine.applyAction(state, "a", { type: "discard", cards: [] }),
  );
  const old = state;
  for (const p of players)
    state = musEngine.applyAction(state, p, {
      type: "discard",
      cards: old.hands[p],
    });
  assert.equal(state.phase, "mus");
  checkDeck(state);
  for (const p of players) assert.equal(state.hands[p].length, 4);
}
state = musEngine.applyAction(state, "a", { type: "mus", wantsMus: false });
assert.equal(state.phase, "grande");
assert.throws(() =>
  musEngine.applyAction(state, "a", { type: "bet", amount: 2.5 }),
);
state = musEngine.applyAction(state, "a", { type: "bet", amount: 2 });
state = musEngine.applyAction(state, "b", { type: "bet", amount: 4 });
assert.throws(() =>
  musEngine.applyAction(state, "c", { type: "bet", amount: 4 }),
);
state = musEngine.applyAction(state, "c", { type: "accept" });
assert.deepEqual(state.scores, { A: 0, B: 0 });
assert.equal("revealedHands" in musEngine.view(state, "a"), false);
// Complete hands and games, with only public/legal actions. Deferred scoring and privacy.
for (let seed = 1; seed <= 80; seed++) {
  let s = musEngine.createInitialState(players, seed);
  for (let step = 0; !s.finished && step < 5000; step++) {
    checkDeck(s);
    const v = musEngine.view(s, "a");
    assert.equal("hands" in v, false);
    assert.equal("seed" in v, false);
    if (s.phase === "mus")
      s = musEngine.applyAction(s, players[s.musTurn], {
        type: "mus",
        wantsMus: false,
      });
    else if (s.phase === "showdown") {
      assert.ok(v.revealedHands);
      assert.throws(() =>
        musEngine.applyAction(s, players[(s.mano + 1) % 4], {
          type: "next-hand",
        }),
      );
      s = musEngine.applyAction(s, players[s.mano], { type: "next-hand" });
    } else {
      assert.equal("revealedHands" in v, false);
      const id = players[s.betting.turnSeat];
      s = musEngine.applyAction(
        s,
        id,
        s.betting.pendingBet
          ? { type: step % 3 ? "accept" : "reject" }
          : step % 5
            ? { type: "pass" }
            : { type: "bet", amount: 2 },
      );
    }
  }
  assert.ok(s.finished && s.winnerTeam);
  checkDeck(s);
}
// Juego: 31 beats 32; neither a high punto nor ineligible players may take its turn.
let s = musEngine.createInitialState(players, 8);
s.ruleset = "four-kings";
s.hands = {
  a: [
    { suit: "oros", rank: "10" },
    { suit: "copas", rank: "10" },
    { suit: "espadas", rank: "10" },
    { suit: "bastos", rank: "1" },
  ],
  b: [
    { suit: "oros", rank: "12" },
    { suit: "copas", rank: "11" },
    { suit: "espadas", rank: "7" },
    { suit: "bastos", rank: "2" },
  ],
  c: [
    { suit: "oros", rank: "4" },
    { suit: "copas", rank: "5" },
    { suit: "espadas", rank: "6" },
    { suit: "bastos", rank: "7" },
  ],
  d: [
    { suit: "bastos", rank: "12" },
    { suit: "espadas", rank: "11" },
    { suit: "bastos", rank: "10" },
    { suit: "oros", rank: "2" },
  ],
};
s.phase = "juego";
s.phaseIndex = 3;
s.betting = {
  turnSeat: 0,
  pendingBet: null,
  previousAmount: 1,
  consecutivePasses: 0,
};
s = musEngine.applyAction(s, "a", { type: "bet", amount: 2 });
assert.equal(s.betting.turnSeat, 3);
s = musEngine.applyAction(s, "d", { type: "accept" });
assert.equal(s.phase, "showdown");
assert.deepEqual(s.scores, { A: 5, B: 0 });
// An accepted ordago finishes immediately; raising a pending ordago is prohibited.
s = musEngine.createInitialState(players, 9);
s = musEngine.applyAction(s, "a", { type: "mus", wantsMus: false });
s = musEngine.applyAction(s, "a", { type: "ordago" });
assert.throws(() =>
  musEngine.applyAction(s, "b", { type: "bet", amount: 100 }),
);
s = musEngine.applyAction(s, "b", { type: "accept" });
assert.equal(s.finished, false);
assert.equal(s.phase, "showdown");
assert.equal(s.gamesWon[s.gameWinner],1);
assert.ok(musEngine.view(s, "a").revealedHands);
// Seat rotation keeps partnership opposite and represents every hidden card by its back.
const view = cinquilloEngine.view(
  cinquilloEngine.createInitialState(players, 1),
  "c",
);
const html = renderSeats(view, "c", (id) => id, "cinquillo");
assert.equal((html.match(/class="card-back"/g) || []).length, 30);
assert.equal((html.match(/data-player-id=/g) || []).length, 3);
assert.ok(!html.includes('data-player-id="c"'));
console.log(
  "100 Cinquillo games, 80 Mus matches, repeated discards, conservation, privacy, scoring, turn restrictions and ordago: OK",
);

// Saved states from the previous engine keep the already-scored marker and resume.
let legacy = musEngine.createInitialState(players, 31);
legacy.phase = "discard";
legacy.phaseResults = { grande: "old result" };
legacy.scores = { A: 4, B: 2 };
for (const field of [
  "seed",
  "discarded",
  "discardNumber",
  "musTurn",
  "musVotes",
])
  delete legacy[field];
for (const id of players)
  legacy = musEngine.applyAction(legacy, id, {
    type: "discard",
    cards: [legacy.hands[id][0]],
  });
assert.deepEqual(legacy.scores, { A: 4, B: 2 });
assert.equal(legacy.phase, "mus");
checkDeck(legacy);
console.log("Previous saved Mus state migration: OK");
