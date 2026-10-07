// Test-only fixture is served from memory; production app has no testing hooks.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
await mkdir('tests/artifacts',{recursive:true});
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
  assert.equal((html.match(/data-character=/g)||[]).length,7);
  assert.ok(!html.includes('rival-hand'));
  assert.equal(html.includes(`data-character="${mascotForSeat(boardView.players,0)}"`),id!==boardView.players[0]);
}
const fixture = `
let testGame;
window.testTable = (gameId, game, id, names) => {
 testGame=game;
 Object.assign(state,{gameId,playerId:id,role:'host',online:null,screen:'game',selected:new Set(),error:'',players:game.players.map((id,i)=>({id,name:names?.[i]||['Ana','Bea','Cris','Dani','Eva','Fer'][i]})),view:getGame(gameId).view(game,id)});
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
  for (const [width,height] of [[320,568], [390,844], [390,664], [699,844], [700,844], [900,844], [844,390]]) {
    const context = await browser.newContext({
      viewport: { width, height },
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
      assert.equal(await page.locator(".table-seat").count(), count-1);
      assert.equal(await page.locator('.own-seat').count(),0);
      assert.equal(await page.locator(`[data-player-id="${id}"]`).count(),0);
      assert.equal(await page.locator('.suit-lane .board-card').count(),40);
      assert.match(await page.locator('.game-ribbon').textContent(),/40 cartas españolas/);
      assert.equal(
        await page.locator(".rival-count").evaluateAll(els=>els.reduce((sum,el)=>sum+Number(el.dataset.count),0)),
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
      assert.ok(await page.locator('.hand').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),'Hand stays visible without page scrolling');
      assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'Whole screen fits the available viewport');
      await page.locator('[data-action="hand-filter"][data-suit="oros"]').click();
      assert.deepEqual(await page.evaluate(()=>window.tableSnapshot()),game,'Filtering never sends a game action');
      assert.ok(await page.locator('.hand .playing-card:visible').evaluateAll(cards=>cards.every(card=>card.dataset.cardKey.startsWith('oros:'))));
      assert.equal(await page.locator('[data-action="hand-filter"][data-suit="oros"]').getAttribute('aria-pressed'),'true');
      await page.locator(".hand .playing-card:not([disabled]):visible").click();
      await page.locator('[data-table-key="oros:5"]').waitFor({state:'attached'});
      assert.equal(await page.locator("[data-table-key]").count(), 1);
      assert.equal(await page.locator('.game-table .endpoint:visible').count(),1,'An opening five is shown once');
      assert.equal(await page.locator('.game-table [data-suit="oros"] .lane-next').getAttribute('aria-label'),'Puedes continuar con 4 o 6');
      await page.locator('[data-action="hand-filter"][data-suit="all"]').click();
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
        return cards.every(card=>{const image=card.querySelector('img'),rect=image.getBoundingClientRect(); return image.naturalWidth>=200 && rect.width>=56 && rect.height>=85 && card.getAttribute('aria-label').includes(' de ');});
      }));
      assert.equal(await page.locator('.rival-original[data-character]').evaluateAll(els => new Set(els.map(el => el.dataset.character)).size),count-1);
      assert.ok(await page.locator('.rival-original image').evaluateAll(images=>images.every(i=>i.getAttribute('href').includes('elteto-original-avatars.png'))),'Only original user artwork is shown');
      assert.ok(await page.evaluate(async()=>{const image=new Image();image.src='/assets/elteto-original-avatars.png';await image.decode();return image.naturalWidth===1280&&image.naturalHeight===853;}));
      assert.equal(await page.locator('.game-table').getAttribute('data-scene'),'illustrated-2d');
      assert.equal(await page.locator('.table-canvas,.camera-controls').count(),0);
      assert.equal(await page.locator('.seat-front,.rival-hand,.forearms').count(),0);
      assert.equal(await page.locator('.game-table .rival-name').count(),count-1);
      assert.ok(await page.locator('.game-table .rival-name').evaluateAll(labels=>{
        const boxes=labels.map(label=>label.getBoundingClientRect());
        const clear=boxes.every((a,i)=>a.left>=0 && a.right<=innerWidth && boxes.slice(i+1).every(b=>a.right<=b.left || b.right<=a.left || a.bottom<=b.top || b.bottom<=a.top));
        if(!clear) throw Error(JSON.stringify(boxes.map(box=>box.toJSON())));
        return clear;
      }),`Readable, separate player labels: ${width}px, ${count} players`);
      assert.equal(await page.locator('.rival-roster').count(),1,'Rivals are grouped outside the playing area');
      await page.evaluate(() => scrollTo(0, 0));
      assert.ok(await page.locator('.table-seat').evaluateAll(seats=>seats.every(seat=>{
        const r=seat.querySelector('.rival-original').getBoundingClientRect(),character=Number(seat.querySelector('[data-character]').dataset.character);
        const x=r.left+r.width*.5;
        const y=r.top+r.height*.52;
        const hit=document.elementFromPoint(x,y);
        if(hit?.closest('[data-player-id]')!==seat) throw Error(JSON.stringify({character,direction:seat.dataset.direction,x,y,hit:hit?.className,box:r.toJSON()}));
        return true;
      })), `Rival faces stay visible above the table: ${width} × ${height}, ${count} players`);
      if (width === 390 || width === 900 || width === 844)
        await page.screenshot({
          path: `tests/artifacts/table-cinquillo-${count}-${width}-${process.env.TABLE_BROWSER||'chromium'}.png`,
          fullPage: true,
        });
    }
    // Full Spanish tableau stays on the felt; legacy French faces use their deck.
    {
      const full=cinquilloEngine.createInitialState(['a','b','c','d'],19);
      full.table=Object.fromEntries(['oros','copas','espadas','bastos'].map(suit=>[suit,{low:0,high:9}]));
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      assert.equal(await page.locator('[data-table-key]').count(),40);
      assert.equal(await page.locator('.game-table .endpoint:visible').count(),8);
      assert.ok(await page.locator('.game-table .lane-next').evaluateAll(labels=>labels.every(label=>label.getAttribute('aria-label')==='Palo completo')));
      assert.ok(await page.locator('[data-table-key]:visible').evaluateAll(cards=>{
        const surface=document.querySelector('.table-surface'),felt=surface.getBoundingClientRect(),style=getComputedStyle(surface);
        const border=parseFloat(style.borderLeftWidth);
        const radius=(value,size)=>value.includes('%')?parseFloat(value)*size/100:parseFloat(value);
        const left=felt.left+border,right=felt.right-border,top=felt.top+border,bottom=felt.bottom-border;
        const corners=['TopLeft','TopRight','BottomLeft','BottomRight'].map((name,index)=>{
          const values=style['border'+name+'Radius'].split(' ');
          const rx=radius(values[0],felt.width)-border,ry=radius(values[1]||values[0],felt.height)-border;
          return {rx,ry,cx:index%2?right-rx:left+rx,cy:index>1?bottom-ry:top+ry,sx:index%2?1:-1,sy:index>1?1:-1};
        });
        const inside=(x,y)=>{
          if(x<left||x>right||y<top||y>bottom)return false;
          return corners.every(({rx,ry,cx,cy,sx,sy})=>{const dx=(x-cx)*sx,dy=(y-cy)*sy;return dx<=0||dy<=0||(dx/rx)**2+(dy/ry)**2<=1;});
        };
        const outside=cards.find(card=>{const r=card.getBoundingClientRect();return ![[r.left,r.top],[r.right,r.top],[r.left,r.bottom],[r.right,r.bottom]].every(([x,y])=>inside(x,y));});
        if(outside) throw new Error(JSON.stringify({card:outside.dataset.tableKey,rect:outside.getBoundingClientRect().toJSON(),felt:felt.toJSON(),center:document.querySelector('.table-center').getBoundingClientRect().toJSON()}));
        return true;
      }),`Full deck must stay inside rounded felt at width ${width}`);
      await page.locator('.board-card img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.ok(await page.locator('.board-card.placed:visible').evaluateAll(cards=>cards.every(card=>{
        const r=card.getBoundingClientRect();return Math.abs(r.width/r.height-208/319)<.02;
      })), 'Spanish cards retain their printed proportions');
      assert.ok(await page.locator('.game-table .endpoint').evaluateAll(cards=>{
        const rects=cards.map(card=>card.getBoundingClientRect());
        return cards.every((card,i)=>{
          const r=rects[i];
          return r.width>=54 && ['none','normal'].includes(getComputedStyle(card,'::after').content) && rects.slice(i+1).every(b=>r.right<=b.left || b.right<=r.left || r.bottom<=b.top || b.bottom<=r.top);
        });
      }), 'Both extremes show full, non-overlapping original faces without overprinted numbers');
      const fullHeight=await page.locator('.game-table').evaluate(el=>el.getBoundingClientRect().height);
      const normalCard=await page.locator('.board-card.placed').first().boundingBox();
      await page.locator('[data-action="open-table-zoom"]').click();
      assert.ok(await page.locator('.board-zoom').evaluate(dialog=>dialog.open));
      assert.equal(await page.locator('.board-zoom [data-zoom-key]').count(),40);
      assert.ok(await page.locator('.board-zoom [data-zoom-key]').evaluateAll(cards=>{
        const rects=cards.map(card=>card.getBoundingClientRect());
        return rects.every((r,i)=>r.width>=90 && rects.slice(i+1).every(b=>r.right<=b.left || b.right<=r.left || r.bottom<=b.top || b.bottom<=r.top));
      }), 'Detail view includes every public card at readable size without overlap');
      assert.ok(await page.locator('.zoom-scroll').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Detail view wraps without horizontal scrolling');
      const enlarged=await page.locator('.board-zoom .board-card.placed').first().boundingBox();
      assert.ok(enlarged.width>normalCard.width, 'Full-card view presents larger, unoverlapped public cards');
      assert.equal(await page.locator('.board-zoom .hand,.board-zoom .rival-hand').count(),0);
      await page.locator('.zoom-scroll').evaluate(el=>{el.scrollTop=200;});
      const readingPosition=await page.locator('.zoom-scroll').evaluate(el=>el.scrollTop);
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      assert.equal(await page.locator('.zoom-scroll').evaluate(el=>el.scrollTop),readingPosition,'Public updates retain the reading position');
      // Incoming public state updates keep the magnifier open and current.
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),{...full,table:{oros:{low:4,high:4}}});
      assert.ok(await page.locator('.board-zoom').evaluate(dialog=>dialog.open));
      assert.equal(await page.locator('.board-zoom [data-zoom-key]').count(),1);
      assert.equal(await page.locator('.game-table').evaluate(el=>el.getBoundingClientRect().height),fullHeight,'Table size stays stable from one card to a full deck');
      await page.locator('[data-action="close-table-zoom"]').click();
      assert.equal(await page.locator('.board-zoom').evaluate(dialog=>dialog.open),false);
      await page.locator('[data-action="open-table-zoom"]').click();
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.board-zoom').evaluate(dialog=>dialog.open),false);
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),{...full,table:{oros:{low:4,high:6}}});
      assert.deepEqual(await page.locator('.game-table .endpoint:visible').evaluateAll(cards=>cards.map(card=>card.dataset.tableKey)),['oros:5','oros:7']);
      assert.equal(await page.locator('.game-table [data-suit="oros"] .lane-next').getAttribute('aria-label'),'Puedes continuar con 4 o 10','Spanish seven continues with the sota, not eight');
      assert.equal(await page.locator('.game-table [data-suit="oros"] b small').textContent(),'· 3 cartas');
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      if(width === 900) await page.screenshot({path:`tests/artifacts/table-full-spanish-${process.env.TABLE_BROWSER||'chromium'}.png`,fullPage:true});
      full.ruleset='legacy-french-52';
      full.table=Object.fromEntries(['picas','corazones','diamantes','treboles'].map(suit=>[suit,{low:4,high:6}]));
      full.hands.a=[{suit:'picas',rank:'A'},{suit:'corazones',rank:'K'},{suit:'diamantes',rank:'Q'},{suit:'treboles',rank:'J'}];
      await page.evaluate(game=>window.testTable('cinquillo',game,'a'),full);
      assert.equal(await page.locator('.board-card').count(),52);
      await page.locator('.card-illustration img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.ok(await page.locator('.hand img').evaluateAll(images=>images.every(image=>/spade_1|heart_king|diamond_queen|club_jack/.test(image.src))));
      assert.ok(await page.locator('.board-card.placed:visible').evaluateAll(cards=>cards.every(card=>{
        const r=card.getBoundingClientRect();return Math.abs(r.width/r.height-169.075/244.64)<.02;
      })), 'French cards retain their printed proportions');
      if(width === 900) await page.screenshot({path:`tests/artifacts/table-french-${process.env.TABLE_BROWSER||'chromium'}.png`,fullPage:true});
    }
    // Filters, keyboard focus and reading position survive live updates and rotation.
    const browsing=cinquilloEngine.createInitialState(['a','b'],17);
    await page.evaluate(game=>window.testTable('cinquillo',game,'a'),browsing);
    await page.locator('[data-action="hand-filter"][data-suit="copas"]').click();
    await page.evaluate(game=>window.testTable('cinquillo',game,'a'),browsing);
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.suit),'copas');
    assert.equal(await page.locator('.hand-filters [aria-pressed="true"]').getAttribute('data-suit'),'copas');
    if(width===390 && height===844) {
      await page.setViewportSize({width:844,height:390});
      await page.waitForFunction(()=>document.querySelector('.hand').getBoundingClientRect().bottom<=innerHeight+1);
      assert.ok(await page.locator('.hand').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1));
      await page.setViewportSize({width:390,height:664});
      await page.waitForFunction(()=>document.querySelector('.hand').getBoundingClientRect().bottom<=innerHeight+1);
      assert.ok(await page.locator('.hand').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight+1));
      await page.setViewportSize({width,height});
      assert.deepEqual(await page.evaluate(()=>window.tableSnapshot()),browsing,'Rotation and filtering do not change the game');
    }
    await page.locator('.game-menu-button').click();
    await page.locator('.game-rules summary').click();
    await page.locator('.history summary').click();
    await page.locator('.game-menu-content').evaluate(el=>el.scrollTop=120);
    const menuPosition=await page.locator('.game-menu-content').evaluate(el=>el.scrollTop);
    await page.evaluate(game=>window.testTable('cinquillo',game,'a'),browsing);
    assert.ok(await page.locator('.game-menu').evaluate(el=>el.open));
    assert.ok(await page.locator('.game-rules').evaluate(el=>el.open));
    assert.ok(await page.locator('.history').evaluate(el=>el.open));
    assert.equal(await page.locator('.game-menu-content').evaluate(el=>el.scrollTop),menuPosition);
    await page.keyboard.press('Escape');
    await page.waitForFunction(()=>document.activeElement.className==='game-menu-button');
    assert.equal(await page.evaluate(()=>document.activeElement.className),'game-menu-button');
    // A completed hand exposes the cumulative score and winner-only continuation.
    let closing = cinquilloEngine.createInitialState(['a','b','c','d'],19);
    closing.hands={a:[{suit:'oros',rank:'6'}],b:[{suit:'copas',rank:'1'}],c:[{suit:'bastos',rank:'12'}],d:[{suit:'espadas',rank:'2'}]};
    closing.table={oros:{low:4,high:4}};closing.turn=0;
    await page.evaluate(game=>window.testTable('cinquillo',game,'a'),closing);
    await page.locator('.legal-card').click();
    assert.ok(await page.locator('.hand-result').evaluate(el=>el.open));
    assert.equal(await page.locator('.result-scores tbody tr').first().textContent(),'Ana · tú+88');
    await page.locator('[data-action="close-hand-result"]').click();
    assert.ok(await page.locator('.turn-action [data-action="cinquillo-next-hand"]').isVisible());
    await page.locator('.game-menu-button').click();
    assert.equal(await page.locator('.scoreboard li').first().textContent(),'Ana · tú8');
    await page.locator('[data-action="close-game-menu"]').click();
    await page.locator('.turn-action [data-action="cinquillo-next-hand"]').click();
    assert.equal((await page.evaluate(()=>window.tableSnapshot())).handNumber,2);
    assert.equal(await page.locator('.hand-filters [aria-pressed="true"]').getAttribute('data-suit'),'all');
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
    assert.ok(await page.locator('.game-table .reveal-card,.game-table .mus-phase').evaluateAll(elements=>{
      const felt=document.querySelector('.table-surface').getBoundingClientRect();
      const border=parseFloat(getComputedStyle(document.querySelector('.table-surface')).borderLeftWidth);
      const outside=elements.filter(el=>{const r=el.getBoundingClientRect();return r.left<felt.left+border || r.right>felt.right-border || r.top<felt.top+border || r.bottom>felt.bottom-border;});
      if(outside.length) throw Error(JSON.stringify({felt:felt.toJSON(),outside:outside.map(el=>({class:el.className,rect:el.getBoundingClientRect().toJSON()}))}));
      return true;
    }),`Mus recuento remains on the felt at ${width} × ${height}`);
    await page.evaluate(() => scrollTo(0, 0));
    if (width === 390)
      await page.screenshot({ path: `tests/artifacts/table-mus-${process.env.TABLE_BROWSER||'chromium'}.png`, fullPage: true });
    // Reduced motion prevents both CSS avatar animation and card flight.
    await page.emulateMedia({ reducedMotion: "reduce" });
    assert.equal(
      await page
        .locator(".rival-roster")
        .first()
        .evaluate((el) => getComputedStyle(el).animationName),
      "none",
    );
    await context.close();
  }
  // The roster stays fixed while the relevant portrait reacts briefly.
  const motion=await browser.newContext({serviceWorkers:'block',reducedMotion:'no-preference'});
  const motionPage=await motion.newPage();await motionPage.goto(base);await motionPage.waitForFunction(()=>window.testTable);
  const motionGame=cinquilloEngine.createInitialState(['a','b','c','d'],17);
  await motionPage.evaluate(game=>window.testTable('cinquillo',game,game.players[game.turn]),motionGame);
  await motionPage.locator('.legal-card').click();
  assert.ok(await motionPage.locator('.rival-roster').evaluate(el=>el.getAnimations().length===0),'Roster stays still');
  assert.ok(await motionPage.locator('.rival-token').evaluateAll(tokens=>tokens.some(t=>t.getAnimations().length>0)),'Only the relevant portrait reacts');
  await motion.close();
  // Real service worker: all references remain readable after network loss.
  if(process.env.TABLE_BROWSER !== 'webkit') {
    const offlineContext=await browser.newContext();
    const page=await offlineContext.newPage();
    await page.goto(base);
    await page.evaluate(()=>navigator.serviceWorker.ready);
    await page.waitForFunction(()=>navigator.serviceWorker.controller);
    assert.equal(await page.locator('.menu-extras a[href$="biblioteca.html#proximos"]').count(),1);
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
      const style=await fetch('../../cinquillo-table.css'),art=await fetch('../../assets/elteto-original-avatars.png'),screen=await fetch('../../cinquillo-screen.js');
        for (const file of ['rival-portraits.js','rival-portraits.css','assets/elteto-original-avatars.png']) if(!(await fetch('../../'+file)).ok) return false;
      return style.ok && (await style.text()).includes('--pile-w') && art.ok && (await art.blob()).size>10000 && screen.ok && (await screen.text()).includes('arrangeCinquilloScreen');
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
    "2D table: original rival portraits, grouped public counts, subtle reactions, traditional Spanish/French decks, Mus/Cinquillo actions, portrait/landscape, offline, reduced motion and playable without WebGL: OK",
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
