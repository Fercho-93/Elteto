// Test-only fixture is served from memory; production app has no testing hooks.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { cinquilloEngine, musEngine } from "../dist/game-core/index.js";
const fixture = `
let testGame;
window.testTable = (gameId, game, id) => {
 testGame=game;
 Object.assign(state,{gameId,playerId:id,role:'host',online:null,screen:'game',selected:new Set(),error:'',players:game.players.map((id,i)=>({id,name:['Ana','Bea','Cris','Dani','Eva','Fer'][i]})),view:getGame(gameId).view(game,id)});
 state.host={applyLocalAction(action){testGame=getGame(state.gameId).applyAction(testGame,state.playerId,action);state.view=getGame(state.gameId).view(testGame,state.playerId);renderGame();}};
 renderGame();
};
window.tableSnapshot = () => testGame;
`;
const server = createServer(async (req, res) => {
  try {
    const file = new URL(req.url, "http://localhost").pathname;
    const pathname = file === "/" ? "/index.html" : file;
    let contents = await readFile(
      new URL("../dist" + pathname, import.meta.url),
    );
    if (pathname === "/app.js")
      contents = Buffer.from(contents.toString() + fixture);
    res.setHeader(
      "content-type",
      pathname.endsWith(".js")
        ? "text/javascript"
        : pathname.endsWith(".css")
          ? "text/css"
          : pathname.endsWith(".png") ? "image/png" : "text/html",
    );
    res.end(contents);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await (process.env.TABLE_BROWSER === "webkit" ? webkit : chromium).launch();
const errors = [];
try {
  for (const width of [320, 390, 900]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      serviceWorkers: "block",
    });
    await context.route("**/*", (r) =>
      new URL(r.request().url()).origin === new URL(base).origin
        ? r.continue()
        : r.abort(),
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.waitForFunction(() => window.testTable);
    for (const count of [2, 4, 6]) {
      const ids = Array.from({ length: count }, (_, i) => "player-" + i),
        game = cinquilloEngine.createInitialState(ids, 17);
      const id = game.players[game.turn];
      await page.evaluate(
        ({ game, id }) => window.testTable("cinquillo", game, id),
        { game, id },
      );
      assert.equal(await page.locator(".table-seat").count(), count);
      assert.equal(
        await page.locator(".rival-hand .card-back").count(),
        52 - game.hands[id].length,
      );
      assert.equal(
        await page.locator(".hand .playing-card:not([disabled])").count(),
        1,
      );
      assert.ok(
        await page.locator('[data-action="cinquillo-pass"]').isDisabled(),
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.locator(".hand .playing-card:not([disabled])").click();
      await page.locator('[data-table-key="corazones:5"]').waitFor();
      assert.equal(await page.locator("[data-table-key]").count(), 1);
      assert.equal(
        await page.locator(".hand .playing-card").count(),
        game.hands[id].length - 1,
      );
      await page
        .locator("[data-table-key]")
        .evaluateAll((els) =>
          Promise.all(
            els.flatMap((el) => el.getAnimations().map((a) => a.finished)),
          ),
        );
      // Every disabled card retains a visible rank and suit inside its face.
      assert.ok(await page.locator(".hand .playing-card").first().isDisabled());
      assert.ok(await page.locator(".hand .playing-card").evaluateAll(cards => cards.every(card => {
        const face=card.querySelector('.card-face').getBoundingClientRect();
        const badge=card.querySelector('.hand-index').getBoundingClientRect();
        const rank=card.querySelector('.hand-index b');
        return face.width > 60 && face.height > 90 && badge.width > 8 && badge.height > 25 && badge.x >= face.x && badge.y >= face.y && badge.bottom <= face.bottom && rank.textContent.trim() && getComputedStyle(rank).webkitTextFillColor !== 'rgba(0, 0, 0, 0)';
      })));
      assert.equal(await page.locator('.character-sprite').evaluateAll(els => new Set(els.map(el => el.dataset.character)).size),count);
      assert.ok(await page.evaluate(async () => { const image=new Image(); image.src='/assets/table-players-v1.png'; await image.decode(); return image.naturalWidth===1536 && image.naturalHeight===1024; }));
      await page.evaluate(() => scrollTo(0, 0));
      if (width === 390)
        await page.screenshot({
          path: `dist/table-cinquillo-${count}.png`,
          fullPage: true,
        });
    }
    const ids = ["a", "b", "c", "d"];
    let game = musEngine.createInitialState(ids, 7);
    await page.evaluate((game) => window.testTable("mus", game, "a"), game);
    await page.locator('[data-action="mus-yes"]').click();
    game = await page.evaluate(() => window.tableSnapshot());
    for (const id of ["b", "c", "d"])
      game = musEngine.applyAction(game, id, { type: "mus", wantsMus: true });
    await page.evaluate((game) => window.testTable("mus", game, "a"), game);
    assert.ok(await page.locator('[data-action="mus-discard"]').isDisabled());
    await page.locator(".hand .playing-card").first().click();
    assert.equal(await page.locator(".hand .selected").count(), 1);
    assert.ok(await page.locator('[data-action="mus-discard"]').isEnabled());
    await page.locator('[data-action="mus-discard"]').click();
    assert.equal(await page.locator(".hand .selected").count(), 0);
    game = musEngine.createInitialState(ids, 7);
    game = musEngine.applyAction(game, "a", { type: "mus", wantsMus: false });
    await page.evaluate((game) => window.testTable("mus", game, "a"), game);
    assert.ok(await page.locator('[data-action="mus-bet"]').isVisible());
    await page.locator('[data-action="mus-bet"]').click();
    game = await page.evaluate(() => window.tableSnapshot());
    await page.evaluate((game) => window.testTable("mus", game, "b"), game);
    assert.equal(await page.locator("#bet-amount").inputValue(), "4");
    await page.locator('[data-action="mus-ordago"]').click();
    game = await page.evaluate(() => window.tableSnapshot());
    await page.evaluate(
      (game) =>
        window.testTable("mus", game, game.players[game.betting.turnSeat]),
      game,
    );
    assert.equal(await page.locator('[data-action="mus-bet"]').count(), 0);
    await page.locator('[data-action="mus-accept"]').click();
    assert.equal(
      await page.locator(".revealed-hands .reveal-card").count(),
      16,
    );
    await page.evaluate(() => scrollTo(0, 0));
    if (width === 390)
      await page.screenshot({ path: "dist/table-mus.png", fullPage: true });
    // Reduced motion prevents both CSS avatar animation and card flight.
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".character-sprite")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    "Tables at 320, 390 and 900px: 2/4/6 seats, hidden hands, legal moves, Mus discard/envite/ordago, reveal, no overflow, reduced motion: OK",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
