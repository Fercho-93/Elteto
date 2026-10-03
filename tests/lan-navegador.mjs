import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
const cp=process.env.LAN_JAVA_CP || await readFile('.lan-java-classpath','utf8');
const server=spawn('java',['-cp',cp,'LanServerMain','dist','0']);
server.stderr.on('data',data=>process.stderr.write(data));
let browser;
try {
 const [output]=await once(server.stdout,'data');const hostUrl=String(output).trim();const base=new URL(hostUrl).origin;
 browser=await chromium.launch();
 const errors=[];
 const context=async name=>{
  const ctx=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await ctx.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  await ctx.addInitScript(name=>localStorage.setItem('elteto.playerName',name),name);
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));return page;
 };
 const host=await context('Ana');await host.goto(hostUrl);
 await host.locator('[data-action="open-host"]').click();await host.locator('#host-name').fill('Ana');
 await host.locator('[data-action="create-room"]').click();
 await host.locator('.room-code').waitFor();const code=(await host.locator('.room-code').textContent()).trim();
 assert.match(code,/^[A-HJ-NP-Z2-9]{8}$/);assert.equal(await host.locator('canvas.invite-qr').count(),1);
 const guest=await context('Bea');await guest.goto(base+'/?join='+code);
 await guest.waitForFunction(()=>document.querySelector('#app').textContent.includes('Ya estás en la mesa'));
 await host.waitForFunction(()=>document.querySelectorAll('.player-row').length===2);
 await host.locator('[data-action="start-game"]').click();
 await guest.locator('.hand .playing-card').first().waitFor();
 assert.equal(await host.locator('.hand .playing-card').count()+await guest.locator('.hand .playing-card').count(),52);
 for(let i=0;i<8;i++){
  let active;
  for(const p of [host,guest])if(await p.locator('.game-controls').textContent().then(s=>s.includes('Juega una carta')))active=p;
  assert.ok(active,'a player has the turn');
  const previous=await host.locator('.history li').count();const cards=active.locator('.hand .playing-card:not([disabled])');
  if(await cards.count())await cards.first().click();else await active.locator('[data-action="cinquillo-pass"]').click();
  await host.waitForFunction(n=>document.querySelectorAll('.history li').length>n,previous);
  await guest.waitForFunction(n=>document.querySelectorAll('.history li').length>n,previous);
 }
 const guestCards=await guest.locator('.hand .playing-card').count();await guest.reload();
 await guest.locator('.hand .playing-card').first().waitFor();assert.equal(await guest.locator('.hand .playing-card').count(),guestCards);
 assert.equal(await host.locator('.table-players span').count(),2);
 await host.locator('[data-action="leave-room"]').click();
 await guest.locator('[data-action="open-join"]').waitFor();
 assert.deepEqual(errors,[]);
 console.log('Navegadores separados sin recursos externos: QR, reparto, ocho turnos, recarga y cierre: OK');
} finally {await browser?.close();server.kill();}
