import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {getGame,botTurnDelay} from '../dist/game-core/index.js';
import {GOOSE_PATH} from '../dist/board-games.js';
import {chromium,webkit} from 'playwright';
assert.equal(GOOSE_PATH.length,63);assert.equal(new Set(GOOSE_PATH.map(p=>p.join(','))).size,63);
for(let i=1;i<63;i++)assert.equal(Math.abs(GOOSE_PATH[i][0]-GOOSE_PATH[i-1][0])+Math.abs(GOOSE_PATH[i][1]-GOOSE_PATH[i-1][1]),1);
assert.ok(botTurnDelay('oca')>=3200);assert.ok(botTurnDelay(checkersId())>=3200);
function checkersId(){return getGame('damas-espanolas').id;}assert.ok(botTurnDelay('mus')>=2000);
const oca=getGame('oca'),checkers=getGame('damas-espanolas');
let initial=oca.createInitialState(['a','b','c','d'],22);
let rolled=oca.applyAction(initial,'a',{type:'roll',expectedRoll:0});
assert.equal(rolled.lastRoll.sequence,1);assert.equal(rolled.lastRoll.route[0],1);assert.equal(rolled.lastRoll.route.at(-1),rolled.positions.a);
assert.throws(()=>oca.applyAction(rolled,rolled.players[rolled.turn],{type:'roll',expectedRoll:0}));
const penalty={...initial,penalties:{...initial.penalties,a:1}};assert.equal(oca.applyAction(penalty,'a',{type:'roll'}).lastRoll,undefined);
// Overshooting 63 has an explicit return path rather than a jump backwards.
for(let seed=1;seed<100;seed++){const game={...initial,seed,positions:{...initial.positions,a:62}},next=oca.applyAction(game,'a',{type:'roll'});if(next.roll>1){assert.equal(next.lastRoll.route[1],63);assert.equal(next.lastRoll.route[2],62);break;}}
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1]+`
window.delayDice=()=>{const apply=state.host.applyLocalAction;window.diceCalls=0;state.host.applyLocalAction=action=>{window.diceCalls++;setTimeout(()=>apply(action),250);};};
window.redrawBoard=()=>renderGame();
`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.BOARD_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
await mkdir('tests/artifacts/boards',{recursive:true});
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'}),errors=[],measurements=[];
 page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 const show=async(id,game,player=game.players[game.turn])=>page.evaluate(({id,game,player})=>window.testTable(id,game,player),{id,game,player});
 for(const [width,height] of [[320,568],[390,664],[390,844],[430,932],[667,375],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});
  let game=checkers.createInitialState(['a','b'],22);await show('damas-espanolas',game);
  const geometry=()=>page.evaluate(()=>{const rect=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {table:rect('.catalog-surface'),board:rect('.checkers-stage'),dock:rect('.catalog-dock')};});
  const before=await geometry();assert.ok(await page.locator('.catalog-surface .checker-square').last().evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.checkers-stage').getBoundingClientRect();return a.right<=b.right+1&&a.bottom<=b.bottom+1;}),'All checker squares fit inside the board');const move=checkers.view(game,'a').moves[0];
  await page.locator(`.catalog-surface [data-square="${move.path[0]}"]`).click();const selected=await geometry();assert.deepEqual(selected,before,'Selecting a checker never resizes the screen');
  const cancel=page.locator('.catalog-surface .checkers-cancel');assert.ok(await cancel.isVisible());const size=await cancel.boundingBox();assert.ok(size.height<=44&&size.width<=110);
  await cancel.click();assert.deepEqual(await geometry(),before);
  // The complete path of the rival is visible, including multi-captures.
  game=checkers.applyAction(game,'a',{type:'move',path:move.path});const rivalMove=checkers.view(game,'b').moves[0];game=checkers.applyAction(game,'b',{type:'move',path:rivalMove.path});await show('damas-espanolas',game,'a');
  assert.equal(await page.locator('.catalog-surface .checker-last-move').count(),1);assert.match(await page.locator('.catalog-surface .checker-last-move').getAttribute('aria-label'),/Bea/);
  const multi={...game,lastMove:{player:'b',path:[17,35,53],captures:[26,44]}};await show('damas-espanolas',multi,'a');assert.equal((await page.locator('.checker-last-move polyline').first().getAttribute('points')).split(' ').length,3);
  if(width===390&&height===844)await page.screenshot({path:`tests/artifacts/boards/checkers-${kind}.png`});
  for(const count of [2,4]){
   const ids=['a','b','c','d'].slice(0,count);game=oca.createInitialState(ids,22);await show('oca',game);
   assert.equal(await page.locator('.catalog-surface .goose-cell').count(),63);assert.equal(await page.locator('.catalog-surface .goose-cell .goose-art').count(),63);assert.equal(await page.locator('.die-face').count(),6);
   const metrics=await page.evaluate(()=>{const table=document.querySelector('.catalog-surface'),board=document.querySelector('.goose-board'),r=board.getBoundingClientRect(),t=table.getBoundingClientRect(),dock=document.querySelector('.catalog-dock').getBoundingClientRect();return {page:document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1,noScroll:table.scrollHeight<=table.clientHeight+1&&table.scrollWidth<=table.clientWidth+1,fits:r.left>=t.left&&r.right<=t.right+1&&r.top>=t.top&&r.bottom<=t.bottom+1,dockFits:dock.bottom<=innerHeight+1,board:r.toJSON()};});
   measurements.push({width,height,count,...metrics});assert.ok(metrics.page&&metrics.noScroll&&metrics.fits&&metrics.dockFits,JSON.stringify(measurements.at(-1)));
   if(width===390&&height===844&&count===4)await page.screenshot({path:`tests/artifacts/boards/goose-${kind}.png`});
   // All six faces are shared with Parchís, not a unicode symbol.
   for(let value=1;value<=6;value++){await show('oca',{...game,roll:value,lastRoll:{sequence:value,player:'a',value,from:1,to:1+value,route:[1,1+value]}});assert.equal(await page.locator('.parchis-die').getAttribute('data-result'),String(value));assert.equal(await page.locator(`.face-${value} i`).count(),value);}
   await page.locator('[data-action="catalog-zoom"]').click();assert.equal(await page.locator('.catalog-zoom .goose-cell').count(),63);await page.locator('[data-action="catalog-close-zoom"]').click();
  }
 }
 await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'no-preference'});await show('oca',initial);
 await page.evaluate(()=>{window.delayDice();const b=document.querySelector('[data-roll-sequence]');b.click();b.click();b.click();});assert.equal(await page.evaluate(()=>window.diceCalls),1);
 await page.waitForFunction(()=>document.querySelector('.parchis-die').dataset.rollId==='1');assert.ok(await page.locator('.die-flight').evaluate(el=>el.getAnimations().length>0));
 assert.equal(await page.locator('.catalog-screen').getAttribute('data-motion-busy'),'true');
 assert.ok(await page.locator('.catalog-surface [data-goose-player="a"]').evaluate(el=>{const a=el.getAnimations()[0];if(!a)return false;const t=a.currentTime;a.currentTime=0;const start=el.getBoundingClientRect();a.currentTime=a.effect.getTiming().delay+a.effect.getTiming().duration;const end=el.getBoundingClientRect();a.currentTime=t;return Math.abs(start.x-end.x)+Math.abs(start.y-end.y)>1;}));
 assert.equal(await page.locator('.rival-seat[aria-current]').getAttribute('data-player-id'),'a');
 // During a redraw the same action continues instead of replaying from the start.
 await page.evaluate(()=>window.redrawBoard());await page.waitForFunction(()=>document.querySelector('.catalog-screen').dataset.motionBusy==='false');
 assert.equal(await page.locator('.die-cube').evaluate(el=>el.getAnimations().length),0);assert.equal(await page.locator('.oca-dock').getAttribute('aria-busy'),'false');
 // Two POVs consume the same public roll and final positions.
 const current=await page.evaluate(()=>window.tableSnapshot());await show('oca',current,'b');assert.equal(await page.locator('.parchis-die').getAttribute('data-result'),String(current.lastRoll.value));assert.equal(await page.locator('.catalog-surface [data-goose-player="a"]').getAttribute('data-position'),String(current.positions.a));
 // Public cards/tiles travel from the actor, while private hands never animate.
 const domino=getGame('domino'),deal=domino.createInitialState(['a','b','c','d'],22);await show('domino',deal,'a');
 await page.locator('.catalog-hand .domino-tile').first().click();
 assert.ok(await page.locator('.catalog-surface [data-public-piece]').evaluate(el=>el.getAnimations().length>0));
 assert.equal(await page.locator('.catalog-hand').evaluate(el=>el.getAnimations({subtree:true}).length),0);
 await page.evaluate(()=>window.redrawBoard());assert.ok(await page.locator('.catalog-surface [data-public-piece]').evaluate(el=>el.getAnimations().length>0));
 assert.deepEqual(errors,[]);await writeFile(`tests/artifacts/boards/measurements-${kind}.json`,JSON.stringify(measurements,null,2));console.log(`${kind}: stable checkers/last move, 63 illustrated spiral spaces without scrolling, shared dice/lock/bounce, route and two POVs: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
