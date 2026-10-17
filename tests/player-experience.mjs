import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {PNG} from 'pngjs';
import {getGame} from '../dist/game-core/index.js';
let fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
fixture+=`\nwindow.directPoker=view=>{state.view=view;renderGame();};`;
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://local').pathname.slice(1)||'index.html';let b=await readFile('dist/'+p);if(p==='app.js')b=Buffer.from(b+fixture);res.setHeader('content-type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.png')?'image/png':p.endsWith('.webp')?'image/webp':p.endsWith('.gif')?'image/gif':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.jpg')?'image/jpeg':'text/html');res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await(process.env.EXPERIENCE_BROWSER==='webkit'?webkit:chromium).launch();
try{
 const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 await page.locator('#profile-name').waitFor();await page.locator('[data-action="profile-confirm"]').click();assert.ok(await page.locator('#profile-name').isVisible());
 await page.locator('#profile-name').fill('Fer');await page.locator('[data-action="choose-character"]').click();await page.locator('[data-action="select-character"][data-character="4"]').click();await page.locator('[data-action="profile-confirm"]').click();
 assert.equal(await page.evaluate(()=>localStorage.getItem('elteto.playerName')),'Fer');assert.equal(await page.evaluate(()=>localStorage.getItem('elteto.character')),'4');
 assert.equal(await page.locator('[data-action="open-join"]').count(),0);await page.locator('[data-action="edit-profile"]').click();assert.equal(await page.locator('#profile-name').inputValue(),'Fer');await page.reload({waitUntil:'domcontentloaded'});await page.locator('.fuegote-button').waitFor();assert.equal(await page.locator('#profile-name').count(),0);
 const engine=getGame('texas-holdem');let game=engine.createInitialState(['a','b','c','d'],90);
 await page.evaluate(game=>window.testTable('texas-holdem',game,'a'),game);
 assert.equal(await page.locator('.poker-table .deck-stock').count(),0,'Poker hides the undealt deck and its count');
 const portrait=page.locator('.catalog-surface .poker-seat .avatar-artwork').first();const avatarPixels=await portrait.screenshot();
 await page.evaluate(()=>window.avatarNodes=[...document.querySelectorAll('.catalog-surface .poker-seat .avatar-artwork')]);
 for(let i=0;i<3;i++){
  const actor=game.players[game.turn];game=engine.applyAction(game,actor,{type:'call'});
  await page.evaluate(v=>window.directPoker(v),engine.view(game,'a'));
  assert.equal(await page.evaluate(()=>window.avatarNodes.every((node,i)=>node===document.querySelectorAll('.catalog-surface .poker-seat .avatar-artwork')[i])),true,'Decoded avatar nodes remain stable after every decision');
  assert.ok(await page.locator('.catalog-surface .poker-seat .avatar-artwork img').evaluateAll(images=>images.length===4&&images.every(img=>img.complete&&img.naturalWidth===1983)));
  const before=PNG.sync.read(avatarPixels),after=PNG.sync.read(await portrait.screenshot());let changed=0,total=0;for(let y=4;y<before.height-4;y++)for(let x=4;x<before.width-4;x++){const p=(y*before.width+x)*4;total++;if([0,1,2].some(c=>Math.abs(before.data[p+c]-after.data[p+c])>50))changed++;}assert.ok(changed/total<.05,'Avatar pixels remain visible after decision');
  assert.ok(await page.locator('.poker-moving-chip').count()>0,'Bet chips fly from stack or into pot');
 }
 const metrics=await page.locator('.catalog-surface .poker-chip-pile').evaluate(el=>{const icon=el.querySelector('.poker-chip').getBoundingClientRect(),n=el.querySelector('b').getBoundingClientRect();return icon.right<n.left&&icon.bottom<=el.getBoundingClientRect().bottom+1;});assert.ok(metrics,'Pot number has a separate lane from chip art');
 while(game.phase!=='result'){const id=game.players[game.turn];game=engine.applyAction(game,id,{type:game.currentBet>game.street[id]?'call':'check'});}
 await page.evaluate(v=>window.directPoker(v),engine.view(game,'a'));
 assert.ok(await page.locator('.catalog-surface .poker-community .catalog-card').evaluateAll(cards=>cards.some(c=>c.getAnimations().length)),'Community cards animate when revealed');
 assert.ok(await page.locator('.poker-moving-chip').count()>0,'Winnings fly to stack');
 assert.deepEqual(errors,[]);console.log('Player experience: first profile, stored identity, stable avatars, animated bets/cards/payout and separated pot label: OK');
}finally{await browser.close();await new Promise(r=>server.close(r));}
