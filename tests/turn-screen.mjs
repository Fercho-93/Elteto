// Network snapshots enter the production host, guest and online callbacks.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {getGame,nextBotMove,parchisEngine,captures15} from '../dist/game-core/index.js';
import {publicTurnEvent} from '../dist/turn-events.js';
import {chromium,webkit} from 'playwright';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1]+`
window.startTurns=(id,game,player)=>{turnSequence.reset();window.testTable(id,game,player);window.sentTurns=0;state.host.applyLocalAction=()=>window.sentTurns++;};
window.emitTurn=(id,game,player,source)=>{const change={kind:'game',gameId:id,playerId:player,players:state.players,view:getGame(id).view(game,player),isHost:source!=='guest'};(source==='guest'?handleGuestChange:source==='online'?onOnlineChange:onHostChange)(change);};
window.turnSnapshot=()=>({phase:turnSequence.phase,event:turnSequence.event,queued:turnSequence.queue.length,view:state.view});
window.redrawTurns=()=>renderGame();
window.cancelTurns=()=>{turnSequence.reset();state.screen='home';renderHome();};
`;
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.TURN_BROWSER||'chromium',browser=await(kind==='webkit'?webkit:chromium).launch(),errors=[];
await mkdir('tests/artifacts/turns',{recursive:true});
try{
 const pages=await Promise.all(['a','b'].map(async()=>{const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.startTurns);return page;}));
 const start=async(id,game)=>Promise.all(pages.map((p,i)=>p.evaluate(({id,game,player})=>window.startTurns(id,game,player),{id,game,player:game.players[i]})));
 const emit=async(id,game)=>Promise.all(pages.map((p,i)=>p.evaluate(({id,game,player,source})=>window.emitTurn(id,game,player,source),{id,game,player:game.players[i],source:i?'guest':'online'})));
 const phase=async(value)=>Promise.all(pages.map(p=>p.waitForFunction(value=>window.turnSnapshot().phase===value,value)));
 const actor=async(id)=>{for(const page of pages)assert.equal(await page.locator('.rival-seat[aria-current]').getAttribute('data-player-id'),id);};
 const geometry=async(page)=>page.evaluate(()=>{const board=document.querySelector('.catalog-surface,.game-table,.parchis-table'),r=board.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};});
 const visibleStory=async()=>{for(const page of pages)assert.ok(await page.locator('.turn-story').evaluate(el=>{const r=el.getBoundingClientRect();return r.width>20&&r.height>20&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1&&getComputedStyle(el).clipPath==='none';}));};
 // Three rapid snapshots are presented in order. Both POVs see the actual actor.
 const domino=getGame('domino');let game=domino.createInitialState(['a','b','c','d'],22);await start('domino',game);
 const snapshots=[],actors=[];for(let n=0;n<3;n++){const move=nextBotMove(domino,game,game.players);actors.push(move.playerId);game=domino.applyAction(game,move.playerId,move.action);snapshots.push(game);}
 const before=await geometry(pages[0]);for(const next of snapshots)await emit('domino',next);
 assert.equal((await pages[0].evaluate(()=>window.turnSnapshot())).view.chain.length,0);await actor(actors[0]);await visibleStory();assert.deepEqual(await geometry(pages[0]),before);
 await pages[0].evaluate(()=>document.querySelector('.catalog-hand button').click());assert.equal(await pages[0].evaluate(()=>window.sentTurns),0);
 for(let n=0;n<3;n++){
  await phase('move');await actor(actors[n]);assert.equal((await pages[0].evaluate(()=>window.turnSnapshot())).view.chain.length,n+1);
  assert.ok(await pages[0].locator('.catalog-surface [data-public-piece]').evaluateAll(els=>els.some(el=>el.getAnimations().length>0)));
  assert.equal(await pages[0].locator('.catalog-hand').evaluate(el=>el.getAnimations({subtree:true}).length),0);
  await phase('result');await actor(actors[n]);assert.deepEqual(await geometry(pages[0]),before);
  if(n<2)await phase('announce');
 }
 await phase('idle');assert.equal((await pages[1].evaluate(()=>window.turnSnapshot())).view.chain.length,3);
 for(const page of pages)assert.ok(await page.locator('.catalog-hand button').evaluateAll(els=>els.every(el=>!el.hasAttribute('data-sequence-locked'))));
 // Selection, movement and the result keep the checker board at the same size.
 const checkers=getGame('damas-espanolas');game=checkers.createInitialState(['a','b'],22);await start('damas-espanolas',game);
 const path=checkers.view(game,'a').moves[0].path;const bounds=await geometry(pages[0]);await pages[0].locator(`.catalog-surface [data-square="${path[0]}"]`).click();assert.deepEqual(await geometry(pages[0]),bounds);
 const cancel=await pages[0].locator('.checkers-cancel').boundingBox();assert.ok(cancel.height<=44&&cancel.width<=110);
 game=checkers.applyAction(game,'a',{type:'move',path});await emit('damas-espanolas',game);await phase('move');await actor('a');assert.deepEqual(await geometry(pages[0]),bounds);await visibleStory();
 assert.equal(await pages[1].locator('.catalog-surface .checker-last-move').count(),1);await phase('result');await actor('a');await phase('idle');
 // Oca uses the shared dice flight before moving, then holds the result/actor.
 const oca=getGame('oca');game=oca.createInitialState(['a','b','c','d'],22);await start('oca',game);const ocaBounds=await geometry(pages[0]);game=oca.applyAction(game,'a',{type:'roll'});await emit('oca',game);await phase('move');await actor('a');await visibleStory();
 for(const page of pages){assert.equal(await page.locator('.catalog-surface .goose-cell').count(),63);assert.equal(await page.locator('.die-face').count(),6);assert.ok(await page.locator('.die-flight').evaluate(el=>el.getAnimations().length>0));assert.ok(await page.locator('.catalog-surface [data-goose-player="a"]').evaluate(el=>el.getAnimations().length>0));}
 await phase('result');await actor('a');assert.deepEqual(await geometry(pages[0]),ocaBounds);await pages[0].screenshot({path:`tests/artifacts/turns/oca-${kind}.png`});await phase('idle');
 // A 20-space Parchís bonus visits every square; capture returns after arrival.
 game=parchisEngine.createInitialState(['a','b','c','d'],22);Object.assign(game,{phase:'bonus',bonuses:[20],die:3,lastRoll:{sequence:1,player:'a',value:3,initial:false,round:1},rollCount:1});game.pieces.a[0]=2;game.pieces.b[0]=5;
 // Yellow square 27 is green progress 5 and is not a safe square.
 await start('parchis',game);const moved=parchisEngine.applyAction(game,'a',{type:'move',piece:0});assert.equal(moved.pieces.b[0],-1);await emit('parchis',moved);await phase('move');await actor('a');await visibleStory();
 for(const page of pages){const timing=await page.locator('.parchis-table [data-pawn="a:0"]').evaluate(el=>{const anim=el.getAnimations()[0];return {frames:anim.effect.getKeyframes().length,duration:anim.effect.getTiming().duration};});assert.equal(timing.frames,21);assert.equal(timing.duration,2600);assert.equal(await page.locator('.parchis-table [data-pawn="b:0"]').evaluate(el=>el.getAnimations()[0].effect.getTiming().delay),2600);}
 await phase('result');await actor('a');await pages[0].screenshot({path:`tests/artifacts/turns/parchis-${kind}.png`});await phase('idle');
 // A captured played card is visible in a public receipt; table cards fly to actor.
 const escoba=getGame('escoba');let capture;
 for(let seed=1;seed<100;seed++){game=escoba.createInitialState(['a','b'],seed);const view=escoba.view(game,'a');for(const card of view.myHand){const value=Number(card.rank)>7?Number(card.rank)-2:Number(card.rank),table=captures15(view.table,15-value)[0];if(table?.length){capture={type:'capture',card:card.id,table};break;}}if(capture)break;}
 assert.ok(capture);await start('escoba',game);const captured=escoba.applyAction(game,'a',capture);await emit('escoba',captured);await phase('move');await actor('a');
 for(const page of pages){assert.equal(await page.locator('.catalog-surface .capture-receipt img').getAttribute('alt'),`${captured.lastPlay.card.rank} de ${captured.lastPlay.card.suit}`);assert.equal(await page.locator('.turn-public-ghost').count(),capture.table.length);assert.equal(await page.locator('.catalog-hand').evaluate(el=>el.getAnimations({subtree:true}).length),0);}
 await phase('result');await actor('a');await phase('idle');
 // Non-catalog card games also have a visible, stable turn announcement.
 for(const id of ['cinquillo','mus']){const engine=getGame(id);game=engine.createInitialState(['a','b','c','d'],22);await start(id,game);const move=nextBotMove(engine,game,game.players),bounds=await geometry(pages[0]);game=engine.applyAction(game,move.playerId,move.action);await emit(id,game);assert.deepEqual(await geometry(pages[0]),bounds);await phase('move');await actor(move.playerId);await visibleStory();const moving=await geometry(pages[0]);await phase('result');assert.deepEqual(await geometry(pages[0]),moving,'The turn story never resizes the current game phase');await phase('idle');}
 // Reduced motion and entering another POV show the current view immediately.
 for(const page of pages)await page.emulateMedia({reducedMotion:'reduce'});game=domino.createInitialState(['a','b','c','d'],22);await start('domino',game);const move=nextBotMove(domino,game,game.players);game=domino.applyAction(game,move.playerId,move.action);await emit('domino',game);assert.equal((await pages[0].evaluate(()=>window.turnSnapshot())).phase,'idle');
 // Leaving during an announcement cancels timers and cannot reopen the game.
 await pages[0].emulateMedia({reducedMotion:'no-preference'});const nextMove=nextBotMove(domino,game,game.players);game=domino.applyAction(game,nextMove.playerId,nextMove.action);await pages[0].evaluate(game=>window.emitTurn('domino',game,'a','host'),game);await pages[0].evaluate(()=>window.cancelTurns());await new Promise(r=>setTimeout(r,500));assert.equal(await pages[0].locator('.catalog-screen').count(),0);
 assert.deepEqual(errors,[]);console.log(`${kind}: ordered network bursts, host/guest POVs, actor through result, locks/privacy, stable damas/Oca, dice, Parchis routes/captures, Escoba and card-game announcements: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
