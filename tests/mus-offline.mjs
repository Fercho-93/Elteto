import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {musEngine} from '../dist/game-core/index.js';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let bytes=await readFile('dist/'+file);if(file==='app.js')bytes=Buffer.from(bytes+fixture);const mime=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.jpg')?'image/jpeg':file.endsWith('.svg')?'image/svg+xml':'text/html';res.setHeader('content-type',mime);res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch();
try{
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>navigator.serviceWorker.controller,{},{timeout:20000});
 assert.ok(await page.evaluate(async()=>{const registrations=await navigator.serviceWorker.getRegistrations();return registrations.some(r=>r.active);}));
 await context.setOffline(true);await page.reload();await page.waitForFunction(()=>window.testTable);
 let state=musEngine.createInitialState(['a','b','c','d'],42);for(let i=0;i<2;i++)state=musEngine.applyAction(state,'a',{type:'advance'});await page.evaluate(s=>window.testTable('mus',s,'a'),state);assert.equal(await page.locator('.mus-cards .reference-card-art').count(),4);
 assert.ok(await page.evaluate(async()=>{const img=new Image();img.src='./assets/decks/fournier-spanish.jpg';await img.decode();return img.naturalWidth===1536;}));
 await page.locator('.game-info-button').click();await page.waitForFunction(()=>document.querySelector('.help-source')?.textContent.includes('Sentarse y formar parejas'));assert.ok((await page.locator('.game-help').textContent()).includes('ocho reyes y ocho ases'));await page.locator('.help-return').click();assert.equal(await page.locator('.mus-cards .reference-card-art').count(),4);assert.deepEqual(errors,[]);await context.close();console.log('Mus offline real: service-worker instalado, recarga sin red, cuatro cartas privadas y guía de reglas con vuelta a la mesa: OK');
}finally{await browser.close();await new Promise(r=>server.close(r));}
