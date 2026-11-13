// Cada mesa se ve entera en móviles habituales: ni el tapete ni la página se desplazan.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {getGame,nextBotMove} from '../dist/game-core/index.js';
import {AVAILABLE_GAME_IDS} from '../dist/game-picker.js';
const {chromium,webkit}=await import('playwright');
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const types={js:'text/javascript',css:'text/css',png:'image/png',webp:'image/webp',svg:'image/svg+xml',jpg:'image/jpeg'};
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',types[file.split('.').pop()]||'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.FIT_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
const failures=[];let cases=0;
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 const ids=['a','b','c','d','e','f','g','h'];
 for(const id of AVAILABLE_GAME_IDS){
  const engine=getGame(id);
  for(const n of [...new Set([engine.minPlayers,4,engine.maxPlayers])].filter(n=>n>=engine.minPlayers&&n<=engine.maxPlayers)){
   let game;try{game=engine.createInitialState(ids.slice(0,n),7);}catch{continue;}
   const states=[game];
   for(let i=0;i<40&&!game.finished;i++){const move=nextBotMove(engine,game,game.players,()=>0.37);if(!move)break;try{game=engine.applyAction(game,move.playerId,move.action);}catch{break;}if([3,12,39].includes(i))states.push(game);}
   for(const [width,height] of [[375,667],[390,664],[390,844],[430,740]]){
    await page.setViewportSize({width,height});
    for(const [step,state] of states.entries()){
     await page.evaluate(({id,state})=>window.testTable(id,state,'a'),{id,state});
     await page.evaluate(()=>Promise.all([...document.images].map(img=>img.decode().catch(()=>{}))));
     await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.evaluate(()=>new Promise(requestAnimationFrame));
     cases++;
     const result=await page.evaluate(()=>{const out=[];if(document.documentElement.scrollHeight>innerHeight+1)out.push(`página ${document.documentElement.scrollHeight}>${innerHeight}`);
      for(const el of document.querySelectorAll('.catalog-surface,.catalog-melds,.mus-felt,.game-table')){if(el.closest('dialog'))continue;if(el.scrollHeight>el.clientHeight+2)out.push(`${el.className.split(' ')[0]} ${el.scrollHeight}>${el.clientHeight}`);}
      return out;});
     if(result.length)failures.push(`${id} ${n}j ${width}x${height} paso ${step}: ${result.join(', ')}`);
    }
   }
  }
 }
}finally{await browser.close();await new Promise(r=>server.close(r));}
assert.deepEqual(failures,[],failures.join('\n'));
console.log(`${kind}: ${cases} mesas de los ${AVAILABLE_GAME_IDS.length} juegos caben enteras en móvil, sin desplazar tapete ni página: OK`);
