import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {getGame} from '../dist/game-core/index.js';
let fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
fixture+=`\nwindow.testHome=()=>renderHome();window.testLobby=id=>{Object.assign(state,{screen:'lobby',role:'host',gameId:id,roomName:'Mesa de prueba',view:null,players:[{id:'host',name:'Ana',isHost:true}]});renderLobby();};`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await (process.env.HELP_BROWSER==='webkit'?webkit:chromium).launch();
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testHome);
 await mkdir('tests/artifacts/help',{recursive:true});
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.testHome());
  assert.equal((await page.locator('.menu-intro h1').innerText()).replace(/\s+/g,' '),'Se viene PIQUE!');
  assert.equal(await page.locator('.menu-actions .menu-button').count(),2);
  assert.deepEqual(await page.locator('.menu-button-arrow').allTextContents(),['→','→']);
  assert.equal(await page.locator('.menu-rules,.menu-network-note').count(),0);
  assert.equal(await page.locator('.menu-credit').textContent(),'By Fercho&PAS');
  assert.ok(await page.locator('.menu-button').evaluateAll(buttons=>buttons.every(b=>getComputedStyle(b,'::after').display==='none')));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390)await page.screenshot({path:'tests/artifacts/help/home.png',fullPage:true});
 }
 for(const id of ['mus','parchis','texas-holdem','damas-espanolas','oca']){
  const engine=getGame(id),game=engine.createInitialState(Array.from({length:engine.minPlayers},(_,i)=>'p'+i),22);
  for(const [width,height] of [[320,568],[390,844],[844,390]]){
   await page.setViewportSize({width,height});await page.evaluate(({id,game})=>window.testTable(id,game,'p0'),{id,game});
   assert.equal(await page.locator('.game-info-button').count(),1);
   await page.locator('.game-info-button').click();await page.locator('.help-original').waitFor();
   if(id==='oca'){const expected=(await readFile('reglas_juegos/consulta/oca.html','utf8')).match(/<body>([\s\S]*)<\/body>/)[1].replace(/<[^>]+>/g,'');assert.equal((await page.locator('.help-original').textContent()).trim(),expected.trim());}else assert.ok((await page.locator('.help-original').textContent()).length>1000);
   assert.equal(await page.locator('.help-source>a').getAttribute('href'),(await import('../dist/game-core/index.js')).getGamePlan(id).rules.url);
   assert.ok(await page.locator('.game-help').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
   await page.locator('[data-help-jump=".help-source"]').click();assert.ok(await page.locator('.help-scroll').evaluate(el=>el.scrollTop>0));
   await page.locator('[data-help-jump=".help-table-rules"]').click();
   assert.deepEqual(await page.evaluate(()=>window.tableSnapshot()),game,'opening information never changes the game');
   await page.evaluate(({id,game})=>window.testTable(id,game,'p0'),{id,game});
   assert.ok(await page.locator('.game-help').evaluate(el=>el.open),'game refresh preserves the open rulebook');
   if(width===390)await page.screenshot({path:`tests/artifacts/help/${id}.png`});
   await page.locator('.help-return').click();await page.locator('.game-help').waitFor({state:'detached'});assert.equal(await page.locator('.game-help').count(),0);assert.ok(await page.locator('.game-info-button').isVisible());
  }
  await page.evaluate(id=>window.testLobby(id),id);await page.locator('.game-info-button').click();await page.locator('.help-original').waitFor();await page.locator('.help-return').click();await page.locator('.game-help').waitFor({state:'detached'});assert.ok(await page.locator('.menu-lobby').isVisible());
 }
 const safe=await page.evaluate(async()=>{const {cleanRulebook}=await import('./game-help.js');const doc=cleanRulebook('<script>window.pwned=true</script><p onclick="evil()">Regla</p><a href="javascript:evil()">Enlace</a><iframe src="https://example.com"></iframe>');return {html:doc.innerHTML,pwned:window.pwned};});
 assert.equal(safe.pwned,undefined);assert.ok(!/script|onclick|javascript|iframe/.test(safe.html));assert.deepEqual(errors,[]);
 console.log('Inicio + reglas: cinco juegos, 15 layouts, reglamentos completos, sanitización y vuelta sin perder partida: OK');
}finally{await browser.close();await new Promise(r=>server.close(r));}
