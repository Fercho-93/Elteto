// Recorrido de la interfaz con dos «móviles» en Chromium contra los emuladores de Auth y
// Firestore: crear sala con internet, leer el QR con la cámara interna, empezar y jugar cuatro turnos.
// No forma parte de `npm test` (necesita Playwright y Chromium). Uso:
//   npm run build:web
//   PLAYWRIGHT_MODULE=/ruta/a/playwright/index.mjs \
//   npx firebase emulators:exec --project elteto-fercho93 --only auth,firestore "node tests/online-navegador.mjs"
import { createServer } from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { createActivationCode, activationCodeHash } from '../apps/web/activation-code.js';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : "playwright");
const root = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(root, "dist");
const TYPES = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".webmanifest": "application/json", ".json": "application/json" };

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.join(dist, pathname === "/" ? "index.html" : pathname);
    let body = await fs.readFile(file);
    if (pathname === '/firebase-config.js') body = Buffer.from(body.toString().replaceAll('elteto-fercho93', 'demo-elteto'));
    res.setHeader("Content-Type", TYPES[path.extname(file)] || "application/octet-stream");
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();

async function movil(label) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  // El SDK se sirve desde node_modules en lugar de gstatic, y la app apunta a los emuladores.
  await context.route(/https:\/\/www\.gstatic\.com\/firebasejs\/[^/]+\/([\w-]+\.js)$/, async (route) => {
    const name = route.request().url().split("/").pop();
    route.fulfill({ contentType: "text/javascript", body: await fs.readFile(path.join(root, "node_modules/firebase", name), "utf8") });
  });
  await context.addInitScript(() => { globalThis.__ELTETO_FIREBASE_EMULATOR = { auth: "http://127.0.0.1:9099", firestoreHost: "127.0.0.1", firestorePort: 8080 }; });
  const page = await context.newPage();
  const log = [];
  page.on("pageerror", (error) => log.push(`pageerror ${error.message}`));
  page.on("console", (message) => { if (message.type() === "error") log.push(message.text()); });
  const text = () => page.evaluate(() => document.querySelector("#app").innerText);
  const waitText = (pattern, timeout = 15000) => page.waitForFunction((source) => new RegExp(source, "i").test(document.querySelector("#app").innerText), pattern.source, { timeout })
    .catch(async (error) => { console.log(`  [${label}] pantalla:\n${await text()}\n${log.join("\n")}`); throw error; });
  return { label, page, context, log, text, waitText };
}

