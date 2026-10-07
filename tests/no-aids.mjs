// Exercise manual choices through the production UI, including rejected moves.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {getGame,canPlaceCinquillo,nextBotMove} from '../dist/game-core/index.js';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.AIDS_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'no-preference'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 const show=async(id,game,player=game.players[game.turn])=>page.evaluate(({id,game,player})=>window.testTable(id,game,player),{id,game,player});
 const snapshot=()=>page.evaluate(()=>window.tableSnapshot());
 const domino=getGame('domino');let game=domino.createInitialState(['a','b','c','d'],22);await show('domino',game);
 await mkdir('tests/artifacts',{recursive:true});await page.screenshot({path:`tests/artifacts/domino-no-aids-${kind}.png`});
 assert.equal(await page.locator('.catalog-hand button.domino-tile').count(),7);
 assert.equal(await page.locator('[data-action="catalog-choice"]').count(),0);
 const first=domino.view(game,'a').options[0].action;
 await page.locator(`[data-tile-id="${first.tile}"]`).click();game=await snapshot();assert.equal(game.chain.length,1);
 const active=game.players[game.turn],view=domino.view(game,active);
 const place=view.options.find(o=>o.action.type==='place').action;
 await show('domino',game,active);await page.locator(`[data-tile-id="${place.tile}"]`).click();
 assert.equal(await page.locator('[data-action="catalog-place-tile"]').count(),2,'Both ends are offered without a hint');
 await page.locator(`[data-action="catalog-place-tile"][data-side="${place.side}"]`).click();assert.deepEqual(await snapshot(),domino.applyAction(game,active,place));
 // A tile that cannot fit is still selectable and rejected only after trying it.
 game=domino.createInitialState(['a','b','c','d'],22);game.chain=[{id:'test',left:6,right:6}];await show('domino',game,'a');
 const invalid=game.tiles.a.find(t=>t.left!==6&&t.right!==6);
 await page.locator(`[data-tile-id="${invalid.id}"]`).click();await page.locator('[data-side="left"]').click();
 assert.deepEqual(await snapshot(),game);assert.match(await page.locator('.catalog-instruction').textContent(),/encaje/);
 const cinquillo=getGame('cinquillo');game=cinquillo.createInitialState(['a','b','c','d'],17);const human=game.players[game.turn];await show('cinquillo',game,human);
 assert.equal(await page.locator('.legal-card,.has-play,.lane-next').count(),0);
 assert.equal(await page.locator('.hand button:enabled').count(),game.hands[human].length);
 assert.ok(await page.locator('[data-action="cinquillo-pass"]').isEnabled());
 assert.ok(await page.locator('.hand').evaluate(el=>el.getAnimations({subtree:true}).filter(a=>a.constructor.name==='Animation').length===0),'No face-up deal animation');
 const wrong=game.hands[human].find(c=>!canPlaceCinquillo(game.table,c,game.ruleset));
 await page.locator(`[data-card-key="${wrong.suit}:${wrong.rank}"]`).click();assert.deepEqual(await snapshot(),game);assert.ok(await page.locator('.play-error').isVisible());
 await page.locator('[data-action="cinquillo-pass"]').click();assert.deepEqual(await snapshot(),game);
 await page.locator('[data-card-key="oros:5"]').click();assert.equal((await snapshot()).table.oros.low,4);
 // Trick games offer all cards with the same styling, including illegal cards.
 const tute=getGame('tute');game=tute.createInitialState(['a','b','c','d'],22);
 game.hands.a=[{id:'a-1',suit:'oros',rank:'1'},{id:'a-2',suit:'copas',rank:'2'}];game.turn=0;game.phase='play';game.trick=[{player:'d',card:{id:'d-3',suit:'oros',rank:'3'}}];
 await show('tute',game,'a');assert.equal(await page.locator('.catalog-hand button:enabled').count(),2);
 await page.locator('[data-card-id="a-2"]').click();assert.deepEqual(await snapshot(),game);assert.ok(await page.locator('.catalog-instruction [role="alert"]').isVisible());
 await page.locator('[data-card-id="a-1"]').click();assert.equal((await snapshot()).hands.a.length,1);
 // Checkers accepts a manually chosen path without marking destinations.
 const checkers=getGame('damas-espanolas');game=checkers.createInitialState(['a','b'],22);await show('damas-espanolas',game,'a');
 assert.equal(await page.locator('.legal-square').count(),0);assert.equal(await page.locator('.catalog-surface .checker-square:enabled').count(),32);
 const move=checkers.view(game,'a').moves[0];for(const square of move.path)await page.locator(`.catalog-surface [data-square="${square}"]`).click();assert.deepEqual(await snapshot(),checkers.applyAction(game,'a',{type:'move',path:move.path}));
 // Meld targets remain available without suggesting a matching card.
 const chinchon=getGame('chinchon');game=chinchon.createInitialState(['a','b'],22);game.turn=0;game.phase='layoff';
 game.hands.a=[{id:'a-4',suit:'oros',rank:'4'},{id:'a-7',suit:'copas',rank:'7'}];game.exposed.b=[{kind:'run',cards:['1','2','3'].map(rank=>({id:'b-'+rank,suit:'oros',rank}))}];
 await show('chinchon',game,'a');assert.equal(await page.locator('[data-action="catalog-extend"]').count(),1);
 await page.locator('[data-card-id="a-7"]').click();await page.locator('[data-action="catalog-extend"]').click();assert.deepEqual(await snapshot(),game);
 await page.locator('[data-card-id="a-4"]').click();await page.locator('[data-action="catalog-extend"]').click();assert.equal((await snapshot()).exposed.b[0].cards.length,4);
 // During the opening bot turns the host view keeps the host's hand.
 const {LocalHostSession}=await import('../dist/local-session.js');
 for(const id of ['cinquillo','mus','tute','chinchon','texas-holdem']){
  let session;const events=[];session=new LocalHostSession(id,'Ana','Mesa',e=>{if(e.kind==='game')events.push(e);});session.fillWithBots();session.startGame(22);session.botRunner.stop();
  for(let step=0;step<6;step++){
   const e=events.at(-1);assert.deepEqual(e.view.myHand,session.state.hands.host);assert.equal(e.view.hands,undefined);assert.equal(e.view.revealedHands,undefined);
   const move=nextBotMove(session.engine,session.state,session.bots.map(p=>p.id));if(!move)break;
   session.state=session.engine.applyAction(session.state,move.playerId,move.action);session.sendViews();session.botRunner.stop();
  }
  await show(id,session.state,'host');
  assert.equal(await page.locator('.players-panel img,.rival-roster .card-face').count(),0);
  assert.ok(await page.locator('.hand,.catalog-hand').evaluateAll(els=>els.every(el=>el.getAnimations({subtree:true}).filter(a=>a.constructor.name==='Animation').length===0)));
  // No automatic scroll to AI seats when they take a turn.
  const result=await page.evaluate(async()=>{const {revealActivePlayer}=await import('./rival-portraits.js');const roster=document.querySelector('.player-roster');if(!roster)return true;const active=roster.querySelector('[aria-current]');if(!active)return true;active.dataset.playerId='bot-1';roster.style.width='40px';roster.scrollLeft=0;revealActivePlayer(document.querySelector('#app'));return roster.scrollLeft===0;});assert.ok(result);
  session.close();
 }
 assert.deepEqual(errors,[]);console.log(`${kind}: manual domino/Cinquillo/Tute/checkers/meld moves, invalid moves, no hints, private deal and no AI sweep OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
