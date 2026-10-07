import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {chromium,webkit} from 'playwright';
import {listGames} from '../dist/game-core/index.js';

const server=createServer(async(req,res)=>{
  try {
    const file=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';
    const body=await readFile('dist/'+file);
    res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html');
    res.end(body);
  } catch {res.writeHead(404);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const kind=process.env.BOT_BROWSER||'chromium';
const browser=await (kind==='webkit'?webkit:chromium).launch(process.env.BOT_EXECUTABLE?{executablePath:process.env.BOT_EXECUTABLE}:{});
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  // Exercise the already-activated offline host path; activation has its own emulator suite.
  await page.addInitScript(()=>localStorage.setItem('elteto.hostAccess.v1',JSON.stringify({uid:'test-host',active:true})));
  for(const engine of listGames()) {
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.locator('[data-action="open-host"]').click();
    await page.locator('#host-name').fill('Ana');
    await page.locator(`.game-option:has(input[value="${engine.id}"])`).click();
    await page.locator('[data-action="create-room"]').click();
    assert.ok(await page.locator('[data-action="start-game"]').isDisabled());
    await page.getByRole('button',{name:'Completar mesa con IA',exact:true}).click();
    assert.equal(await page.locator('.player-row').count(),engine.maxPlayers);
    assert.equal(await page.locator('.ready-pill').filter({hasText:/^IA$/}).count(),engine.maxPlayers-1);
    await page.locator('[data-action="kick-player"]').first().click();
    assert.equal(await page.locator('.player-row').count(),engine.maxPlayers-1);
    await page.getByRole('button',{name:'Completar mesa con IA',exact:true}).click();
    assert.ok(await page.locator('[data-action="start-game"]').isEnabled());
    if(engine.id==='mus') {
      await mkdir('tests/artifacts',{recursive:true});
      await page.screenshot({path:`tests/artifacts/ia-lobby-${kind}.png`});
      assert.ok(await page.locator('[data-action="start-game"]').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
    }
    await page.locator('[data-action="start-game"]').click();
    await page.locator('.play-header').waitFor();
    if(engine.id==='mus') {
      await page.locator('[data-action="mus-yes"]').click();
      await page.waitForFunction(()=>!document.querySelector('[data-action="mus-yes"]'));
      assert.equal(await page.locator('.error-message').count(),0);
    }
    console.log(`${kind}: ${engine.id}, solo table filled with AI and started OK`);
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();await new Promise(r=>server.close(r));}
