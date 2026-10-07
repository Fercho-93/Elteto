// Actual engine states exercise end-of-hand flow, team privacy and compact Mus layouts.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {cinquilloEngine,musEngine,canPlaceCinquillo} from '../dist/game-core/index.js';
const {chromium,webkit}=await import('playwright');
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.FLOW_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
await mkdir('tests/artifacts/flow',{recursive:true});
const errors=[],measurements=[];
try {
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 for(const count of [2,3,4,5,6]) {
  let game=cinquilloEngine.createInitialState(['a','b','c','d','e','f'].slice(0,count),count*17);
  const before={...game.scores};
  for(let i=0;i<400&&!game.handWinner;i++){const id=game.players[game.turn],card=game.hands[id].find(c=>canPlaceCinquillo(game.table,c,game.ruleset));game=cinquilloEngine.applyAction(game,id,card?{type:'play',card}:{type:'pass'});}
  assert.ok(game.handWinner);
  for(const id of game.players) {
   await page.setViewportSize({width:390,height:664});
   await page.evaluate(({game,id})=>window.testTable('cinquillo',game,id),{game,id});
   assert.ok(await page.locator('.hand-result').evaluate(el=>el.open));
   const deltas=await page.locator('.result-scores tbody tr').evaluateAll(rows=>rows.map(row=>[row.querySelector('th').textContent,Number(row.children[1].textContent),Number(row.children[2].textContent)]));
   for(const [name,delta,total] of deltas){const player=game.players[['Ana','Bea','Cris','Dani','Eva','Fer'].findIndex(n=>name.startsWith(n))];assert.equal(delta,game.scores[player]-before[player]);assert.equal(total,game.scores[player]);}
   assert.equal(await page.locator('.hand-result [data-action="cinquillo-next-hand"]').count(),id===game.handWinner?1:0);
   await page.locator('.hand-result header [data-action="close-hand-result"]').click();
   await page.evaluate(({game,id})=>window.testTable('cinquillo',game,id),{game,id});
   assert.equal(await page.locator('.hand-result').evaluate(el=>el.open),false,'Closed results stay closed on live updates');
   if(id===game.handWinner) {
    await page.locator('.game-menu-button').click();await page.locator('.game-menu [data-action="open-hand-result"]').click();
    assert.ok(await page.locator('.hand-result').evaluate(el=>el.open));
    await page.screenshot({path:`tests/artifacts/flow/cinquillo-result-${count}-${kind}.png`});
    await page.locator('.hand-result [data-action="cinquillo-next-hand"]').click();
    const next=await page.evaluate(()=>window.tableSnapshot());assert.equal(next.handNumber,game.handNumber+1);assert.deepEqual(next.scores,game.scores);assert.equal(await page.locator('.hand-result').count(),0);
   }
  }
  let finished=game;
  for(let i=0;i<2000&&!finished.finished;i++){
   if(finished.handWinner)finished=cinquilloEngine.applyAction(finished,finished.handWinner,{type:'next-hand'});
   else{const id=finished.players[finished.turn],card=finished.hands[id].find(c=>canPlaceCinquillo(finished.table,c,finished.ruleset));finished=cinquilloEngine.applyAction(finished,id,card?{type:'play',card}:{type:'pass'});}
  }
  assert.ok(finished.finished&&finished.winner);
  await page.evaluate(game=>window.testTable('cinquillo',game,game.winner),finished);
  assert.ok(await page.locator('.hand-result h2').textContent().then(text=>text.includes('gana la partida')));
  assert.equal(await page.locator('[data-action="cinquillo-next-hand"]').count(),0);
  assert.ok(await page.locator('.hand-result [data-action="leave-room"]').isVisible());
  await page.screenshot({path:`tests/artifacts/flow/cinquillo-final-${count}-${kind}.png`});
  await page.locator('.hand-result header [data-action="close-hand-result"]').click();
 }
 const ids=['a','b','c','d'],initial=musEngine.createInitialState(ids,7);
 let discard=initial;for(const id of ids)discard=musEngine.applyAction(discard,id,{type:'mus',wantsMus:true});
 let betting=musEngine.applyAction(initial,'a',{type:'mus',wantsMus:false});
 const pending=musEngine.applyAction(betting,musEngine.view(betting,'a').turnPlayer,{type:'bet',amount:2});
 let showdown=betting;for(let i=0;i<100&&showdown.phase!=='showdown'&&!showdown.finished;i++)showdown=musEngine.applyAction(showdown,musEngine.view(showdown,'a').turnPlayer,{type:'pass'});
 assert.equal(showdown.phase,'showdown');
 let final=initial;
 for(let i=0;i<100&&!final.finished;i++){
  const v=musEngine.view(final,'a');
  final=musEngine.applyAction(final,v.turnPlayer,final.phase==='mus'?{type:'mus',wantsMus:false}:final.phase==='showdown'?{type:'next-hand'}:final.betting?.pendingBet?{type:'accept'}:{type:'ordago'});
 }
 assert.ok(final.finished);
 for(const [width,height,insets] of [[320,568],[360,640],[390,664],[390,844],[430,932],[640,360],[667,375],[844,390],[700,600],[1280,800],[390,664,[0,8,34,8]],[844,390,[0,44,21,44]],[812,375,[0,44,21,44]]])for(const game of [initial,discard,betting,pending,showdown,final])for(const id of ids){
  await page.setViewportSize({width,height});
  await page.evaluate(({game,id})=>window.testTable('mus',game,id,['Ana María de la Mesa','Beatriz','Cristina','Daniel']),{game,id});
  if(insets)await page.locator('.mus-screen').evaluate((el,insets)=>{el.style.padding=insets.map(n=>n+'px').join(' ');},insets);
  await page.evaluate(async()=>{for(let i=0;i<3;i++)await new Promise(requestAnimationFrame);});
  const metrics=await page.evaluate(()=>{
   const rect=el=>el.getBoundingClientRect(),felt=rect(document.querySelector('.table-surface')),inside=r=>r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
   const cards=[...document.querySelectorAll('.hand .playing-card,.mus-decisions button,.mus-decisions input')];
   const offFelt=rect(document.querySelector('.rival-roster')).bottom<felt.top;
   const board=[...document.querySelectorAll('.table-center .reveal-card,.table-center .mus-phase,.mus-score')].every(el=>{const r=rect(el);return r.left>=felt.left+5&&r.right<=felt.right-5&&r.top>=felt.top+5&&r.bottom<=felt.bottom-5;});
   const badBoard=board?[]:[...document.querySelectorAll('.table-center .reveal-card,.table-center .mus-phase,.mus-score')].map(el=>({class:el.className,rect:rect(el).toJSON(),felt:felt.toJSON()}));
   const proportions=[...document.querySelectorAll('.table-center .reveal-card')].every(el=>Math.abs(rect(el).height/rect(el).width-319/208)<.03);
   return {badBoard,proportions,offFelt,board,visible:cards.every(el=>inside(rect(el))),page:document.documentElement.scrollHeight<=innerHeight+1,count:document.querySelectorAll('.rival-original').length,companion:[...document.querySelectorAll('.rival-team')].filter(el=>el.textContent.includes('Compi')).length,minButton:Math.min(...[...document.querySelectorAll('.mus-decisions button')].map(el=>rect(el).height))};
  });
  measurements.push({width,height,phase:game.phase,id,...metrics});
  assert.ok(metrics.proportions&&metrics.offFelt&&metrics.board&&metrics.visible&&metrics.page,JSON.stringify(measurements.at(-1)));assert.equal(metrics.count,4);assert.equal(metrics.companion,1);assert.ok(metrics.minButton>=44);
  assert.equal(await page.locator('.revealed-hands .reveal-card').count(),game.phase==='showdown'||game.finished?16:0);
  if(id==='a'&&[390,844].includes(width))await page.screenshot({path:`tests/artifacts/flow/mus-${game.finished?'finished':game.phase}-${width}-${height}-${kind}.png`});
 }
 await writeFile(`tests/artifacts/flow/measurements-${kind}.json`,JSON.stringify(measurements,null,2));
 assert.deepEqual(errors,[]);console.log(`${kind}: complete Cinquillo hands for 2–6 players, public score deltas, winner-only continuation, final results; ${measurements.length} Mus phase/POV/layout cases, teams and privacy: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
