// Render real public views through the production application; fixtures never ship.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {listGames,getGame,buildCardMaterial,captures15} from '../dist/game-core/index.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture=(await readFile('tests/table-navegador.mjs','utf8')).match(/const fixture = `([\s\S]*?)`;/)[1]+'\nwindow.testHostForm = () => renderHostForm(); window.testJoinForm = () => renderJoinForm();';
const server=createServer(async(req,res)=>{try{const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';let body=await readFile('dist/'+file);if(file==='app.js')body=Buffer.from(body+fixture);res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html');res.end(body);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.CATALOG_BROWSER||'chromium',browser=await (kind==='webkit'?webkit:chromium).launch();
await mkdir('tests/artifacts/catalog',{recursive:true});
const errors=[],results=[],names=['Ana María de la Mesa','Beatriz','Cristina','Daniel','Eva','Fernando','Gabriel','Héctor'];
try{
 const page=await browser.newPage({serviceWorkers:'block',reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.testTable);
 for(const [width,height] of [[320,568],[390,844],[844,390],[1280,800]]){
  await page.setViewportSize({width,height});await page.evaluate(()=>window.testHostForm());
  assert.equal(await page.locator('.game-category').count(),2);
  assert.deepEqual(await page.locator('input[name="game"]').evaluateAll(inputs=>inputs.map(i=>i.value).sort()),['damas-espanolas','mus','parchis','texas-holdem']);
  for(const id of ['parchis','damas-espanolas','mus','texas-holdem']){
   const category=page.locator('.game-category').filter({has:page.locator(`input[value="${id}"]`)});
   await category.locator('summary').click();
   await category.locator(`input[value="${id}"]`).check();
   assert.equal(await page.locator('input[name="game"]:checked').inputValue(),id);
   assert.equal(await page.locator('.game-category.chosen').count(),1);
   assert.equal(await category.evaluate(el=>el.open),false);
   const name=({'damas-espanolas':'Damas','texas-holdem':'Póker',mus:'Mus',parchis:'Parchís'})[id];
   assert.ok((await category.locator('.category-title').textContent()).endsWith(': '+name));
  }
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#host-name').fill('Nombre conservado');
  await page.evaluate(()=>window.testHostForm());
  assert.equal(await page.locator('#host-name').inputValue(),'Nombre conservado');
  assert.equal(await page.locator('input[name="game"]:checked').inputValue(),'texas-holdem');
  if(width===390)await page.screenshot({path:`tests/artifacts/catalog/game-picker-${kind}.png`,fullPage:true});
 }
 // Character picker preserves typed identity, exposes all ten choices, and persists locally.
 for(const width of [320,390,844]){
  await page.setViewportSize({width,height:844});await page.evaluate(()=>window.testHostForm());
  const hostBrand=await page.locator('.menu-header .menu-brand').innerHTML();
  await page.locator('#host-name').fill('Ana sin perder nombre');
  assert.equal(await page.locator('#host-name').inputValue(),'Ana sin perder nombre','initial fill '+width);
  await page.locator('#room-name').fill('Mesa elegida');
  for(let character=0;character<10;character++){
   await page.locator('[data-action="choose-character"]').click();
   assert.equal(await page.locator('.character-option').count(),10);
   await page.locator(`.character-option[data-character="${character}"]`).click();
   await page.locator('.character-dialog').waitFor({state:'detached'});
   assert.equal(await page.locator('#host-name').inputValue(),'Ana sin perder nombre',JSON.stringify({width,character}));
   assert.equal(await page.locator('#room-name').inputValue(),'Mesa elegida');
   assert.equal(await page.evaluate(()=>localStorage.getItem('elteto.character')),String(character));
  }
  await page.evaluate(()=>window.testJoinForm());
  assert.equal(await page.locator('.menu-header .menu-brand').innerHTML(),hostBrand);
  assert.equal(await page.locator('.topbar-tag').count(),0);
  assert.ok(!/fruta y pique/i.test(await page.locator('#app').innerText()));
  assert.ok(await page.locator('.menu-setup').isVisible());
  if(width===390)await page.screenshot({path:`tests/artifacts/catalog/join-${kind}.png`,fullPage:true});
  assert.equal(await page.locator('#join-name').inputValue(),'Ana sin perder nombre');
  await page.locator('#join-name').fill('Bea');
  await page.locator('[data-action="choose-character"]').click();
  assert.ok(await page.locator('.character-option[data-character="9"]').getAttribute('aria-pressed')==='true');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390)await page.screenshot({path:`tests/artifacts/catalog/character-picker-${kind}.png`,fullPage:true});
  await page.locator('.character-option[data-character="4"]').click();
  assert.equal(await page.locator('#join-name').inputValue(),'Bea');
 }
 for(const engine of listGames().filter(g=>!['cinquillo','mus','parchis'].includes(g.id))){
  for(const count of [...new Set([engine.minPlayers,engine.maxPlayers])]){
   const ids=Array.from({length:count},(_,i)=>`p${i}`),game=engine.createInitialState(ids,22),active=game.players[game.turn];
   for(const [width,height] of (process.env.CATALOG_QUICK?[[390,664]]:[[320,568],[390,664],[390,844],[667,375],[844,390],[1280,800]])){
    await page.setViewportSize({width,height});
    await page.evaluate(({id,game,active,names})=>window.testTable(id,game,active,names),{id:engine.id,game,active,names});
    await page.evaluate(async()=>{for(let i=0;i<4;i++)await new Promise(requestAnimationFrame);});
    const metrics=await page.evaluate(()=>{
     const rect=el=>el.getBoundingClientRect(),inside=r=>r.left>=-1&&r.top>=-1&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1;
     const header=rect(document.querySelector('.play-header')),roster=document.querySelector('.players-panel')?rect(document.querySelector('.players-panel')):null,table=rect(document.querySelector('.catalog-surface')),dock=rect(document.querySelector('.catalog-dock'));
     const overlap=(a,b)=>a.left<b.right-1&&a.right>b.left+1&&a.top<b.bottom-1&&a.bottom>b.top+1;
     const active=rect(document.querySelector('.active-seat .rival-original'));
     return {page:document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1,inside:[header,roster,table,dock,active].filter(Boolean).every(inside),separate:(!roster||!overlap(roster,table))&&!overlap(dock,table),boardWidth:table.width,boardHeight:table.height,dockHeight:dock.height,buttons:[...document.querySelectorAll('.play-header button,.catalog-options button')].every(el=>rect(el).height>=43),brokenImages:[...document.images].filter(img=>!img.complete||!img.naturalWidth).map(img=>img.src)};
    });
    results.push({id:engine.id,count,width,height,...metrics});assert.ok(metrics.page&&metrics.inside&&metrics.separate&&metrics.buttons,JSON.stringify(results.at(-1)));assert.ok(metrics.boardHeight>=70,JSON.stringify(results.at(-1)));
    // The three common surfaces remain usable at every size.
    await page.locator('.game-menu-button').click();assert.equal(await page.locator('.game-menu [data-action="leave-room"]').textContent(),'Salir de la partida');assert.ok(await page.locator('.game-menu').evaluate(el=>el.open));if(engine.id==='texas-holdem')assert.equal(await page.locator('.game-menu [data-action="poker-break"]').textContent(),'Ausentarme y volver');
    await page.locator('.game-menu details').first().locator('summary').click();
    const rules=await page.locator('.game-menu a').getAttribute('href');assert.ok((await page.request.get(new URL(rules,page.url()).href)).ok());
    await page.locator('.game-menu [data-action="close-game-menu"]').click();
    await page.locator('[data-action="catalog-zoom"]').click();assert.ok(await page.locator('.catalog-zoom').evaluate(el=>el.open));await page.locator('[data-action="catalog-close-zoom"]').click();
    if(count===engine.minPlayers&&[390,844].includes(width)&&height!==664)await page.screenshot({path:`tests/artifacts/catalog/${engine.id}-${width}-${kind}.png`});
   }
   // Exercise a real user action through the same click handler used by guests.
   const view=engine.view(game,active);await page.evaluate(({id,game,active,names})=>window.testTable(id,game,active,names),{id:engine.id,game,active,names});
   let expected;
   if(game.id==='domino'){const action=view.options[0].action;expected=engine.applyAction(game,active,action);await page.locator(`[data-action="catalog-select-tile"][data-tile-id="${action.tile}"]`).click();assert.equal(await page.locator('.catalog-options').textContent(), '');}
   else if(view.validCards?.length){const card=view.validCards[0];expected=engine.applyAction(game,active,{type:'play',card});await page.locator(`[data-action="catalog-select-card"][data-card-id="${card}"]`).click();}
   else if(view.moves?.length){const path=view.moves[0].path;expected=engine.applyAction(game,active,{type:'move',path});for(const square of path)await page.locator(`.catalog-surface [data-square="${square}"]`).click();}
   else if(game.id==='escoba'){
    const card=view.myHand[0],value=Number(card.rank)>7?Number(card.rank)-2:Number(card.rank),table=captures15(view.table,15-value)[0]||[];
    await page.locator(`[data-action="catalog-select-card"][data-card-id="${view.myHand[1].id}"]`).click();
    await page.locator(`[data-action="catalog-select-card"][data-card-id="${card.id}"]`).click();assert.equal(await page.locator('.catalog-hand .is-selected').count(),1);
    for(const id of table)await page.locator(`[data-action="catalog-table-card"][data-card-id="${id}"]`).click();
    expected=engine.applyAction(game,active,{type:'capture',card:card.id,table});await page.locator('[data-action="catalog-choice"]').click();
   }else if(game.id==='mentiroso'){
    const cards=view.myHand.slice(0,2).map(c=>c.id);for(const id of cards)await page.locator(`[data-action="catalog-select-card"][data-card-id="${id}"]`).click();
    await page.locator('#catalog-rank').selectOption('3');expected=engine.applyAction(game,active,{type:'play-facedown',cards,rank:'3'});await page.locator('[data-action="catalog-choice"]').click();
   }else{const index=view.options.findIndex(o=>!['selection','singleCard','rankInput','amountInput','tableSelection'].some(k=>o.action[k]));if(index>=0){expected=engine.applyAction(game,active,view.options[index].action);await page.locator(`[data-action="catalog-choice"][data-index="${index}"]`).click();}}
   if(expected)assert.deepEqual(await page.evaluate(()=>window.tableSnapshot()),expected);
  }
 }
 // Closing combinations uses the actual selection UI, then exposes the result.
 for(const id of ['chinchon','remigio','continental']){
  const engine=getGame(id),game=engine.createInitialState(['p0','p1'],3),cards=buildCardMaterial(id==='chinchon'?'spanish-40':id==='remigio'?'spanish-poker-54':'french-jokers-54',2);
  const suit=id==='continental'?'picas':'oros',sequence=id==='chinchon'?['1','2','3','4','5','6','7']:['A','2','3','4','5','6','7','8','9','10'];
  const hand=id==='continental'?cards.filter(c=>c.pack===0&&['K','Q'].includes(c.rank)&&c.suit!=='treboles'&&c.suit!=='joker'):sequence.map(rank=>cards.find(c=>c.pack===0&&c.suit===suit&&c.rank===rank));
  const discard=cards.find(c=>c.pack===0&&c.suit!=='joker'&&c.suit!==suit&&c.rank==='2');game.hands.p0=id==='continental'?hand:[...hand,discard];game.turn=0;game.phase='discard';
  await page.setViewportSize({width:390,height:664});await page.evaluate(({id,game,names})=>window.testTable(id,game,'p0',names),{id,game,names});
  const selected=id==='continental'?hand:[discard];for(const card of selected)await page.locator(`[data-action="catalog-select-card"][data-card-id="${card.id}"]`).click();
  await page.getByRole('button',{name:id==='continental'?'Exponer contrato':'Cerrar con esta carta',exact:true}).click();
  let next=await page.evaluate(()=>window.tableSnapshot());assert.ok(['show','result'].includes(next.phase));
  while(['show','layoff'].includes(next.phase)){await page.evaluate(({id,game,names})=>window.testTable(id,game,game.players[game.turn],names),{id,game:next,names});await page.locator('[data-action="catalog-choice"]').first().click();next=await page.evaluate(()=>window.tableSnapshot());}
  assert.equal(next.phase,'result');assert.ok(await page.locator('.catalog-result').isVisible());assert.equal(await page.locator('.catalog-instruction').textContent(),'');
  await page.screenshot({path:`tests/artifacts/catalog/${id}-result-${kind}.png`});
  await page.evaluate(({id,game,names})=>window.testTable(id,game,game.players[game.turn],names),{id,game:next,names});
  await page.getByRole('button',{name:'Siguiente mano',exact:true}).click();assert.equal((await page.evaluate(()=>window.tableSnapshot())).handNumber,2);
 }
 assert.deepEqual(errors,[]);await writeFile(`tests/artifacts/catalog/measurements-${kind}.json`,JSON.stringify(results,null,2));
 console.log(`${kind}: ${results.length} catalog layouts, rules/menu/zoom, two categories / four-game selection, engine-backed actions: OK`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
