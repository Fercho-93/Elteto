import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {chromium,webkit} from 'playwright';
import {cinquilloEngine,canPlaceCinquillo} from '../dist/game-core/index.js';
const fixture=(await readFile(new URL('./table-navegador.mjs',import.meta.url),'utf8')).match(/const fixture = `([\s\S]*?)`;/)[1];
const out=new URL('./artifacts/layout/',import.meta.url);await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;const file=path==='/'?'index.html':path.slice(1);let data=await readFile(new URL('../dist/'+file,import.meta.url));if(file==='app.js')data=Buffer.from(data+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':'text/html');res.end(data);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await (process.env.LAYOUT_BROWSER==='webkit'?webkit:chromium).launch();
const results=[];
try {
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 for(const [width,height] of [[320,568],[360,640],[390,664],[390,844],[430,932],[699,844],[700,844],[844,390],[915,412],[1280,800],[640,360],[667,375],[700,600],[844,699],[844,700]]) {
  await page.setViewportSize({width,height});
  for(const count of [2,3,4,5,6])for(const phase of ['deal','middle','full']) {
   let game=cinquilloEngine.createInitialState(['a','b','c','d','e','f'].slice(0,count),17),moves=0;
   if(phase==='middle')for(let n=0;n<200&&moves<18&&!game.handWinner;n++){const id=game.players[game.turn],card=game.hands[id].find(c=>canPlaceCinquillo(game.table,c,game.ruleset));game=cinquilloEngine.applyAction(game,id,card?{type:'play',card}:{type:'pass'});if(card)moves++;}
   if(phase==='full')game.table=Object.fromEntries(['oros','copas','espadas','bastos'].map(suit=>[suit,{low:0,high:9}]));
   await page.evaluate(game=>window.testTable('cinquillo',game,game.players[game.turn],['Alejandra Fernanda','José Manuel','Cristina','Francisco Javier','María del Carmen','Sebastián']),game);
   const metrics=await page.evaluate(()=>{
    const rect=el=>el.getBoundingClientRect(),inside=r=>r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1;
    const overlap=(a,b)=>a.left<b.right-.5&&a.right>b.left+.5&&a.top<b.bottom-.5&&a.bottom>b.top+.5;
    const hand=rect(document.querySelector('.hand')),table=rect(document.querySelector('.table-surface')),dock=rect(document.querySelector('.hand-dock'));
    const endpoints=[...document.querySelectorAll('.game-table .endpoint')].map(rect);
    const board=[...document.querySelectorAll('.game-table .endpoint,.game-table .lane-next,.game-table .suit-lane>b')].map(rect);
    const facesVisible=[...document.querySelectorAll('.table-seat')].every(seat=>{const r=rect(seat),character=Number(seat.querySelector('[data-character]').dataset.character),x=r.left+r.width*(seat.dataset.direction==='left'?.35:seat.dataset.direction==='right'?.65:.5),y=r.top+r.height*(character<5?.43:.47);return document.elementFromPoint(x,y)?.closest('[data-player-id]')===seat;});
    const labels=[...document.querySelectorAll('.game-table .seat-label')].map(rect);
    const badBoard=board.filter(r=>!inside(r)||r.left<table.left+4||r.right>table.right-4||r.bottom>table.bottom-4||r.bottom>dock.top);
    return {facesVisible,pageHeight:document.documentElement.scrollHeight,handVisible:inside(hand),minCard:endpoints.length?Math.min(...endpoints.map(r=>r.width)):0,tableFits:!badBoard.length,badBoard:badBoard.map(r=>r.toJSON()),labelFits:labels.every(inside),labelOverlap:labels.some((a,i)=>labels.slice(i+1).some(b=>overlap(a,b))),labelCoversGame:labels.some(a=>board.some(b=>overlap(a,b))),endpointOverlap:endpoints.some((a,i)=>endpoints.slice(i+1).some(b=>overlap(a,b))),minButton:Math.min(...[...document.querySelectorAll('.play-header button,.hand-dock button:not(.playing-card)')].map(el=>Math.min(rect(el).width,rect(el).height)))};
   });
   results.push({width,height,count,phase,...metrics});
   if(phase==='middle' && [2,4,6].includes(count) && [320,390,844,1280].includes(width)) {await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));await page.screenshot({path:fileURLToPath(new URL(`${width}-${height}-${count}-${process.env.LAYOUT_BROWSER||'chromium'}.png`,out)),fullPage:true});}
  }
 }
 await writeFile(new URL(`measurements-${process.env.LAYOUT_BROWSER||'chromium'}.json`,out),JSON.stringify(results,null,2));
 console.log(JSON.stringify({cases:results.length,handVisible:results.filter(r=>r.handVisible).length,tableFits:results.filter(r=>r.tableFits).length,pageFits:results.filter(r=>r.pageHeight<=r.height+1).length,labelOverlap:results.filter(r=>r.labelOverlap).length,labelCoversGame:results.filter(r=>r.labelCoversGame).length,endpointOverlap:results.filter(r=>r.endpointOverlap).length,minButton:Math.min(...results.map(r=>r.minButton)),errors}));
 console.log('Failures:',JSON.stringify(results.filter(r=>!r.handVisible||!r.tableFits||r.pageHeight>r.height+1||r.labelOverlap||r.labelCoversGame||r.endpointOverlap).map(({badBoard,...row})=>row)));
 assert.deepEqual(errors,[]);
 const failures=results.filter(r=>!r.handVisible||!r.tableFits||!r.labelFits||!r.facesVisible||r.pageHeight>r.height+1||r.labelOverlap||r.labelCoversGame||r.endpointOverlap||r.minButton<44);
 assert.equal(failures.length,0,JSON.stringify(failures.slice(0,4)));
}finally{await browser.close();await new Promise(r=>server.close(r));}
