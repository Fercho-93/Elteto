// Run after build:web, with Playwright installed. Optional: PLAYWRIGHT_MODULE,
// PLAYWRIGHT_CHANNEL (e.g. chrome), CATALOG_SCREENSHOT (output image path).
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://localhost").pathname.replace(/^\/Elteto\//, "");
    const file = path.join(dist, pathname || "index.html");
    res.setHeader("Content-Type", types[path.extname(file)] || "application/octet-stream");
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || undefined });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  const base = `http://127.0.0.1:${server.address().port}/Elteto/`;
  await page.goto(base);
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator(".catalog-card").count(), 6);
  assert.equal(await page.locator(".catalog-card:not(:disabled)").count(), 2);
  assert.equal(await page.locator(".catalog-card:disabled").count(), 4);
  if (process.env.CATALOG_SCREENSHOT) await page.screenshot({ path: process.env.CATALOG_SCREENSHOT, fullPage: true });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `No overflow at ${width}px`);
  }
  await page.locator('[data-filter="cards"]').click();
  assert.equal(await page.locator(".catalog-card").count(), 2);
  assert.equal(await page.locator('[data-filter="cards"]').getAttribute("aria-pressed"), "true");
  assert.equal(await page.locator('[data-filter="cards"]').evaluate(el => el === document.activeElement), true);
  await page.locator('[data-game-id="mus"]').click();
  assert.equal(await page.locator('input[name="game"]:checked').inputValue(), "mus");
  await page.locator("#host-name").fill("Ana");
  await page.locator('[data-action="create-room"]').click();
  assert.match(await page.locator("#app").innerText(), /Faltan jugadores \(1\/4\)/);
  await page.locator('[data-action="leave-room"]').click();
  await page.locator('[data-filter="boards"]').click();
  assert.equal(await page.locator(".catalog-card").count(), 4);
  assert.equal(await page.locator(".catalog-card:not(:disabled)").count(), 0);
  await page.locator('[data-action="all-games"]').click();
  assert.equal(await page.locator(".catalog-card").count(), 6);
  await page.locator('[data-game-id="cinquillo"]').click();
  assert.equal(await page.locator('input[name="game"]:checked').inputValue(), "cinquillo");
  await page.locator("#host-name").fill("Luis");
  await page.locator('[data-action="create-room"]').click();
  assert.match(await page.locator("#app").innerText(), /Faltan jugadores \(1\/2\)/);
  await page.locator('[data-action="leave-room"]').click();
  await page.locator('[data-action="open-join"]').click();
  await page.locator("#offer-code").waitFor();
  await page.locator('[data-action="back"]').click();
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await page.waitForFunction(() => navigator.serviceWorker.controller);
  await page.waitForFunction(async () => (await caches.open("elteto-shell-v7")).match("./assets/elteto-characters.jpg"));
  await context.setOffline(true);
  await page.reload();
  await page.locator(".catalog-card").first().waitFor();
  await page.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
  assert.equal(await page.locator(".catalog-card").count(), 6);
  await context.close();
  for (const isHost of [false, true]) {
    const lan = await browser.newContext({ serviceWorkers: "block" });
    await lan.addInitScript(host => { window.ELTETO_LAN = { ...(host ? { hostKey: "test-host" } : {}) }; }, isHost);
    const lanPage = await lan.newPage();
    await lanPage.goto(base);
    assert.equal(await lanPage.locator(".catalog-card:not(:disabled)").count(), isHost ? 1 : 0);
    assert.equal(await lanPage.locator('[data-action="open-host"]').count(), isHost ? 1 : 0);
    await lan.close();
  }
  assert.deepEqual(errors, []);
  console.log("Catálogo: filtros, selección, salas existentes, LAN, tamaños móviles y recursos offline: OK");
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
