import {mkdir} from 'node:fs/promises';
await mkdir('tests/artifacts',{recursive:true});
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {canPlaceCinquillo,SPANISH_RANKS,SPANISH_SUITS,getGame} from '../dist/game-core/index.js';
const {chromium,webkit}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const cp=process.env.LAN_JAVA_CP || await readFile('.lan-java-classpath','utf8');
const server=spawn('java',['-cp',cp,'LanServerMain','dist','0']);
server.stderr.on('data',data=>process.stderr.write(data));
let browser;
try {
 const [output]=await once(server.stdout,'data');const hostUrl=String(output).trim();const base=new URL(hostUrl).origin;
 browser=await (process.env.LAN_BROWSER==='webkit'?webkit:chromium).launch();
 const errors=[];
 const settled=pages=>Promise.all(pages.map(p=>p.waitForFunction(()=>!document.querySelector('[data-turn-busy="true"]'))));
 const enter=async(page,url)=>{await page.goto(url);await page.locator('[data-action="join-room"]').waitFor();await page.locator('.menu-setup[data-avatars="ready"]').waitFor();if(await page.locator('[data-action="join-room"]').count()){
  // Avatars are unique per table: take 9 when free, otherwise the first free one.
  await page.locator('[data-action="choose-character"]').click();const nine=page.locator('[data-character="9"]:not(:disabled)');
  await (await nine.count()?nine:page.locator('.character-option:not(:disabled)').first()).click();
  await page.locator('[data-action="join-room"]').click();
 }};
 const context=async name=>{
  const ctx=await browser.newContext({viewport:{width:390,height:664},serviceWorkers:'block',reducedMotion:'reduce'});
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  // Transport coverage includes paused engines without exposing them in the shipping menu.
  await ctx.route('**/app.js*',async route=>{
   let body=await readFile('dist/app.js','utf8');
   body=body.replaceAll('availableGames(listGames())','listGames()').replace('state.gameId || ""; render();','state.gameId || "cinquillo"; render();');
   await route.fulfill({body,contentType:'text/javascript'});
  });
  await ctx.route('**/game-picker.js*',async route=>{
   const body=(await readFile('dist/game-picker.js','utf8')).replace("ids:['parchis','damas-espanolas']","ids:['parchis','damas-espanolas','oca']");
   await route.fulfill({body,contentType:'text/javascript'});
  });
  await ctx.addInitScript(name=>{localStorage.setItem('elteto.profileReady','1');localStorage.setItem('elteto.character','0');localStorage.setItem('elteto.playerName',name);},name);
  await ctx.addInitScript(()=>{window.EltetoActivation={isActivated:()=>true,isOpenAccess:()=>true};});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));return page;
 };
 const host=await context('Ana');await host.goto(hostUrl);
 assert.equal(await host.locator('[data-action="development-admin"]').count(),0);
 assert.equal(await host.locator('#access-form').count(),0);
 await host.locator('[data-action="open-host"]').click();await host.locator('#host-name').fill('Ana');
 await host.locator('[data-action="choose-character"]').click();await host.locator('[data-action="select-character"][data-character="2"]').click();
 assert.equal(await host.locator('input[name="room-mode"]').count(),2);
 assert.equal(await host.locator('input[name="room-mode"]:checked').inputValue(),'lan');
 await host.locator('[data-action="create-room"]').click();
 await host.locator('.room-code').waitFor();const code=(await host.locator('.room-code').textContent()).trim();
 assert.match(code,/^[A-HJ-NP-Z2-9]{8}$/);assert.equal(await host.locator('canvas.invite-qr').count(),1);
 const guest=await context('Bea');await enter(guest,base+'/?join='+code);
 assert.equal(await guest.locator('[data-action="development-admin"]').count(),0);
 await guest.waitForFunction(()=>document.querySelector('#app').textContent.includes('Ya estás en la mesa'));
 assert.equal((await guest.locator('#invite-title').textContent()).trim(),'Aviso!','el invitado ve «Aviso!» en la sala de espera');
 assert.ok(!/\.$/.test((await guest.locator('#lobby-title').textContent()).trim()),'el nombre de la sala no lleva punto final');
 await host.waitForFunction(()=>document.querySelectorAll('.player-row').length===2);
 await host.locator('[data-action="start-game"]').click();
 await guest.locator('.hand .playing-card').first().waitFor();
 assert.equal(await host.locator('[data-player-id="host"] .rival-original').getAttribute('data-character'),'2');
 assert.equal(await guest.locator('.self-seat .rival-original').getAttribute('data-character'),'9');
 assert.equal(await host.locator('.hand .playing-card').count()+await guest.locator('.hand .playing-card').count(),40);
 // Exercise the actual LAN entry page: a correct index.html does not cover lan.html.
 for(const page of [host,guest]) {
  assert.ok(await page.locator('.table-seat:not(.own-seat)').evaluateAll(seats=>{
   const felt=document.querySelector('.table-surface').getBoundingClientRect();
   return seats.every(seat=>{const body=seat.getBoundingClientRect();return body.top+body.height*.5<felt.top;});
  }), 'The rival face must remain above the felt on the LAN page');
  assert.equal(await page.locator('.hand-dock').evaluate(el=>getComputedStyle(el).display),'grid');
  assert.ok(await page.locator('.players-panel .rival-name').evaluateAll(labels=>labels.every(el=>el.getBoundingClientRect().bottom<=document.querySelector('.hand-dock').getBoundingClientRect().top)), 'Player labels stay above the private hand');
  const hand=await page.locator('.hand .playing-card').first().boundingBox();
  assert.ok(hand.y>=0 && hand.y+hand.height<=664, 'Full-size own cards stay visible in the compact mobile viewport');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1),'LAN screen needs no vertical page scrolling');
  assert.ok(await page.locator('.hand .playing-card').evaluateAll(async cards=>{
   await Promise.all(cards.map(card=>card.querySelector('img')?.decode()));
   return cards.every(card=>{const rect=card.getBoundingClientRect();return Math.abs(rect.width/rect.height-208/319)<.02;});
  }));
  await page.locator('[data-action="open-table-zoom"]').click();
  assert.ok(await page.locator('.board-zoom').evaluate(el=>el.open && getComputedStyle(el).position==='fixed'));
  await page.locator('[data-action="close-table-zoom"]').click();
  await page.evaluate(()=>scrollTo(0,0));
 }
 await guest.screenshot({path:`tests/artifacts/lan-mobile-${process.env.LAN_BROWSER||'chromium'}.png`,fullPage:true});
 for(let i=0;i<8;i++){
  await settled([host,guest]);
  const activePages=[];
  for(const p of [host,guest])if(await p.locator('.self-seat.active-seat').count())activePages.push(p);
  assert.equal(activePages.length,1,'exactly one player has the turn, including a mandatory pass');
  const active=activePages[0];
  const previous=await host.locator('.history li').count();
  // Every card is selectable now. The test chooses a legal move from public
  // table positions and its own hand, without relying on production hints.
  const keys=await active.locator('.cinquillo-board [data-table-key]').evaluateAll(els=>els.map(el=>el.dataset.tableKey));
  const table=Object.fromEntries(SPANISH_SUITS.flatMap(suit=>{const ranks=keys.filter(key=>key.startsWith(suit+':')).map(key=>SPANISH_RANKS.indexOf(key.split(':')[1]));return ranks.length?[[suit,{low:Math.min(...ranks),high:Math.max(...ranks)}]]:[];}));
  const hand=await active.locator('.hand .playing-card').evaluateAll(els=>els.map(el=>el.dataset.cardKey));
  const key=hand.find(key=>{const [suit,rank]=key.split(':');return canPlaceCinquillo(table,{suit,rank});});
  if(key)await active.locator(`.hand [data-card-key="${key}"]`).click();else await active.locator('[data-action="cinquillo-pass"]').click();
  await host.waitForFunction(n=>document.querySelectorAll('.history li').length>n,previous);
  await guest.waitForFunction(n=>document.querySelectorAll('.history li').length>n,previous);
 }
 const guestCards=await guest.locator('.hand .playing-card').count();await guest.reload();
 await guest.locator('.hand .playing-card').first().waitFor();assert.equal(await guest.locator('.hand .playing-card').count(),guestCards);
 assert.equal(await host.locator('.table-seat').count(),2);
 assert.equal(await host.locator('.own-seat').count(),0);
 await host.locator('.game-menu-button').click();
 await host.locator('[data-action="leave-room"]').click();
 await guest.getByText('Hasta la próxima.',{exact:true}).waitFor();
 assert.equal(await guest.locator('[data-action="open-host"]').count(),0);
 // Open another LAN table using the unchanged generic transport, now choosing Mus.
 // Leaving the table returns the host to "Crear partida" with the name kept.
 await host.locator('#host-name').waitFor();
 await host.locator('#host-name').fill('Ana');
 await host.locator('.game-category:has(input[value="mus"]) summary').click();await host.locator('input[value="mus"]').check();
 await host.locator('[data-action="create-room"]').click();
 const musCode=(await host.locator('.room-code').textContent()).trim();
 assert.notEqual(musCode,code,'cada mesa tiene una invitación distinta');
 const old=await context('Enlace antiguo');await enter(old,base+'/?join='+code);
 await old.waitForFunction(()=>document.querySelector('#app').textContent.includes('otra mesa'));
 await enter(guest,base+'/?join='+musCode);
 const c=await context('Cris'),d=await context('Dani');
 await enter(c,base+'/?join='+musCode);await enter(d,base+'/?join='+musCode);
 await host.waitForFunction(()=>document.querySelectorAll('.player-row').length===4);
 await host.locator('[data-action="start-game"]').click();
 for(const p of [host,guest,c,d]) {
  await p.locator('.hand .playing-card').first().waitFor();
  assert.equal(await p.locator('.hand .playing-card').count(),4);
  assert.equal(await p.locator('.mus-seat').count(),4);
  assert.equal(await p.locator('.mus-seat[data-position="self"]').count(),1);
  assert.equal(await p.locator('.mus-seat:not([data-position="self"]) .playing-card').count(),0);
 }
 const pages=[host,guest,c,d];
 const actor=async action=>{
  for(let attempt=0;attempt<100;attempt++){
   for(const p of pages) if(await p.locator(`[data-action="${action}"]:not([disabled])`).count())return p;
   await new Promise(r=>setTimeout(r,100));
  }
  throw Error('No actor for '+action);
 };
 await (await actor('mus-no')).locator('[data-action="mus-no"]').click();
 await host.waitForFunction(()=>document.querySelector('.mus-context h2')?.textContent==='GRANDE');
 await (await actor('mus-bet')).locator('[data-action="mus-bet"]').click();
 for(let i=0;i<50;i++) {await new Promise(r=>setTimeout(r,10));if((await Promise.all(pages.map(p=>p.locator('[data-action="mus-accept"]').count()))).some(Boolean))break;}
 await (await actor('mus-accept')).locator('[data-action="mus-accept"]').click();
 for(const p of pages) await p.waitForFunction(()=>document.querySelector('.mus-context h2')?.textContent==='CHICA');
 await host.locator('.game-menu-button').click();
 await host.locator('[data-action="leave-room"]').click();
 for(const p of [guest,c,d]) await p.getByText('Hasta la próxima.',{exact:true}).waitFor();
 // The same room, QR, messages and reconnection path also carry a public board game.
 await host.locator('#host-name').waitFor();await host.locator('#host-name').fill('Ana');
 await host.locator('.game-category:has(input[value="parchis"]) summary').click();await host.locator('input[value="parchis"]').check();await host.locator('[data-action="create-room"]').click();
 const boardCode=(await host.locator('.room-code').textContent()).trim();await enter(guest,base+'/?join='+boardCode);await enter(c,base+'/?join='+boardCode);await enter(d,base+'/?join='+boardCode);
 await host.waitForFunction(()=>document.querySelectorAll('.player-row').length===4);await host.locator('[data-action="start-game"]').click();
 for(const p of [host,guest,c,d]){await p.locator('.parchis-table [data-pawn]').first().waitFor();assert.equal(await p.locator('.parchis-table [data-pawn]').count(),16);}
 let moved=0;
 for(let step=0;step<100&&(step<16||moved<2);step++){
  await settled([host,guest,c,d]);
  // Consecutive blocked rolls can legitimately have identical public text.
  // Observe the received render instead of requiring a different log message.
  for(const p of [host,guest,c,d])await p.evaluate(()=>{window.parchisUpdated=false;window.parchisObserver?.disconnect();window.parchisObserver=new MutationObserver(()=>{window.parchisUpdated=true;window.parchisObserver.disconnect();});window.parchisObserver.observe(document.querySelector('#app'),{childList:true});});
  let acted=false;
  for(const p of [host,guest,c,d]){
   const roll=p.locator('[data-action="parchis-roll"]:not([disabled])'),move=p.locator('.parchis-piece-choices button:not([disabled])');
   if(await roll.count()){await roll.click();acted=true;break;}
   if(await move.count()){await move.first().click();moved++;acted=true;break;}
  }
  assert.ok(acted,'Exactly the active player can roll or choose a legal piece');
  for(const p of [host,guest,c,d])await p.waitForFunction(()=>window.parchisUpdated);
  for(const p of [guest,c,d])assert.equal(await host.locator('.parchis-die').getAttribute('data-roll-id'),await p.locator('.parchis-die').getAttribute('data-roll-id'));
  for(const p of [guest,c,d])assert.equal(await host.locator('.parchis-die').getAttribute('data-result'),await p.locator('.parchis-die').getAttribute('data-result'));
 }
 assert.ok(moved>=2);
 const before=await guest.locator('.parchis-table [data-pawn]').evaluateAll(els=>els.map(el=>[el.dataset.pawn,el.style.left,el.style.top]));
 await guest.reload();await guest.locator('.parchis-table [data-pawn]').first().waitFor();
 assert.deepEqual(await guest.locator('.parchis-table [data-pawn]').evaluateAll(els=>els.map(el=>[el.dataset.pawn,el.style.left,el.style.top])),before);
 await host.locator('.game-menu-button').click();await host.locator('[data-action="leave-room"]').click();await guest.getByText('Hasta la próxima.',{exact:true}).waitFor();
 console.log('Parchís LAN: initial dice, rolls, legal moves, board synchronization and reload/reconnection: OK');
 for(const gameId of ['oca','damas-espanolas']){
  await host.locator('#host-name').waitFor();await host.locator('#host-name').fill('Ana');
  await host.locator(`.game-category:has(input[value="${gameId}"]) summary`).click();await host.locator(`input[value="${gameId}"]`).check();await host.locator('[data-action="create-room"]').click();
  const invitation=(await host.locator('.room-code').textContent()).trim();await enter(guest,base+'/?join='+invitation);
  await host.waitForFunction(()=>document.querySelectorAll('.player-row').length===2);await host.locator('[data-action="start-game"]').click();
  for(const p of [host,guest]){await p.locator('.catalog-surface').waitFor();assert.ok(await p.locator('.catalog-surface').evaluate(el=>el.scrollHeight<=el.clientHeight+1&&el.scrollWidth<=el.clientWidth+1));}
  if(gameId==='oca'){
   for(const p of [host,guest]){assert.equal(await p.locator('.catalog-surface .goose-cell').count(),63);assert.equal(await p.locator('.catalog-surface .goose-board').evaluate(el=>getComputedStyle(el).display),'block');}
   await host.locator('[data-roll-sequence]').click();await guest.waitForFunction(()=>document.querySelector('.parchis-die').dataset.rollId==='1');
   assert.equal(await host.locator('.parchis-die').getAttribute('data-result'),await guest.locator('.parchis-die').getAttribute('data-result'));
   const positions=p=>p.locator('.catalog-surface [data-goose-player]').evaluateAll(els=>els.map(el=>[el.dataset.goosePlayer,el.dataset.position]));assert.deepEqual(await positions(host),await positions(guest));
  }else{
   const engine=getGame(gameId);let board=engine.createInitialState(['a','b'],22);
   for(const [p,id] of [[host,'a'],[guest,'b']]){
    const move=engine.view(board,id).moves[0];await p.locator(`.catalog-surface [data-square="${move.path[0]}"]`).click();
    assert.ok((await p.locator('.catalog-dock .checkers-cancel').boundingBox()).height<=44);
    await p.locator(`.catalog-surface [data-square="${move.path[1]}"]`).click();board=engine.applyAction(board,id,{type:'move',path:move.path});
    const target=move.path[1];for(const q of [host,guest])await q.waitForFunction(target=>!!document.querySelector(`.catalog-surface [data-checker-at="${target}"]`),target);
   }
   assert.equal(await host.locator('.catalog-surface .checker-last-move').count(),1);
  }
  await host.locator('.game-menu-button').click();await host.locator('[data-action="leave-room"]').click();await guest.getByText('Hasta la próxima.',{exact:true}).waitFor();
 }
 // Salir de una partida de dos avisa y da la victoria a quien se queda.
 {
  await host.locator('#host-name').waitFor();await host.locator('#host-name').fill('Ana');
  await host.locator('.game-category:has(input[value="damas-espanolas"]) summary').click();await host.locator('input[value="damas-espanolas"]').check();await host.locator('[data-action="create-room"]').click();
  const exitCode=(await host.locator('.room-code').textContent()).trim();await enter(guest,base+'/?join='+exitCode);
  await host.waitForFunction(()=>document.querySelectorAll('.player-row').length===2);await host.locator('[data-action="start-game"]').click();
  await guest.locator('.catalog-surface').waitFor();await host.locator('.catalog-surface').waitFor();
  await guest.locator('.game-menu-button').click();await guest.locator('[data-action="leave-room"]').click();
  await guest.getByText('Hasta la próxima.',{exact:true}).waitFor();
  await host.locator('.forfeit-notice').waitFor();
  assert.match(await host.locator('.forfeit-notice').innerText(),/Bea ha salido de la partida[\s\S]*Victoria para ti/);
  assert.match(await host.locator('.catalog-surface').innerText(),/Ana gana|gana/i);
  await host.locator('.game-menu-button').click();await host.locator('[data-action="leave-room"]').click();
 }
 console.log('Damas y oca LAN: compact controls, complete boards, public roll and opponent movement synchronized across both POVs: OK');
 assert.deepEqual(errors,[]);
 console.log('Mus LAN: cuatro navegadores, 16 cartas privadas, decisión de mus, envite y siguiente lance: OK');
 console.log('Navegadores separados sin recursos externos: QR, reparto, ocho turnos, recarga y cierre: OK');
} finally {await browser?.close();server.kill();}
