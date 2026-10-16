// Recorrido de la interfaz con dos «móviles» en Chromium contra los emuladores de Auth y
// Firestore: crear sala con internet, leer el QR con la cámara interna, elegir personajes, empezar y reconectar.
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
    // Keep legacy Cinquillo transport coverage with a catalog fixture used only by this test.
    if (pathname === '/app.js') body = Buffer.from(body.toString().replaceAll('availableGames(listGames())','listGames()'));
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
  await context.addInitScript(() => { localStorage.setItem('elteto.profileReady','1');localStorage.setItem('elteto.playerName','Prueba');localStorage.setItem('elteto.character','0'); globalThis.__ELTETO_FIREBASE_EMULATOR = { auth: "http://127.0.0.1:9099", firestoreHost: "127.0.0.1", firestorePort: 8080 }; });
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
  const developmentCode=createActivationCode(),developmentHash=await activationCodeHash(developmentCode);
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'activationCodes',developmentHash),{status:'unused',kind:'development-admin',createdAt:Timestamp.now(),expiresAt:Timestamp.fromMillis(Date.now()+86400000),usedBy:null,usedAt:null}));
  await env.cleanup();
  const developer=await movil('administrador');
  await developer.page.goto(base+'#admin='+developmentCode);
  await developer.waitText(/Tu mesa está lista/);
  assert.equal(new URL(developer.page.url()).hash,'','enlace privado retirado de la barra');
  assert.equal(await developer.page.locator('input[type="password"]').count(),0);
  await developer.page.click('[data-action="open-host"]');
  await developer.page.locator('#host-name').waitFor();
  await developer.page.reload();
  await developer.page.click('[data-action="open-host"]');
  await developer.page.locator('#host-name').waitFor();
  assert.equal(await developer.page.locator('input[type="password"]').count(),0);
  await developer.context.close();
  console.log('  ok  administrador sin contraseña, enlace retirado y acceso conservado tras recargar');
  const settings=await initializeTestEnvironment({projectId:'demo-elteto',firestore:{host:'127.0.0.1',port:8080}});
  await settings.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'configuration','development'),{enabled:true}));
  const quick=await movil('fuegote');
  await quick.page.goto(base);
  assert.equal(await quick.page.locator('[data-action="development-admin"]').count(),0);
  await quick.page.locator('.fuegote-button').click();
  await quick.page.fill('#host-name','Sin cuenta');
  await quick.page.locator('.game-category:has(input[value="cinquillo"]) summary').click();
  await quick.page.locator('input[value="cinquillo"]').check();
  await quick.page.click('[data-action="create-room"]');
  await quick.page.locator('[data-action="new-invite"]').waitFor();
  assert.equal(await quick.page.locator('input[type="password"]').count(),0);
  await quick.page.click('[data-action="new-invite"]');
  await quick.waitText(/Código de la sala/);
  await quick.page.click('[data-action="leave-room"]');
  await quick.context.close();
  await settings.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'configuration','development'),{enabled:false}));
  await settings.cleanup();
  console.log('  ok  la llama crea la partida sin contraseña ni administrador, también con internet');
  const host = await movil("anfitrión");
  await host.page.goto(base+'#activate='+invitation);
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
  await host.page.locator('[data-action="choose-character"]').click();
  await host.page.locator('[data-action="select-character"][data-character="2"]').click();
  await host.page.fill("#room-name", "Mesa online");
  await host.page.locator('.game-category:has(input[value="cinquillo"]) summary').click();
  await host.page.locator('input[value="cinquillo"]').check();
  await host.page.click('[data-action="create-room"]');
  await host.page.click('[data-action="new-invite"]');
  await host.waitText(/Código de la sala/);
  const code = (await host.page.locator(".room-code").textContent()).trim();
  assert.match(code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(await host.page.locator("canvas.invite-qr").count(), 1);
  console.log("  ok  el anfitrión abre una sala con internet:", code);

  const guest = await movil("invitado");
  // The phone camera opens the QR's link; the guest only confirms name and avatar.
  const inviteLink = new URL(await host.page.locator('.invite-link .code-output').inputValue());
  assert.equal(inviteLink.searchParams.get('join'), code);
  await guest.page.goto(`${base}${inviteLink.pathname.split('/').pop()}${inviteLink.search}`);
  await guest.page.fill("#join-name", "Bea");
  await guest.page.locator('[data-action="choose-character"]').click();
  await guest.page.locator('[data-action="select-character"][data-character="9"]').click();
  await guest.page.click('[data-action="join-room"]');
  await guest.waitText(/Conectado a la sala/);
  await host.waitText(/Bea/);
  console.log("  ok  la invitada abre el enlace del QR y entra con su nombre y personaje");

  // Entrar por el enlace de invitación (QR) con una tercera persona.
  const third = await movil("tercera");
  await third.page.goto(`${base}?join=${code}`);
  await third.page.locator('[data-action="join-room"]').click();
  await third.waitText(/Conectado a la sala/);
  await host.waitText(/3 \/ 6/);
  await third.page.click('[data-action="leave-room"]');
  await host.waitText(/2 \/ 6/);
  console.log("  ok  el enlace de invitación mete en la sala y salir deja la plaza libre");

  await host.page.click('[data-action="start-game"]');
  await host.page.locator(".hand .playing-card").first().waitFor();
  await guest.page.locator(".hand .playing-card").first().waitFor();
  assert.equal(await host.page.locator('[data-player-id] .rival-original').first().getAttribute("data-character"),"2");
  assert.equal(await guest.page.locator('.self-seat .rival-original').getAttribute("data-character"),"9");
  const hostCards = await host.page.locator(".hand .playing-card").count();
  const guestCards = await guest.page.locator(".hand .playing-card").count();
  assert.ok(hostCards >= 20 && guestCards >= 20, `manos repartidas (${hostCards}/${guestCards})`);
  console.log(`  ok  partida en marcha: ${hostCards} y ${guestCards} cartas`);

  // Reload resumes the same seat and character without opening the identity form again.
  await guest.page.reload();
  await guest.page.locator('.hand .playing-card').first().waitFor();
  assert.equal(await guest.page.locator('.hand .playing-card').count(),guestCards);
  assert.equal(await guest.page.locator('.self-seat .rival-original').getAttribute('data-character'),'9');
  assert.equal(await guest.page.locator('[data-action="choose-character"]').count(),0);
  console.log('  ok  recarga conserva la plaza, las cartas y el personaje elegido');

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
