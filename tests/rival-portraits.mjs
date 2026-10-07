import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {cinquilloEngine,canPlaceCinquillo} from '../dist/game-core/index.js';
import {mascotForSeat} from '../dist/table-view.js';
const fixture=(await readFile(new URL('./table-navegador.mjs',import.meta.url),'utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const golden=JSON.parse(await readFile(new URL('./fixtures/table-014-geometry.json',import.meta.url),'utf8'));
const output=new URL('./artifacts/avatars/',import.meta.url);await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let data=await readFile(new URL('../dist/'+file,import.meta.url));if(file==='app.js')data=Buffer.from(data+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const name=process.env.AVATAR_BROWSER||'chromium',browser=await(name==='webkit'?webkit:chromium).launch();
async function settle(page){await page.evaluate(async()=>{let previous='',stable=0;for(let n=0;n<30;n++){await new Promise(requestAnimationFrame);const current=JSON.stringify([...document.querySelectorAll('.table-surface,.table-center,.hand,.hand-dock')].map(el=>el.getBoundingClientRect().toJSON()));stable=current===previous?stable+1:0;previous=current;if(stable===3)return;}throw Error('Unstable layout');});}
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 for(const row of golden){
  await page.setViewportSize({width:row.width,height:row.height});let game=cinquilloEngine.createInitialState(['a','b','c','d','e','f'].slice(0,row.count),17),moves=0;
  for(let step=0;step<200&&moves<18&&!game.handWinner;step++){const id=game.players[game.turn],card=game.hands[id].find(c=>canPlaceCinquillo(game.table,c,game.ruleset));game=cinquilloEngine.applyAction(game,id,card?{type:'play',card}:{type:'pass'});if(card)moves++;}
  await page.evaluate(game=>window.testTable('cinquillo',game,game.players[game.turn]),game);await settle(page);
  const actual=await page.locator('.table-surface,.table-center,.hand,.hand-dock').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().toJSON()));
  actual.forEach((rect,i)=>{for(const key of ['x','y','width','height'])assert.ok(Math.abs(rect[key]-row.frozen[i][key])<1,`Approved 0.1.4 geometry changed: ${row.width}×${row.height}/${row.count} ${i} ${key}`);});
 }
 assert.deepEqual(await readFile(new URL('../apps/web/assets/elteto-original-avatars.png',import.meta.url)),await readFile(new URL('../design/references/personajes-10.png',import.meta.url)),'Original artwork is byte-identical to the user reference');
 const rows=[];
 for(const [width,height] of [[320,568],[390,664],[1280,800]])for(let character=0;character<10;character++) {
  let ids;for(let n=0;n<1000;n++){ids=[`rival-${n}`,'b','c','d','e','f'];if(mascotForSeat(ids,0)===character)break;}
  assert.equal(mascotForSeat(ids,0),character);
  const game=cinquilloEngine.createInitialState(ids,17);await page.setViewportSize({width,height});
  // Relative positions 1,3,5 cover right-facing, front and left-facing poses.
  for(const own of [5,3,1]){
   await page.evaluate(({game,own})=>window.testTable('cinquillo',game,game.players[own]),{game,own});await settle(page);
   const metrics=await page.evaluate(id=>{const seat=[...document.querySelectorAll('.rival-seat')].find(el=>el.dataset.playerId===id),portrait=seat.querySelector('.rival-original'),r=portrait.getBoundingClientRect();const bodies=[...document.querySelectorAll('.rival-seat')].map(el=>el.getBoundingClientRect());const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;return {faceVisible:document.elementFromPoint(r.x+r.width*.5,r.y+r.height*.52)?.closest('.rival-seat')===seat,portraitFits:r.left>=0&&r.right<=innerWidth&&r.top>=44,noOverlap:!bodies.some((a,i)=>bodies.slice(i+1).some(b=>overlap(a,b))),count:Number(seat.querySelector('.rival-count').textContent),href:portrait.querySelector('image').getAttribute('href'),order:[...document.querySelectorAll('.rival-seat')].map(s=>s.dataset.playerId),ownAbsent:!document.querySelector('.own-seat')};},ids[0]);
   rows.push({width,height,character,...metrics});assert.ok(metrics.faceVisible&&metrics.portraitFits&&metrics.noOverlap&&metrics.ownAbsent,JSON.stringify(rows.at(-1)));assert.equal(metrics.count,game.hands[ids[0]].length);assert.ok(metrics.href.includes('elteto-original-avatars.png'));assert.deepEqual(metrics.order,Array.from({length:5},(_,i)=>game.players[(own+i+1)%6]));
   if(width===390&&own===3)await page.screenshot({path:fileURLToPath(new URL(`identity-${character}-${name}.png`,output))});
  }
 }
 // Synthetic public hand counts exercise empty/single/large fans without a game action.
 for(const count of [0,1,5,20]) {
  const game=cinquilloEngine.createInitialState(['count-a','count-b'],17);
  game.hands['count-b']=Array.from({length:count},(_,i)=>game.hands['count-b'][i%20]);
  await page.evaluate(game=>window.testTable('cinquillo',game,'count-a'),game);
  assert.equal(await page.locator('.rival-hand,.forearms').count(),0);
  assert.equal(Number((await page.locator('.rival-count').textContent()).replace(/\D/g,'')),count);
 }
 assert.ok(await page.evaluate(async()=>{const image=new Image();image.src='./assets/elteto-original-avatars.png';await image.decode();return image.naturalWidth===1280&&image.naturalHeight===853;}),'Original sheet decodes offline from local assets');
 assert.deepEqual(errors,[]);await writeFile(new URL(`measurements-${name}.json`,output),JSON.stringify(rows,null,2));console.log(`${name}: 90 identity/point-of-view/viewport cases; 15 approved table/hand geometries preserved; 0/1/5/20 public counts and original artwork verified`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
