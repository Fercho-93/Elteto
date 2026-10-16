import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parchisEngine as engine} from '../dist/game-core/index.js';
import {pawnPoint} from '../dist/parchis-board.js';
import {parchisGeometry,insideConvex} from '../dist/parchis-geometry.js';
const {chromium,webkit}=await import('playwright');
for(const sides of [3,4,5,6]){const g=parchisGeometry(sides);assert.equal(g.track.length,17*sides);assert.equal(new Set(g.track.map(c=>c.center.map(n=>n.toFixed(3)).join(','))).size,17*sides);
 for(const color of g.layout.colors)for(let progress=-1;progress<=g.layout.goal;progress++)assert.ok(insideConvex(g.board,pawnPoint(color,progress,0,sides)));}
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.PARCHIS_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
await mkdir('tests/artifacts/parchis',{recursive:true});const errors=[],rows=[];
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 let middle=engine.createInitialState(['player-a','player-b','player-c','player-d'],17);
 const states=[middle];let finish;
 for(let step=0;step<6000&&!middle.finished;step++){
  const id=middle.players[middle.turn],view=engine.view(middle,id),moves=view.legalMoves;
  middle=engine.applyAction(middle,id,moves.length?{type:'move',piece:[...moves].sort((a,b)=>b.to-a.to)[0].piece}:{type:'roll'});
  if(step===220)states.push(middle);
  if(middle.phase==='bonus'&&!states.some(s=>s.phase==='bonus'))states.push(middle);
  if(middle.finished)finish=middle;
 }
 assert.ok(finish);states.push(finish);
 // Triangle, pentagon and hexagon tables, the last two with the two-dice option.
 for(const [count,dice] of [[3,1],[5,2],[6,2],[6,1]]){
  let game=engine.createInitialState(['player-a','player-b','player-c','player-d','player-e','player-f'].slice(0,count),30+count);
  if(game.phase==='setup'){states.push(game);game=engine.applyAction(game,'player-a',{type:'dice',count:dice});}
  for(let step=0;step<260&&!game.finished;step++){const id=game.players[game.turn],moves=engine.view(game,id).legalMoves,best=[...moves].sort((a,b)=>b.to-a.to)[0];game=engine.applyAction(game,id,best?{type:'move',piece:best.piece,dice:best.dice}:{type:'roll'});}
  states.push(game);
 }
 for(const [width,height,insets] of [[320,568],[360,640],[390,664],[390,844],[430,932],[640,360],[667,375],[844,390],[1280,800],[390,664,[0,8,34,8]],[844,390,[0,44,21,44]],[812,375,[0,44,21,44]]])for(const game of states)for(const id of game.players.length>4?[game.players[0],game.players.at(-1)]:game.players){
  await page.setViewportSize({width,height});await page.evaluate(({game,id})=>window.testTable('parchis',game,id,['Ana María','Beatriz','Cristina','Daniel','Eugenia','Francisco']),{game,id});
  if(insets)await page.locator('.parchis-screen').evaluate((el,insets)=>{el.style.padding=insets.map(n=>n+'px').join(' ');},insets);
  await page.evaluate(async()=>{for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);});
  const metrics=await page.evaluate(()=>{
   const rect=el=>el.getBoundingClientRect(),inside=r=>r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
   const table=rect(document.querySelector('.parchis-table')),board=rect(document.querySelector('.parchis-table>.parchis-board')),roster=rect(document.querySelector('.rival-roster'));
   const controls=[...document.querySelectorAll('.play-header>button,.parchis-dock button')];
   return {badControls:controls.filter(el=>!inside(rect(el))).map(el=>({action:el.dataset.action,rect:rect(el).toJSON()})),page:document.documentElement.scrollHeight<=innerHeight+1,boardFits:board.left>=table.left&&board.right<=table.right+1&&board.top>=table.top&&board.bottom<=table.bottom+1,offFelt:roster.right<=board.left||roster.left>=board.right||roster.bottom<=board.top||roster.top>=board.bottom,noFelt:!document.querySelector('.parchis-felt'),visible:controls.every(el=>inside(rect(el))),minButton:Math.min(...controls.map(el=>Math.min(rect(el).height,rect(el).width))),boardSize:board.width,pawns:document.querySelectorAll('.parchis-table [data-pawn]').length};
  });
  rows.push({width,height,insets,phase:game.phase,id,...metrics});assert.ok(metrics.page&&metrics.boardFits&&metrics.offFelt&&metrics.noFelt&&metrics.visible,JSON.stringify(rows.at(-1)));assert.ok(metrics.minButton>=44);if(width===390&&height===664&&!insets)assert.ok(metrics.boardSize>=(game.sides===3?300:320),`board ${metrics.boardSize}`);assert.equal(metrics.pawns,4*game.players.length);
  assert.equal(await page.locator('.parchis-table [data-pawn] .avatar-artwork').count(),4*game.players.length);
  if(game.phase==='setup')assert.match(await page.locator('.parchis-round-banner').textContent(),/DOS DADOS/);
  else if(game.phase==='start')assert.match(await page.locator('.parchis-round-banner').textContent(),/SORTEO|DESEMPATE/);
  else assert.deepEqual(await page.locator('.parchis-info .rival-seat').evaluateAll(s=>s.map(el=>el.dataset.playerId)),engine.view(game,id).turnOrder);
  // Pawns are circles; a number's glyphs fill the middle of its text box (digits have no descenders).
  const collisions=await page.locator('.parchis-table').evaluate(el=>{const clear=(p,n)=>{const r=p.width/2,cx=p.left+r,cy=p.top+p.height/2,top=n.top+n.height*.22,bottom=n.bottom-n.height*.22,x=Math.max(n.left,Math.min(cx,n.right)),y=Math.max(top,Math.min(cy,bottom));return Math.hypot(cx-x,cy-y)>=r-.5;};const numbers=[...el.querySelectorAll('.parchis-cell-number')];return [...el.querySelectorAll('[data-pawn]')].flatMap(p=>numbers.filter(n=>!clear(p.getBoundingClientRect(),n.getBoundingClientRect())).map(n=>({pawn:p.dataset.pawn,progress:p.dataset.progress,number:n.textContent})));});assert.deepEqual(collisions,[],JSON.stringify({width,height,phase:game.phase,collisions}));
  if(id==='player-a'&&[320,390,844,1280].includes(width)&&!insets)await page.screenshot({path:`tests/artifacts/parchis/${width}-${height}-${game.players.length}p-${game.diceCount??'x'}d-${game.phase}-${kind}.png`});
 }
 // Play actual controls from an initial state, without supplying client dice values.
 let game=engine.createInitialState(['player-a','player-b'],12),moved=false;
 for(let n=0;n<100&&!moved;n++){
  const id=game.players[game.turn];await page.setViewportSize({width:390,height:664});await page.evaluate(({game,id})=>window.testTable('parchis',game,id),{game,id});
  const legal=engine.view(game,id).legalMoves;
  if(legal.length){await page.locator('.parchis-piece-choices button:not([disabled])').first().click();moved=true;}else await page.locator('[data-action="parchis-roll"]').click();
  game=await page.evaluate(()=>window.tableSnapshot());
 }
 assert.ok(moved);assert.ok(Object.values(game.pieces).flat().some(p=>p>=0));
 await page.locator('[data-action="parchis-zoom-open"]').click();assert.ok(await page.locator('.parchis-zoom').evaluate(el=>el.open));assert.ok(await page.locator('.parchis-zoom .parchis-board').evaluate(el=>el.getBoundingClientRect().width>=700));
 await page.keyboard.press('Escape');assert.equal(await page.locator('.parchis-zoom').evaluate(el=>el.open),false);
 await page.locator('.game-menu-button').click();assert.equal(await page.locator('.scoreboard li').count(),2);await page.keyboard.press('Escape');
 assert.deepEqual(errors,[]);await writeFile(`tests/artifacts/parchis/measurements-${kind}.json`,JSON.stringify(rows,null,2));console.log(`${kind}: ${rows.length} Parchís layouts/POVs on triangle, square, pentagon and hexagon boards, unique cells, every pawn, full game states, 44px controls, actual rolling/moving and magnifier: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