try {
  const env=await initializeTestEnvironment({projectId:'demo-elteto',firestore:{host:'127.0.0.1',port:8080}});
  const invitation=createActivationCode(),hash=await activationCodeHash(invitation);
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'activationCodes',hash),{status:'unused',createdAt:Timestamp.now(),expiresAt:null,usedBy:null,usedAt:null}));
  await env.cleanup();
  const host = await movil("anfitrión");
  await host.page.goto(base);
  await host.page.click('[data-action="open-host"]');
  await fs.mkdir(path.join(root,'tests/artifacts/access'),{recursive:true});
  for(const width of [320,390,768]) {
    await host.page.setViewportSize({width,height:844});
    assert.ok(await host.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'formulario de acceso sin desplazamiento horizontal');
    await host.page.screenshot({path:path.join(root,`tests/artifacts/access/activar-${width}.png`),fullPage:true});
  }
  await host.page.setViewportSize({width:390,height:844});
  await host.page.fill('#access-email',`browser-${Date.now()}@elteto.test`);
  await host.page.fill('#access-password','Prueba-12345');
  await host.page.fill('#activation-code',invitation);
  await host.page.locator('#access-form [type="submit"]').click();
  await host.waitText(/Tu mesa está lista/);
  await host.page.click('[data-action="open-host"]');
  await host.page.fill("#host-name", "Ana");
  await host.page.fill("#room-name", "Mesa online");
  await host.page.click('label.game-option:has(input[value="cinquillo"])');
  await host.page.fill("#host-name", "Ana");
  await host.page.click('[data-action="create-room"]');
  await host.page.click('[data-action="new-invite"]');
  await host.waitText(/Código de la sala/);
  const code = (await host.page.locator(".room-code").textContent()).trim();
  assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(await host.page.locator("canvas.invite-qr").count(), 1);
  console.log("  ok  el anfitrión abre una sala con internet:", code);

  const guest = await movil("invitado");
  await guest.page.goto(base);
  await guest.page.click('[data-action="open-join"]');
  await guest.page.fill("#join-name", "Bea");
  // Feed the host's actual QR into a real video MediaStream; do not mock decoding.
  const qrImage = await host.page.locator('canvas.invite-qr').evaluate(canvas=>canvas.toDataURL());
  await guest.page.evaluate(async image=>{
    const qr=new Image();qr.src=image;await qr.decode();
    const frame=document.createElement('canvas');frame.width=1280;frame.height=720;
    const ctx=frame.getContext('2d');const paint=()=>{ctx.fillStyle='#bbb';ctx.fillRect(0,0,1280,720);ctx.drawImage(qr,460,180,360,360);};paint();
    window.__qrCameraTracks=[];
    navigator.mediaDevices.getUserMedia=async()=>{const stream=frame.captureStream(8),timer=setInterval(paint,120);window.__qrCameraTracks=stream.getTracks();for(const track of stream.getTracks()){const stop=track.stop.bind(track);track.stop=()=>{clearInterval(timer);stop();};}return stream;};
  },qrImage);
  await guest.page.click('[data-action="scan-offer"]');
  await guest.waitText(/Conectado a la sala/);
  await host.waitText(/Bea/);
  assert.equal(await guest.page.locator('.scan-overlay').count(),0);
  assert.ok(await guest.page.evaluate(()=>window.__qrCameraTracks.every(track=>track.readyState==='ended')));
  console.log("  ok  la invitada escanea el QR de la sala, conserva su nombre y libera la cámara");

  // Entrar por el enlace de invitación (QR) con una tercera persona.
  const third = await movil("tercera");
  await third.page.goto(`${base}?join=${code}`);
  await third.waitText(/Conectado a la sala/);
  await host.waitText(/3 \/ 6/);
  await third.page.click('[data-action="leave-room"]');
  await host.waitText(/2 \/ 6/);
  console.log("  ok  el enlace de invitación mete en la sala y salir deja la plaza libre");

  await host.page.click('[data-action="start-game"]');
  await host.page.locator(".hand .playing-card").first().waitFor();
  await guest.page.locator(".hand .playing-card").first().waitFor();
  const hostCards = await host.page.locator(".hand .playing-card").count();
  const guestCards = await guest.page.locator(".hand .playing-card").count();
  assert.ok(hostCards >= 20 && guestCards >= 20, `manos repartidas (${hostCards}/${guestCards})`);
  console.log(`  ok  partida en marcha: ${hostCards} y ${guestCards} cartas`);

  // Juega quien tiene el turno: una carta si puede colocarla; si no, pasa.
  const turnos = [host, guest];
  for (let i = 0; i < 4; i++) {
    const jugador = await (async () => {
      for (const p of turnos) {
        if (await p.page.locator(".self-seat.active-seat").count()) return p;
      }
      return null;
    })();
    assert.ok(jugador, "alguien tiene el turno");
    const antes = await host.page.locator(".history li").count().catch(() => 0);
    const carta = jugador.page.locator(".hand .playing-card:not([disabled])").first();
    if (await carta.count()) await carta.click(); else await jugador.page.click('[data-action="cinquillo-pass"]');
    await host.page.waitForFunction((n) => document.querySelectorAll(".history li").length > n, antes, { timeout: 15000 });
    await guest.page.waitForTimeout(300);
  }
  console.log("  ok  cuatro turnos jugados desde la interfaz");

  await host.page.click('[data-action="open-game-menu"]');
  await host.page.click('[data-action="leave-room"]');
  await guest.waitText(/Hasta la próxima/);
  assert.equal(await guest.page.locator('[data-action="open-host"]').count(),0);
  console.log("  ok  al cerrar la sala el invitado pierde el acceso a la partida");
  for (const p of [host, guest, third]) assert.deepEqual(p.log.filter((line) => !/favicon|Failed to load resource/.test(line)), [], `${p.label}: errores en consola`);
  console.log("Interfaz de salas online: OK");
} finally {
  await browser.close();
  server.close();
}
