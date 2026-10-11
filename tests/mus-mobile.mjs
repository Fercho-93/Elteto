import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {musEngine as e,getAvailableActions} from '../dist/game-core/index.js';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1]+`\nwindow.testMusLobby=()=>{Object.assign(state,{gameId:'mus',role:'host',screen:'lobby',roomName:'Timba',online:null,players:[{id:'a',name:'Ana'},{id:'b',name:'Carlos'},{id:'c',name:'María'},{id:'d',name:'Pedro'}]});renderLobby();};`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let bytes=await readFile('dist/'+file);if(file==='app.js')bytes=Buffer.from(bytes+fixture);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':'text/html');res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await (process.env.MUS_BROWSER==='webkit'?webkit:chromium).launch();const ids=['a','b','c','d'],names=['Ana','Carlos','María','Pedro'];
const act=(s,p,a)=>e.applyAction(s,p,a),advance=s=>act(s,'a',{type:'advance'}),ready=s=>{while(['dealing','cards-dealt','redeal','showing','counting'].includes(s.phase))s=advance(s);return s;};
try{
 const pages=await Promise.all(ids.map(async()=>{const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);return page;}));
 const errors=[];pages.forEach(page=>page.on('pageerror',e=>errors.push(e.message)));await mkdir('tests/artifacts/mus',{recursive:true});
 const show=(page,s,p)=>page.evaluate(({s,p,names})=>window.testTable('mus',s,p,names),{s,p,names});
 const readyState=ready(e.createInitialState(ids,42));
 for(const [width,height] of [[320,568],[390,664],[390,844],[430,932],[844,390],[1280,800]]){
  for(let i=0;i<4;i++){
   const page=pages[i],p=ids[i];await page.setViewportSize({width,height});await show(page,readyState,p);
   assert.equal(await page.locator('.mus-seat[data-position="self"]').getAttribute('data-player-id'),p);
   assert.equal(await page.locator('.mus-seat[data-position="partner"]').getAttribute('data-player-id'),ids[(i+2)%4]);
   assert.equal(await page.locator('.mus-seat').count(),4);assert.equal(await page.locator('.mus-cards .reference-card-art').count(),4);
   assert.equal(await page.locator('.mus-stock .deck-red').count(),2);
   assert.equal(await page.locator('.reveal-card').count(),0,'rivals have no visible faces before teaching');
   assert.deepEqual(await page.locator('.mus-cards [data-card-key]').evaluateAll(cards=>cards.map(c=>c.dataset.cardKey)),e.view(readyState,p).myHand.map(c=>c.suit+':'+c.rank));
   const dims=await page.locator('.mus-cards .playing-card').evaluateAll(cards=>cards.map(c=>({width:c.getBoundingClientRect().width,css:getComputedStyle(c).width,flex:getComputedStyle(c).flex})));if(dims.some(d=>d.width<77))await page.screenshot({path:'tests/artifacts/mus/failed-layout.png',fullPage:true});assert.ok(dims.every(d=>d.width>=77),JSON.stringify({width,height,dims}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal document overflow');
   assert.ok(await page.evaluate(()=>{const context=document.querySelector('.mus-context h2').getBoundingClientRect(),partner=document.querySelector('.mus-seat[data-position="partner"]').getBoundingClientRect(),self=document.querySelector('.mus-seat[data-position="self"]').getBoundingClientRect();return context.top>=partner.bottom&&context.bottom<=self.top;}),'lance does not overlap player names');
   if(width===320&&height===568&&i===0)await page.screenshot({path:'tests/artifacts/mus/compact.png',fullPage:true});
   if(width===390&&height===844)await page.screenshot({path:`tests/artifacts/mus/pov-${p}.png`,fullPage:true});
  }
 }
 let s=readyState;for(let i=0;i<4;i++)s=act(s,ids[s.musTurn],{type:'mus',wantsMus:true});
 const page=pages[0];await page.setViewportSize({width:390,height:844});await show(page,s,'a');
 const before=await page.evaluate(()=>window.tableSnapshot());await page.locator('.mus-cards .playing-card').nth(1).click();await page.locator('.mus-cards .playing-card').nth(3).click();assert.deepEqual(await page.evaluate(()=>window.tableSnapshot()),before,'card selection does not send a discard');
 assert.equal(await page.locator('.mus-cards .selected').count(),2);assert.match(await page.locator('.mus-decisions>small').textContent(),/2 cartas/);await page.screenshot({path:'tests/artifacts/mus/discard.png',fullPage:true});
 await page.locator('[data-action="mus-discard"]').click();s=await page.evaluate(()=>window.tableSnapshot());assert.equal(s.discardCounts.a,2);assert.match(await page.locator('.mus-wait').innerText(),/Esperando al resto/);
 for(const p of ['b','c','d'])s=act(s,p,{type:'discard',cards:[s.hands[p][0]]});s=ready(s);s=act(s,s.players[s.musTurn],{type:'mus',wantsMus:false});await show(page,s,e.view(s,'a').turnPlayer);
 await page.locator('#bet-amount').fill('4');await page.locator('[data-action="mus-bet"]').click();s=await page.evaluate(()=>window.tableSnapshot());assert.equal(s.betting.pendingBet.amount,4);
 const reply=e.view(s,'a').turnPlayer;await show(page,s,reply);assert.equal(await page.locator('[data-action="mus-pass"]').count(),0);assert.ok(await page.locator('[data-action="mus-accept"]').isVisible());await page.screenshot({path:'tests/artifacts/mus/envite.png',fullPage:true});
 await page.locator('[data-action="mus-ordago"]').click();s=await page.evaluate(()=>window.tableSnapshot());await show(page,s,e.view(s,'a').turnPlayer);assert.equal(await page.locator('[data-action="mus-bet"]').count(),0);assert.equal(await page.locator('[data-action="mus-ordago"]').count(),0);assert.equal(await page.locator('[data-action="mus-accept"]').textContent(),'QUIERO EL ÓRDAGO');
 await page.locator('[data-action="mus-accept"]').click();assert.equal(await page.locator('.mus-detail .reveal-card').count(),16);assert.ok(await page.locator('.mus-detail').evaluate(d=>d.open));await page.screenshot({path:'tests/artifacts/mus/ordago-result.png',fullPage:true});
 await page.locator('[data-action="close-mus-panel"]').click();await page.locator('.mus-tools [data-kind="historial"]').click();assert.ok((await page.locator('.mus-event-list').textContent()).includes('ÓRDAGO'));await page.locator('[data-action="close-mus-panel"]').click();
 await page.evaluate(()=>window.testMusLobby());assert.equal(await page.locator('[data-action="fill-bots"]').count(),0);assert.equal(await page.locator('[data-action="mus-target"][aria-pressed="true"]').textContent(),'40');await page.locator('[data-action="mus-target"][data-target="30"]').click();assert.equal(await page.locator('[data-action="mus-target"][aria-pressed="true"]').textContent(),'30');
 assert.deepEqual(errors,[]);console.log('Mus móvil: 24 perspectivas/layouts, cartas privadas grandes, selección sin envío, descarte confirmado, envites/órdago, manos enseñadas, historial y configuración 30/40: OK');
}finally{await browser.close();await new Promise(r=>server.close(r));}
