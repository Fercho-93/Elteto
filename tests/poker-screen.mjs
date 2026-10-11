import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {getGame} from '../dist/game-core/index.js';
import {chromium} from 'playwright';
let fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
fixture+=`\nwindow.pokerFixture=(game,id)=>{window.testTable('texas-holdem',game,id);state.players.forEach((p,i)=>p.character=i+2);state.host.setSittingOut=value=>window.testAway=value;renderGame();};window.pokerUpdate=view=>receiveGame({kind:'game',view,players:state.players});`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();const errors=[];
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.pokerFixture);
 await mkdir('tests/artifacts/poker',{recursive:true});
 const engine=getGame('texas-holdem');let layouts=0;
 for(let count=2;count<=7;count++)for(const [width,height] of [[320,568],[390,664],[390,844],[667,375],[844,390],[1280,800]]){
  const game=engine.createInitialState(Array.from({length:count},(_,i)=>'p'+i),91);
  await page.setViewportSize({width,height});await page.evaluate(game=>window.pokerFixture(game,game.players[game.turn]),game);
  const metrics=await page.evaluate(()=>{const r=el=>el.getBoundingClientRect(),table=r(document.querySelector('.catalog-surface')),seats=[...document.querySelectorAll('.catalog-surface .poker-seat')].map(r);return {page:document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1,seats:seats.every(s=>s.left>=table.left&&s.right<=table.right&&s.top>=table.top&&s.bottom<=table.bottom),height:table.height,table:{left:table.left,top:table.top,right:table.right,bottom:table.bottom},rects:seats.map(s=>({left:s.left,top:s.top,right:s.right,bottom:s.bottom,height:s.height}))};});
  assert.ok(metrics.page&&metrics.seats,JSON.stringify({count,width,height,...metrics}));
  assert.equal(await page.locator('.catalog-surface .poker-seat').count(),count);
  assert.equal(await page.locator('.catalog-surface .poker-wager').count(),2);
  assert.equal(await page.locator('.catalog-surface .poker-pot').getAttribute('aria-label'),'Bote acumulado: 0 fichas');
  assert.equal(await page.locator('.catalog-hand .catalog-card').count(),2);if(count===7&&width===390&&height===844)await page.screenshot({path:'tests/artifacts/poker/seven-players.png'});layouts++;
 }
 await page.setViewportSize({width:390,height:844});let game=engine.createInitialState(['p0','p1','p2'],9);
 await page.evaluate(game=>window.pokerFixture(game,game.players[game.turn]),game);
 await page.locator('.game-menu-button').click();await page.locator('[data-action="leave-room"]').click();
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
 assert.deepEqual(errors,[]);console.log(`Póker Chromium: ${layouts} layouts, apuestas/bote, observador y ausentarse/volver: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
