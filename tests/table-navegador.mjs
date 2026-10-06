// Test-only fixture is served from memory; production app has no testing hooks.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { cinquilloEngine, musEngine } from "../dist/game-core/index.js";
import { MASCOTS, mascotForSeat, renderSeats, seatPosition } from "../dist/table-view.js";
import { publicCardLayout } from '../dist/table-3d.js';
const fullTable={ruleset:'spanish-40',table:Object.fromEntries(['oros','copas','espadas','bastos'].map(s=>[s,{low:0,high:9}]))};
const layout=publicCardLayout(fullTable);
assert.equal(layout.length,40);
for(const card of layout) {
  assert.ok(card.y-.006>=1.35,'card thickness cannot intersect the felt');
  assert.ok(((Math.abs(card.x)+.32)/4.82)**2+((Math.abs(card.z)+.46)/3.02)**2<1,'whole card must fit inside the felt');
}
const legacy=publicCardLayout({ruleset:'legacy-french-52',table:Object.fromEntries(['picas','corazones','diamantes','treboles'].map(s=>[s,{low:0,high:12}]))});
assert.equal(legacy.length,52);
assert.ok(legacy.every(c=>((Math.abs(c.x)+.32*c.scale)/4.82)**2+((Math.abs(c.z)+.46*c.scale)/3.02)**2<1));
assert.equal(publicCardLayout({table:{}}).length,0,'no empty slot objects on the table');
assert.equal(MASCOTS.length, 10);
const roster = Array.from({length:10},(_,i)=>`mascot-${i}`);
assert.equal(new Set(roster.map((_,i)=>mascotForSeat(roster,i))).size,10);
for (const count of [2,3,4,5,6,7,8]) {
  const points=Array.from({length:count},(_,i)=>seatPosition(count,i));
  assert.equal(new Set(points.map(point=>point.join(','))).size,count);
  assert.ok(points.every(([x,y])=>x>0 && x<100 && y>0 && y<100));
}
// Same public identities from every POV; future board views have empty hands.
const boardView={players:roster.slice(0,8),turnPlayer:roster[0]};
for (const id of boardView.players) {
  const html=renderSeats(boardView,id,p=>p,'oca');
  assert.equal((html.match(/data-character=/g)||[]).length,8);
  assert.ok(!html.includes('rival-hand'));
  assert.ok(html.includes(`data-character="${mascotForSeat(boardView.players,0)}"`));
}
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
const browser = await (process.env.TABLE_BROWSER === "webkit" ? webkit : chromium).launch(process.env.TABLE_BROWSER === 'webkit'?{}:{args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const errors = [];
try {
  for (const width of [320, 390, 900, 844]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 844 ? 390 : 844 },
      serviceWorkers: "block",
      reducedMotion: 'reduce',
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
      assert.equal(await page.locator('.suit-lane .board-card').count(),40);
      assert.match(await page.locator('.game-ribbon').textContent(),/40 cartas españolas/);
      assert.equal(
        await page.locator(".rival-hand .card-back").count(),
        40 - game.hands[id].length,
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
      await page.locator('[data-table-key="oros:5"]').waitFor({state:'attached'});
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
        const art=card.querySelector('.card-illustration svg').getBoundingClientRect();
        const ranks=card.querySelectorAll('.card-illustration text');
        return face.width > 60 && face.height > 90 && art.width > 60 && art.height > 90 && ranks.length===2 && [...ranks].every(rank=>rank.textContent.trim());
      })));
      assert.equal(await page.locator('.character-sprite').evaluateAll(els => new Set(els.map(el => el.dataset.character)).size),count);
      assert.ok(await page.evaluate(async () => { const image=new Image(); image.src='/assets/elteto-mascots-v1.png'; await image.decode(); return image.naturalWidth===1536 && image.naturalHeight===1024; }));
      if(process.env.TABLE_BROWSER !== 'webkit') {
        assert.equal(await page.locator('.game-table').getAttribute('data-scene'),'webgl');
        assert.equal(await page.locator('.game-table').getAttribute('data-public-cards'),'1');
        assert.equal(Number(await page.locator('.game-table').getAttribute('data-rival-cards')),40-game.hands[id].length);
        await page.locator('[data-action="camera-right"]').click();
        assert.ok(Number(await page.locator('.game-table').getAttribute('data-camera'))>0);
        await page.locator('[data-action="camera-reset"]').click();
        assert.equal(await page.locator('.game-table').getAttribute('data-camera'),'0');
      }
      await page.evaluate(() => scrollTo(0, 0));
      if (width === 390 || width === 900 || width === 844)
        await page.screenshot({
          path: `dist/table-cinquillo-${count}-${width}-${process.env.TABLE_BROWSER||'chromium'}.png`,
          fullPage: true,
        });
    }
    // A completed hand exposes the cumulative score and winner-only continuation.
    let closing = cinquilloEngine.createInitialState(['a','b','c','d'],19);
    closing.hands={a:[{suit:'oros',rank:'6'}],b:[{suit:'copas',rank:'1'}],c:[{suit:'bastos',rank:'12'}],d:[{suit:'espadas',rank:'2'}]};
    closing.table={oros:{low:4,high:4}};closing.turn=0;
    await page.evaluate(game=>window.testTable('cinquillo',game,'a'),closing);
    await page.locator('.legal-card').click();
    assert.ok(await page.locator('[data-action="cinquillo-next-hand"]').isVisible());
    assert.match(await page.locator('.game-controls').textContent(),/Ana: 8/);
    await page.locator('[data-action="cinquillo-next-hand"]').click();
    assert.equal((await page.evaluate(()=>window.tableSnapshot())).handNumber,2);
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
    assert.ok(await page.locator('.hand .card-illustration svg').count()>0);
    await page.evaluate(() => scrollTo(0, 0));
    if (width === 390)
      await page.screenshot({ path: `dist/table-mus-${process.env.TABLE_BROWSER||'chromium'}.png`, fullPage: true });
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
  // Real service worker: all references remain readable after network loss.
  if(process.env.TABLE_BROWSER !== 'webkit') {
    const offlineContext=await browser.newContext();
    const page=await offlineContext.newPage();
    await page.goto(base);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    assert.equal(await page.locator('details ul li').count(),18);
    await offlineContext.setOffline(true);
    await page.goto(base+'reglas_juegos/biblioteca.html');
    assert.equal(await page.locator('li a').count(),20);
    await page.goto(base+'reglas_juegos/lectura/cinquillo.html');
    assert.match(await page.locator('pre').textContent(),/cinco de oros/);
    const cached = await page.evaluate(async()=>{
      const response=await fetch('../mus.html');
      return response.ok && (await response.text()).includes('8 reyes');
    });
    assert.ok(cached);
    assert.ok(await page.evaluate(async()=>{
      const response=await fetch('../../assets/elteto-mascots-v1.png');
      return response.ok && (await response.blob()).size>10000;
    }));
    await offlineContext.close();
  }
  // Explicit no-GPU route: real hand remains playable, no empty cells visible.
  const fallback=await browser.newContext({serviceWorkers:'block'});
  await fallback.addInitScript(()=>{
    const original=HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext=function(type,...args){return type.startsWith('webgl')?null:original.call(this,type,...args);};
  });
  const fallbackPage=await fallback.newPage();await fallbackPage.goto(base);await fallbackPage.waitForFunction(()=>window.testTable);
  const fallbackGame=cinquilloEngine.createInitialState(['a','b'],3);
  await fallbackPage.evaluate(game=>window.testTable('cinquillo',game,game.players[game.turn]),fallbackGame);
  assert.equal(await fallbackPage.locator('.game-table').getAttribute('data-scene'),'fallback');
  assert.ok(await fallbackPage.locator('.legal-card').isVisible());
  assert.equal(await fallbackPage.locator('.empty-slot').first().evaluate(el=>getComputedStyle(el).visibility),'hidden');
  await fallbackPage.locator('.legal-card').click();
  assert.equal(await fallbackPage.locator('[data-table-key]').count(),1);
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log(
    "3D table: WebGL camera, cards supported on felt, hidden rival faces, complete vector deck, Mus/Cinquillo actions, portrait/landscape, offline, reduced motion and playable no-GPU fallback: OK",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
