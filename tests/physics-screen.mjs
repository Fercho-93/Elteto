import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {getGame,parchisEngine,nextBotMove} from '../dist/game-core/index.js';
import {DICE_DURATION,PAWN_STEP,CHECKER_STEP,CAPTURE_FADE,PIECE_TRANSFER,gooseFlights} from '../dist/game-physics.js';
import {pawnPlacement,pawnPoint,boardAxis} from '../dist/parchis-board.js';
import {speechText} from '../dist/table-speech.js';
import {chromium,webkit} from 'playwright';
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1]+`
window.startPhysics=(id,game,player)=>{turnSequence.reset();window.testTable(id,game,player);};
window.redrawPhysics=()=>renderGame();
window.emitPhysics=(game)=>onHostChange({kind:'game',gameId:state.gameId,players:state.players,playerId:state.playerId,view:getGame(state.gameId).view(game,state.playerId)});
window.physicsPhase=()=>turnSequence.phase;
window.physicsSnapshot=()=>({game:state.gameId,phase:state.view.phase,hand:state.view.myHand.map(c=>c.id)});
`;
const server=createServer(async(req,res)=>{try{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+name);if(name==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.svg')?'image/svg+xml':name.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.PHYSICS_BROWSER||'chromium',browser=await(kind==='webkit'?webkit:chromium).launch(),errors=[];
await mkdir('tests/artifacts/physics',{recursive:true});
try{
 const pages=await Promise.all(['a','b'].map(async()=>{const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.startPhysics);return page;}));
 const show=async(id,game,reset=true)=>Promise.all(pages.map((page,i)=>page.evaluate(({id,game,player,reset})=>reset?window.startPhysics(id,game,player):window.testTable(id,game,player),{id,game,player:game.players[i],reset})));
 const emit=async game=>Promise.all(pages.map(page=>page.evaluate(game=>window.emitPhysics(game),game)));
 const phase=async phase=>Promise.all(pages.map(page=>page.waitForFunction(phase=>window.physicsPhase()===phase,phase)));
 // Pawn centres agree with the drawn SVG cells across track, goal lane, home and nests.
 let game=parchisEngine.createInitialState(['a','b','c','d'],22);game.lastRoll={sequence:1,player:'a',value:2,initial:false,round:1};game.phase='move';game.die=2;
 for(const page of pages)await page.emulateMedia({reducedMotion:'reduce'});
 for(const progress of [-1,0,3,8,20,38,63,64,70,71]){
  game.pieces.a[0]=progress;await show('parchis',game);
  const [x,y]=pawnPoint(game.colors.a,progress,0),expected={x:boardAxis(x),y:boardAxis(y)};
  for(const page of pages){const delta=await page.locator('.parchis-table [data-pawn="a:0"]').evaluate((el,expected)=>{const svg=el.parentElement.querySelector('svg'),point=new DOMPoint(expected.x,expected.y).matrixTransform(svg.getScreenCTM()),rect=el.getBoundingClientRect();return Math.hypot(point.x-rect.x-rect.width/2,point.y-rect.y-rect.height/2);},expected);assert.ok(delta<.75,`${progress}: counter centred on the SVG board (${delta})`);}
 }
 // A shared square has two separated, aligned counters; movement lands without snapping.
 game.pieces.a=[2,4,-1,-1];await show('parchis',game);const next=parchisEngine.applyAction(game,'a',{type:'move',piece:0});
 for(const page of pages)await page.emulateMedia({reducedMotion:'no-preference'});await show('parchis',next,false);
 for(const page of pages){
  const sample=await page.locator('.parchis-table [data-pawn="a:0"]').evaluate(el=>{const a=el.getAnimations()[0],saved=a.currentTime;a.currentTime=0;const first={left:getComputedStyle(el).left,top:getComputedStyle(el).top};a.currentTime=a.effect.getTiming().delay+a.effect.getTiming().duration;const end=el.getBoundingClientRect().toJSON();a.cancel();const staticRect=el.getBoundingClientRect().toJSON();return {first,end,staticRect};});
  assert.ok(Math.abs(sample.end.x-sample.staticRect.x)<.1&&Math.abs(sample.end.y-sample.staticRect.y)<.1&&Math.abs(sample.end.width-sample.staticRect.width)<.1,'Animation and final stack share coordinates and size');
  await page.locator('.parchis-table [data-pawn^="a:"]').evaluateAll(els=>{for(const el of els)for(const a of el.getAnimations()){a.currentTime=a.effect.getTiming().delay+a.effect.getTiming().duration;a.cancel();}});
  const centreDistance=await page.locator('.parchis-table [data-pawn^="a:"]').evaluateAll(els=>{const [a,b]=els.slice(0,2).map(el=>el.getBoundingClientRect());return Math.hypot(a.x+a.width/2-b.x-b.width/2,a.y+a.height/2-b.y-b.height/2)-Math.max(a.width,b.width);});assert.ok(centreDistance>=0,'Two counters remain side by side, without overlap');
  await page.evaluate(()=>window.redrawPhysics());assert.ok(await page.locator('.parchis-table [data-pawn="a:0"]').evaluate(el=>el.getAnimations()[0].currentTime>0),'Redraw preserves travel progress');
 }
 // Existing domino tiles glide into alignment when a new tile centres the chain.
 const domino=getGame('domino');game=domino.createInitialState(['a','b','c','d'],22);
 const firstMove=nextBotMove(domino,game,game.players);game=domino.applyAction(game,firstMove.playerId,firstMove.action);await show('domino',game);
 let dominoNext,dominoMove;do{dominoMove=nextBotMove(domino,game,game.players);dominoNext=domino.applyAction(game,dominoMove.playerId,dominoMove.action);if(dominoMove.action.type!=='place'){game=dominoNext;await show('domino',game,false);}}while(dominoMove.action.type!=='place');
 await show('domino',dominoNext,false);
 for(const page of pages){assert.equal(await page.locator('.catalog-surface .domino-tile').first().evaluate(el=>el.getAnimations()[0]?.effect.getTiming().duration),PIECE_TRANSFER,'Existing domino tile glides when the chain grows');}
 // A prisoner released by another player's landing travels only after the arrival.
 const goose=getGame('oca');game=goose.createInitialState(['a','b','c','d'],22);
 const die=goose.applyAction(game,'a',{type:'roll'}).roll;game.positions.a=52-die;game.positions.b=52;game.prison='b';
 await show('oca',game);const released=goose.applyAction(game,'a',{type:'roll'}),flights=gooseFlights(game,released);
 assert.deepEqual(flights.map(f=>f.player),['a','b']);assert.equal(flights[1].delay,DICE_DURATION+flights[0].duration);assert.equal(flights[1].duration,PIECE_TRANSFER);
 await show('oca',released,false);
 for(const page of pages){const delay=await page.locator('.catalog-surface [data-goose-player="b"]').evaluate(el=>el.getAnimations()[0]?.effect.getTiming().delay);assert.equal(delay,flights[1].delay,'Prison release is visible after the arriving counter');}
 // Checker victims remain on their own squares until the jumping counter reaches them.
 const checkers=getGame('damas-espanolas');game=checkers.createInitialState(['a','b'],22);game.board=Array(64).fill(0);game.board[41]=1;game.board[34]=-1;game.board[20]=-1;game.board[0]=-1;
 await show('damas-espanolas',game);const move=checkers.view(game,'a').moves.find(m=>m.captures.length===2);assert.ok(move);game=checkers.applyAction(game,'a',{type:'move',path:move.path});await show('damas-espanolas',game,false);
 for(const page of pages){const victims=await page.locator('.catalog-surface .checker-captured').evaluateAll(els=>els.map(el=>{const a=el.getAnimations()[0];return {delay:a.effect.getTiming().delay,duration:a.effect.getTiming().duration};}));assert.deepEqual(victims.map(v=>v.delay),[CHECKER_STEP,CHECKER_STEP*2]);assert.ok(victims.every(v=>v.duration===CAPTURE_FADE));assert.ok(await page.locator('.catalog-surface .piece-travelling').evaluate(el=>getComputedStyle(el).boxShadow.includes('inset')));}
 // Both dice games always reserve one small 44px button right beside the cube.
 for(const id of ['oca','parchis'])for(const [width,height] of [[320,568],[390,844],[844,390]]){
  const engine=getGame(id);game=engine.createInitialState(['a','b','c','d'],22);for(const page of pages)await page.setViewportSize({width,height});await show(id,game);const next=engine.applyAction(game,'a',{type:'roll'});await show(id,next,false);
  for(const page of pages){const metrics=await page.evaluate(()=>{const die=document.querySelector('.parchis-die').getBoundingClientRect(),button=document.querySelector('.oca-dock .catalog-options button,.parchis-actions [data-action="parchis-roll"]').getBoundingClientRect();return {width:button.width,height:button.height,gap:button.left-die.right,sameRow:button.top<die.bottom&&button.bottom>die.top,page:document.documentElement.scrollHeight<=innerHeight+1};});assert.ok(metrics.width<=124&&metrics.height>=44&&metrics.height<=48&&metrics.gap>=0&&metrics.gap<=24&&metrics.sameRow&&metrics.page,JSON.stringify({id,width,height,...metrics}));assert.equal(await page.locator('.die-flight').evaluate(el=>el.getAnimations()[0]?.effect.getTiming().duration),DICE_DURATION);}
 }
 for(const page of pages)await page.setViewportSize({width:390,height:844});
 // Public declaration/pass/challenge speech is identical in two private views.
 const bluff=getGame('mentiroso');game=bluff.createInitialState(['a','b','c','d'],22);await show('mentiroso',game);
 for(const page of pages){await page.locator('.catalog-hand img').first().evaluate(img=>img.decode());await page.evaluate(()=>{window.faces=[...document.querySelectorAll('.catalog-hand img')];window.faceByUrl=new Map(window.faces.map(img=>[img.src,img]));});}
 for(const action of [{type:'play-facedown',cards:game.hands.a.slice(0,2).map(c=>c.id),rank:'5'},{type:'trust'},{type:'challenge'}]){
  const actor=game.players[game.turn];game=bluff.applyAction(game,actor,action);const speeches=game.players.map(p=>bluff.view(game,p).lastSpeech);assert.ok(speeches.every(s=>JSON.stringify(s)===JSON.stringify(speeches[0])));assert.ok(!('cards' in speeches[0]),'Declared ranks never reveal the played faces');
  await emit(game);await phase('move');
  for(const page of pages){assert.equal(await page.locator('.player-speech').getAttribute('data-speaker'),actor);assert.equal(await page.locator('.player-speech').textContent(),speechText(game.lastSpeech));assert.ok(await page.locator('.player-speech').evaluate(el=>el.getAnimations().some(a=>a.effect.getTiming().duration===480)));assert.ok(await page.locator('.catalog-hand img').evaluateAll(els=>els.every(img=>!window.faceByUrl.has(img.src)||window.faceByUrl.get(img.src)===img)),'Existing hand faces keep the decoded image node');if(action.type!=='challenge')assert.equal(await page.locator('.catalog-surface img').count(),0,'Face-down declarations keep rival cards hidden');}
  await phase('result');await phase('idle');
  for(const page of pages){await page.evaluate(()=>{window.faceByUrl=new Map([...document.querySelectorAll('.catalog-hand img')].map(img=>[img.src,img]));});assert.equal(await page.locator('.player-speech').evaluate(el=>el.getAnimations().length),0,'An idle redraw never replays a speech bubble');}
 }
 await pages[1].screenshot({path:`tests/artifacts/physics/mentiroso-${kind}.png`});
 // Keep all familiar faces painted at every next animation frame during repeated redraws.
 for(const id of ['cinquillo','mus','escoba','tute','mentiroso']){
  const engine=getGame(id),players=['a','b','c','d'].slice(0,engine.minPlayers);game=engine.createInitialState(players,22);await show(id,game);
  for(const page of pages){await page.evaluate(async()=>{await Promise.all([...document.querySelectorAll('img')].filter(img=>img.src.includes('/assets/decks/')).map(img=>img.decode()));window.retainedFaces=[...document.querySelectorAll('img')].filter(img=>img.src.includes('/assets/decks/'));});const paint=await page.evaluate(async()=>{for(let i=0;i<12;i++){window.redrawPhysics();await new Promise(requestAnimationFrame);const failed=window.retainedFaces.filter(img=>!img.isConnected||!img.complete||!img.naturalWidth);if(failed.length)return {i,snapshot:window.physicsSnapshot(),root:document.querySelector('[data-game]')?.dataset.game,failed:failed.map(img=>({src:img.src,connected:img.isConnected,complete:img.complete,width:img.naturalWidth,matches:[...document.querySelectorAll('img')].filter(other=>other.src===img.src).map(other=>({same:img===other,complete:other.complete,width:other.naturalWidth}))}))};}return null;});assert.equal(paint,null,`${id}: no blank cached faces on turn redraw ${JSON.stringify(paint)}`);}
 }
 assert.deepEqual(errors,[]);console.log(`${kind}: SVG/counter alignment, shared-square landing, delayed checker captures, compact adjacent dice/1650ms physics, public speech in two POVs, stable decoded faces in five card games: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
