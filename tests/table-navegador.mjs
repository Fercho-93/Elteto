// Test-only fixture is served from memory; production app has no testing hooks.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
const { chromium, webkit } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
import { cinquilloEngine, musEngine } from "../dist/game-core/index.js";
import { MASCOTS, mascotForSeat, renderSeats, seatPosition } from "../dist/table-view.js";
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
          : pathname.endsWith(".png") ? "image/png" : pathname.endsWith(".svg") ? "image/svg+xml" : "text/html",
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
const manifest=JSON.parse(await readFile(new URL('../apps/web/assets/decks/manifest.json',import.meta.url),'utf8'));
assert.equal(manifest.length,100);
const {createHash}=await import('node:crypto');
for(const card of manifest) assert.equal(createHash('sha256').update(await readFile(new URL('../dist/assets/decks/'+card.file,import.meta.url))).digest('hex'),card.sha256);
const deckPage=await browser.newPage();await deckPage.goto(base);
assert.ok(await deckPage.evaluate(async files=>{await Promise.all(files.map(async file=>{const img=new Image();img.src='./assets/decks/'+file;await img.decode();if(img.naturalWidth<200)throw Error(file);}));return true;},manifest.map(card=>card.file)));
await deckPage.close();
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
        `No page overflow: ${width}px, ${count} players`,
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
      // Original traditional deck faces decode even on disabled buttons.
      assert.ok(await page.locator(".hand .playing-card").first().isDisabled());
      assert.ok(await page.locator('.hand .playing-card').evaluateAll(async cards => {
        await Promise.all(cards.map(card=>card.querySelector('img').decode()));
        return cards.every(card=>{const image=card.querySelector('img'),rect=image.getBoundingClientRect(); return image.naturalWidth>=200 && rect.width>60 && rect.height>90 && card.getAttribute('aria-label').includes(' de ');});
      }));
      assert.equal(await page.locator('.character-sprite[data-character]').evaluateAll(els => new Set(els.map(el => el.dataset.character)).size),count);
      assert.ok(await page.evaluate(async () => { const image=new Image(); image.src='/assets/elteto-mascots-v1.png'; await image.decode(); return image.naturalWidth===1536 && image.naturalHeight===1024; }));
      assert.equal(await page.locator('.game-table').getAttribute('data-scene'),'illustrated-2d');
      assert.equal(await page.locator('.table-canvas,.camera-controls').count(),0);
      assert.equal(await page.locator('.seat-front').count(),count-1);
      assert.ok(await page.locator('.table-seat:not(.own-seat) .seat-label').evaluateAll(labels=>{
        const boxes=labels.map(label=>label.getBoundingClientRect());
        const clear=boxes.every((a,i)=>a.left>=0 && a.right<=innerWidth && boxes.slice(i+1).every(b=>a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top));
        if(!clear) throw Error(JSON.stringify(boxes.map(box=>box.toJSON())));
        return clear;
      }),`Readable, separate player labels: ${width}px, ${count} players`);
      assert.ok(await page.locator('.seat-front').evaluateAll(fronts=>fronts.every(front=>{
        const body=document.querySelector('[data-player-id="'+front.dataset.frontPlayer+'"]');
        const felt=document.querySelector('.table-surface');
        const a=body.getBoundingClientRect(),b=front.getBoundingClientRect();
        return Math.abs(a.x-b.x)<1 && Math.abs(a.y-b.y)<1 && Math.abs(a.width-b.width)<1 && Math.abs(a.height-b.height)<1 && +getComputedStyle(body).zIndex<+getComputedStyle(felt).zIndex && +getComputedStyle(front).zIndex>+getComputedStyle(felt).zIndex && +getComputedStyle(front.querySelector('.forearms')).zIndex>+getComputedStyle(front.querySelector('.rival-hand')).zIndex;
      })));
      await page.evaluate(() => scrollTo(0, 0));
      if (width === 390 || width === 900 || width === 844)
        await page.screenshot({
          path: `dist/table-cinquillo-${count}-${width}-${process.env.TABLE_BROWSER||'chromium'}.png`,
          fullPage: true,
        });
    }
    // Full Spanish tableau stays on the felt; legacy French faces use their deck.
    {
      const full=cinquilloEngine.createInitialState(['a','b','c','d'],19);
      full.table=Object.fromEntries(['oros','copas','espadas','bastos'].map(suit=>[suit,{low:0,high:9}]));
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      assert.equal(await page.locator('[data-table-key]').count(),40);
      assert.ok(await page.locator('[data-table-key]').evaluateAll(cards=>{
        const surface=document.querySelector('.table-surface'),felt=surface.getBoundingClientRect(),style=getComputedStyle(surface);
        const border=parseFloat(style.borderLeftWidth),radii=style.borderTopLeftRadius.split(' ');
        const radius=(value,size)=>value.includes('%')?parseFloat(value)*size/100:parseFloat(value);
        const rx=radius(radii[0],felt.width)-border,ry=radius(radii[1]||radii[0],felt.height)-border;
        const left=felt.left+border,right=felt.right-border,top=felt.top+border,bottom=felt.bottom-border;
        const inside=(x,y)=>{
          if(x<left||x>right||y<top||y>bottom)return false;
          const dx=Math.max(left+rx-x,x-(right-rx),0),dy=Math.max(top+ry-y,y-(bottom-ry),0);
          return !dx||!dy||(dx/rx)**2+(dy/ry)**2<=1;
        };
        const outside=cards.find(card=>{const r=card.getBoundingClientRect();return ![[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].every(([x,y])=>inside(x,y));});
        if(outside) throw new Error(JSON.stringify({card:outside.dataset.tableKey,rect:outside.getBoundingClientRect().toJSON(),felt:felt.toJSON(),rx,ry,center:document.querySelector('.table-center').getBoundingClientRect().toJSON()}));
        return true;
      }),`Full deck must stay inside rounded felt at width ${width}`);
      await page.locator('.board-card img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.ok(await page.locator('.board-card.placed').evaluateAll(cards=>cards.every(card=>{
        const r=card.getBoundingClientRect();return Math.abs(r.width/r.height-208/319)<.02;
      })), 'Spanish cards retain their printed proportions');
      const normalCard=await page.locator('.board-card.placed').first().boundingBox();
      await page.locator('[data-action="open-table-zoom"]').click();
      assert.ok(await page.locator('.board-zoom').evaluate(dialog=>dialog.open));
      assert.equal(await page.locator('.board-zoom [data-zoom-key]').count(),40);
      const enlarged=await page.locator('.board-zoom .board-card.placed').first().boundingBox();
      assert.ok(enlarged.width>normalCard.width*1.4, 'Magnifier makes actual public cards larger');
      assert.equal(await page.locator('.board-zoom .hand,.board-zoom .rival-hand').count(),0);
      // Incoming public state updates keep the magnifier open and current.
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),{...full,table:{oros:{low:4,high:4}}});
      assert.ok(await page.locator('.board-zoom').evaluate(dialog=>dialog.open));
      assert.equal(await page.locator('.board-zoom [data-zoom-key]').count(),1);
      await page.locator('[data-action="close-table-zoom"]').click();
      assert.equal(await page.locator('.board-zoom').evaluate(dialog=>dialog.open),false);
      await page.locator('[data-action="open-table-zoom"]').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.board-zoom').evaluate(dialog=>dialog.open),false);
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      if(width === 900) await page.screenshot({path:`dist/table-full-spanish-${process.env.TABLE_BROWSER||'chromium'}.png`,fullPage:true});
      full.ruleset='legacy-french-52';
      full.table=Object.fromEntries(['picas','corazones','diamantes','treboles'].map(suit=>[suit,{low:4,high:6}]));
      full.hands.a=[{suit:'picas',rank:'A'},{suit:'corazones',rank:'K'},{suit:'diamantes',rank:'Q'},{suit:'treboles',rank:'J'}];
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      assert.equal(await page.locator('.board-card').count(),52);
      await page.locator('.card-illustration img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.ok(await page.locator('.hand img').evaluateAll(images=>images.every(image=>/spade_1|heart_king|diamond_queen|club_jack/.test(image.src))));
      assert.ok(await page.locator('.board-card.placed').evaluateAll(cards=>cards.every(card=>{
        const r=card.getBoundingClientRect();return Math.abs(r.width/r.height-169.075/244.64)<.02;
      })), 'French cards retain their printed proportions');
      if(width === 900) await page.screenshot({path:`dist/table-french-${process.env.TABLE_BROWSER||'chromium'}.png`,fullPage:true});
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
    assert.ok(await page.locator('.hand .card-illustration img').count()>0);
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
  // Animated grips must move inside their fixed seat frame, never reset its POV translation.
  const motion=await browser.newContext({serviceWorkers:'block',reducedMotion:'no-preference'});
  const motionPage=await motion.newPage();await motionPage.goto(base);await motionPage.waitForFunction(()=>window.testTable);
  const motionGame=cinquilloEngine.createInitialState(['a','b','c','d'],17);
  await motionPage.evaluate(game=>window.testTable('cinquillo',game,game.players[game.turn]),motionGame);
  await motionPage.locator('.legal-card').click();
  assert.ok(await motionPage.locator('.seat-front').evaluateAll(fronts=>fronts.every(front=>front.getAnimations().length===0 && getComputedStyle(front).transform!=='none')));
  assert.ok(await motionPage.locator('.seat-grip').evaluateAll(grips=>grips.some(grip=>grip.getAnimations().length>0)));
  await motion.close();
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
      const response=await fetch('../../table-layout.css');
      return response.ok && (await response.text()).includes('.board-zoom');
    }));
    assert.ok(await page.evaluate(async()=>{
      const response=await fetch('../../assets/elteto-mascots-v1.png');
      return response.ok && (await response.blob()).size>10000;
    }));
    assert.ok(await page.evaluate(async()=>{ for(const file of ['Roros.png','heart_queen.png','credits.html','FRENCH-LICENSE.txt','french-source.svg']){const response=await fetch('../../assets/decks/'+file);if(!response.ok) return false;}return true;}));
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
  assert.equal(await fallbackPage.locator('.game-table').getAttribute('data-scene'),'illustrated-2d');
  assert.ok(await fallbackPage.locator('.legal-card').isVisible());
  assert.equal(await fallbackPage.locator('.empty-slot').first().evaluate(el=>getComputedStyle(el).visibility),'hidden');
  await fallbackPage.locator('.legal-card').click();
  assert.equal(await fallbackPage.locator('[data-table-key]').count(),1);
  await fallback.close();
  assert.deepEqual(errors, []);
  console.log(
    "2D table: body behind felt, arms above rim and held backs, traditional Spanish/French decks, Mus/Cinquillo actions, portrait/landscape, offline, reduced motion and playable without WebGL: OK",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
