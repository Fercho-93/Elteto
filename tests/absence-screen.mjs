import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {listGames, getGamePlan, nextBotMove, createRng, getGame, departGame} from '../dist/game-core/index.js';
const {chromium,webkit}=await import('playwright');
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture+'\nwindow.emitGame=view=>receiveGame({kind:"game",view,players:state.players,gameId:state.gameId,playerId:state.playerId});window.setAway=id=>{state.players=state.players.map(p=>p.id===id?{...p,away:true}:p);renderGame();};window.setRole=role=>{state.role=role;renderGame();};');res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.ABSENCE_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch(),errors=[],random=createRng(5);
let games=0;
try{
 const page=await browser.newPage({serviceWorkers:'block',viewport:{width:390,height:844},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 for(const engine of listGames()){
  const sizes=getGamePlan(engine.id).players.filter(n=>n>=engine.minPlayers&&n<=engine.maxPlayers),count=sizes.includes(3)?3:sizes[0],players=Array.from({length:count},(_,i)=>`p${i}`);
  let game=engine.createInitialState(players,13);
  for(let i=0;i<(engine.id==='texas-holdem'?0:12)&&!engine.isOver(game);i++){const m=nextBotMove(engine,game,players,random);if(!m)break;game=engine.applyAction(game,m.playerId,m.action);}
  await page.evaluate(({id,game,me})=>window.testTable(id,game,me),{id:engine.id,game,me:players[0]});
  // Someone is absent: their seat says so, and the host menu offers to skip a turn or expel them.
  await page.evaluate(id=>window.setAway(id),players[1]);
  // The poker table already names absent seats in their own status line.
  const shown=async()=>(await page.locator('.absent-badge').count())+(await page.locator('.poker-seat',{hasText:'Ausente'}).count());
  assert.ok(await shown()>=1,`${engine.id}: shows the absent player`);
  if(await page.locator('.absent-badge').count())assert.equal(await page.locator('.absent-badge').first().textContent(),'Ausente');
  const html=await page.locator('.host-controls').count();assert.ok(html>=1,`${engine.id}: host controls in the menu`);
  assert.ok(await page.locator('.host-kick-list [data-action="host-kick"]').count()>=1,`${engine.id}: can expel`);
  assert.equal(await page.locator('.host-controls [data-action="host-skip-turn"]').count()>=1,true);
  // A guest never sees them.
  await page.evaluate(()=>window.setRole('client'));
  assert.equal(await page.locator('.host-controls').count(),0,`${engine.id}: guests have no host controls`);
  assert.ok(await shown()>=1,`${engine.id}: guests also see who is absent`);
  games++;
 }
 // Parchís: each home carries its player's name, and whoever leaves is announced and marked «Retirado».
 {
  const parchis=getGame('parchis'),ids=['a','b','c','d'],names=['Ana','Bea','Cristina','Dani'];let game=parchis.createInitialState(ids,5);
  await page.evaluate(({game,names})=>window.testTable('parchis',game,'a',names),{game,names});
  await page.evaluate(view=>window.emitGame(view),parchis.view(game,'a'));
  const homes=await page.locator('.parchis-board').first().locator('.parchis-nest text').allTextContents();
  assert.deepEqual([...homes].sort(),names.map(n=>n.toUpperCase()).sort(),'homes show player names, not colours');
  game=departGame('parchis',game,'c','Cristina');
  await page.evaluate(view=>window.emitGame(view),parchis.view(game,'a'));
  await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Cristina ha salido de la partida.');
  await page.locator('.rival-seat[data-player-id="c"] .absent-badge').waitFor();
  assert.equal(await page.locator('.rival-seat[data-player-id="c"] .absent-badge').textContent(),'Retirado');
  assert.equal(await page.locator('.parchis-pawn[data-player-id="c"]').count(),0,'pawns leave with their player');
 }
 assert.deepEqual(errors,[]);
 console.log(`${kind}: ${games} juegos muestran «Ausente» y dan al anfitrión saltar turno y expulsar: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
