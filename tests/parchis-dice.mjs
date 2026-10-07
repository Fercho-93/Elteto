import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {parchisEngine as engine} from '../dist/game-core/index.js';
import {chromium,webkit} from 'playwright';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1]+`
window.delayDice=()=>{const apply=state.host.applyLocalAction;window.diceCalls=0;state.host.applyLocalAction=action=>{window.diceCalls++;setTimeout(()=>apply(action),250);};};
window.diceError=()=>{state.error='No se pudo tirar';renderGame();};
window.redrawDice=()=>renderGame();
`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.PARCHIS_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
await mkdir('tests/artifacts/parchis',{recursive:true});
try{
 const page=await browser.newPage({viewport:{width:390,height:664},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 const game=engine.createInitialState(['a','b','c','d'],17);
 const show=async game=>page.evaluate(game=>window.testTable('parchis',game,game.players[game.turn]),game);
 await show(game);assert.equal(await page.locator('.parchis-die').getAttribute('data-result'),'0');
 // A delayed response and rapid repeated taps produce one authoritative action.
 await page.evaluate(()=>{window.delayDice();const b=document.querySelector('[data-action="parchis-roll"]');b.click();b.click();b.click();});
 assert.equal(await page.evaluate(()=>window.diceCalls),1);
 await page.waitForFunction(()=>document.querySelector('.parchis-die').dataset.rollId==='1');
 assert.equal(await page.locator('.parchis-dock').getAttribute('aria-busy'),'true');
 assert.ok(await page.locator('.die-flight').evaluate(el=>el.getAnimations().length>0));
 await page.screenshot({path:`tests/artifacts/parchis/dice-bounce-${kind}.png`});
 await page.waitForFunction(()=>document.querySelector('.parchis-dock').getAttribute('aria-busy')==='false');
 // Every possible result is a real six-faced cube with the requested face nearest.
 for(let value=1;value<=6;value++){
  await show({...game,lastRoll:{sequence:value+1,player:'a',value,initial:true,round:1}});
  await page.waitForFunction(()=>document.querySelector('.parchis-dock').getAttribute('aria-busy')==='false');
  assert.equal(await page.locator('.parchis-die').getAttribute('data-result'),String(value));
  assert.equal(await page.locator('.die-face').count(),6);
  assert.equal(await page.locator(`.face-${value} i`).count(),value);
  const depths=await page.locator('.die-cube').evaluate(cube=>[...cube.children].map(face=>{const c=new DOMMatrix(getComputedStyle(cube).transform),f=new DOMMatrix(getComputedStyle(face).transform);return c.multiply(f).m43;}));
  assert.equal(depths.indexOf(Math.max(...depths))+1,value);
  await page.evaluate(()=>window.redrawDice());assert.equal(await page.locator('.parchis-dock').getAttribute('aria-busy'),'false','same roll does not replay');
 }
 // New games in the same screen reset animation state, including before first roll.
 await show(game);assert.equal(await page.locator('.parchis-dock').getAttribute('aria-busy'),'false');
 await page.evaluate(()=>window.diceError());assert.equal(await page.locator('[data-action="parchis-roll"]').isEnabled(),true);
 await page.emulateMedia({reducedMotion:'reduce'});await show({...game,lastRoll:{sequence:1,player:'a',value:5,initial:true,round:1}});
 assert.equal(await page.locator('.parchis-dock').getAttribute('aria-busy'),'false');
 assert.equal(await page.locator('.die-cube').evaluate(el=>el.getAnimations().length),0);
 assert.deepEqual(errors,[]);console.log(`${kind}: all six faces, damped bounce, delayed response, repeated taps, persistent results, new game and reduced motion: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
