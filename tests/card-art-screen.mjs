import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {getGame} from '../dist/game-core/index.js';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('content-type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 await page.setViewportSize({width:390,height:844});
 const mus=getGame('mus'),game=mus.createInitialState(['a','b','c','d'],12);
 assert.equal(mus.view(game,'a').stockCount,game.stock.length);
 await page.evaluate(game=>window.testTable('mus',game,'a'),game);
 assert.equal(await page.locator('.deck-stock').getAttribute('aria-label'),'Mazo español: 24 cartas sin repartir');
 assert.equal(await page.locator('.deck-stock .deck-red').count(),2);
 assert.equal(await page.locator('.hand .reference-card-art').count(),4);
 await mkdir('tests/artifacts/decks',{recursive:true});await page.screenshot({path:'tests/artifacts/decks/mus.png'});
 const poker=getGame('texas-holdem'),p=poker.createInitialState(['a','b'],12);
 await page.evaluate(game=>window.testTable('texas-holdem',game,'a'),p);
 assert.equal(await page.locator('.catalog-surface .deck-stock').getAttribute('aria-label'),'Mazo de póker: 48 cartas sin repartir');
 assert.equal(await page.locator('.catalog-surface .deck-stock .deck-blue').count(),2);
 await page.screenshot({path:'tests/artifacts/decks/poker.png'});
 await page.evaluate(async()=>{
  const {renderCardArtwork,renderCardBack}=await import('./card-art.js');
  const suits=['oros','espadas','copas','bastos'],ranks=['1','2','3','4','5','6','7','10','11','12'];
  document.querySelector('#app').innerHTML=`<div class="test-deck-gallery" style="display:grid;grid-template-columns:repeat(10,1fr);gap:6px;padding:10px;background:#164b3e">${suits.flatMap(suit=>ranks.map(rank=>`<div style="height:160px;color:#fff;text-align:center"><div style="height:140px;border:3px solid #fff3d3;border-radius:5px;overflow:hidden">${renderCardArtwork({suit,rank})}</div><small>${rank} ${suit}</small></div>`)).join('')}</div><div style="display:flex;gap:20px;padding:20px;background:#164b3e"><div style="width:140px;height:208px">${renderCardBack()}</div><div style="width:140px;height:208px">${renderCardBack(true)}</div></div>`;
 });
 await page.setViewportSize({width:1000,height:925});
 assert.equal(await page.locator('.test-deck-gallery svg').count(),40);
 const windows=await page.locator('.test-deck-gallery svg').evaluateAll(svgs=>svgs.map(el=>el.getAttribute('viewBox')));assert.equal(new Set(windows).size,40);
 await page.evaluate(async()=>{await Promise.all(['./assets/decks/fournier-spanish.jpg','./assets/decks/elteto-backs.jpg'].map(src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=src;})));});
 await page.screenshot({path:'tests/artifacts/decks/all-cards.png',fullPage:true});assert.deepEqual(errors,[]);
 console.log('Barajas: 40 frontales originales, dorso rojo/azul, mazos Mus/póker y recuentos: OK');
}finally{await browser.close();await new Promise(r=>server.close(r));}
