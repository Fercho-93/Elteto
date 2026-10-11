import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {getGame} from '../dist/game-core/index.js';
import {chromium,webkit} from 'playwright';
let fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
fixture+=`\nwindow.pokerFixture=(game,id)=>{window.testTable('texas-holdem',game,id);state.players.forEach((p,i)=>p.character=i+2);state.host.setSittingOut=value=>window.testAway=value;state.host.close=()=>window.testClosed=true;renderGame();};window.pokerUpdate=view=>receiveGame({kind:'game',view,players:state.players});`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await (process.env.POKER_BROWSER==='webkit'?webkit:chromium).launch();const errors=[];
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.pokerFixture);
 await mkdir('tests/artifacts/poker',{recursive:true});
 const measure=()=>page.evaluate(()=>{
   const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
   const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
   const table=rect(document.querySelector('.catalog-surface'));
   const seats=[...document.querySelectorAll('.catalog-surface .poker-seat')].map(rect);
   const protectedAreas=[...document.querySelectorAll('.catalog-surface .poker-community,.catalog-surface .poker-pot,.catalog-surface .deck-stock,.catalog-surface .poker-payouts')].map(rect);
   return {page:document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1,
    inside:seats.every(s=>s.left>=table.left&&s.right<=table.right&&s.top>=table.top&&s.bottom<=table.bottom),
    clear:seats.every(s=>protectedAreas.every(p=>!overlap(s,p))),
    distinct:seats.every((s,i)=>seats.slice(i+1).every(p=>!overlap(s,p))),table,seats,protectedAreas};
  });
 const engine=getGame('texas-holdem');let layouts=0;
 for(let count=2;count<=7;count++)for(const [width,height] of [[320,568],[353,768],[390,664],[390,844],[667,375],[844,390],[1280,800]]){
  let game=engine.createInitialState(Array.from({length:count},(_,i)=>'p'+i),91);
  await page.setViewportSize({width,height});await page.evaluate(game=>window.pokerFixture(game,game.players[game.turn]),game);
  const metrics=await measure();
  assert.ok(metrics.page&&metrics.inside&&metrics.clear&&metrics.distinct,JSON.stringify({count,width,height,...metrics}));
  assert.equal(await page.locator('.catalog-surface .poker-seat').count(),count);
  assert.equal(await page.locator('.catalog-surface .poker-wager').count(),2);
  assert.equal(await page.locator('.catalog-surface .poker-pot').getAttribute('aria-label'),'Bote acumulado: 0 fichas');
  assert.equal(await page.locator('.catalog-hand .catalog-card').count(),2);if(count===7&&width===390&&height===844)await page.screenshot({path:'tests/artifacts/poker/seven-players.png'});layouts++;
  while(game.phase!=='result'){
   const id=game.players[game.turn];game=engine.applyAction(game,id,{type:game.currentBet>game.street[id]?'call':'check'});
  }
  await page.evaluate(game=>window.pokerFixture(game,'p0'),game);
  const shown=await measure();
  assert.ok(shown.page&&shown.inside&&shown.clear&&shown.distinct,JSON.stringify({showdown:true,count,width,height,...shown}));
  assert.equal(await page.locator('.catalog-dock .poker-showdown').count(),count);
  if(count===7&&width===390&&height===844)await page.screenshot({path:'tests/artifacts/poker/showdown.png'});
 }
 await page.setViewportSize({width:390,height:844});let game=engine.createInitialState(['p0','p1','p2'],9);
 await page.evaluate(game=>window.pokerFixture(game,game.players[game.turn]),game);
 await page.locator('.game-menu-button').click();await page.locator('[data-action="poker-break"]').click();
 assert.ok(await page.getByText('Tu sitio sigue reservado').isVisible());assert.equal(await page.evaluate(()=>window.testAway),true);
 game=engine.applyAction(game,game.players[game.turn],{type:'fold'});
 await page.evaluate(view=>window.pokerUpdate(view),engine.view(game,'p0'));
 assert.ok(await page.getByText('Tu sitio sigue reservado').isVisible(),'updates do not force absent player back');
 await page.locator('[data-action="poker-return"]').click();assert.equal(await page.evaluate(()=>window.testAway),false);assert.ok(await page.locator('.poker-table').first().isVisible());
 while(game.phase!=='result')game=engine.applyAction(game,game.players[game.turn],{type:'fold'});
 await page.evaluate(game=>window.pokerFixture(game,'p0'),game);
 assert.equal(await page.locator('.catalog-surface .poker-wager').count(),0);
 assert.equal(await page.locator('.catalog-surface .poker-pot').getAttribute('aria-label'),`Bote repartido: ${engine.view(game,'p0').pot} fichas`);
 game.chips.p0=0;await page.evaluate(game=>window.pokerFixture(game,'p0'),game);
 assert.match(await page.locator('.catalog-surface .self-seat .poker-status').textContent(),/Observador/);
 await mkdir('tests/artifacts/poker',{recursive:true});await page.screenshot({path:'tests/artifacts/poker/table.png'});
 await page.locator('.game-menu-button').click();await page.locator('[data-action="leave-room"]').click();assert.equal(await page.evaluate(()=>window.testClosed),true);assert.equal(await page.locator('.poker-table').count(),0);
 assert.deepEqual(errors,[]);console.log(`Póker ${process.env.POKER_BROWSER||'chromium'}: ${layouts} layouts, apuestas/bote, observador y ausentarse/volver: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
