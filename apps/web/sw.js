const CACHE = "elteto-shell-v25";
const ASSETS = [
  "./catalog-games.js", "./catalog-games.css", "./game-core/games/shared.js", "./game-core/games/boards.js", "./game-core/games/social-cards.js", "./game-core/games/tricks.js", "./game-core/games/melds.js", "./game-core/games/holdem.js",
  "./assets/elteto-cover-balanced-v5.png",
  "./avatar-art.js", "./assets/elteto-logo-neon-v3.png", "./assets/elteto-avatars-v3.png",
  "./parchis-dice.js", "./parchis-dice.css",
  "./parchis-board.js", "./parchis-board.css", "./game-core/games/parchis.js",
  "./mus-screen.js", "./mus-screen.css",
  "./rival-portraits.js", "./rival-portraits.css", "./assets/elteto-original-avatars.png",
  "./table-layout.css",
  "./cinquillo-table.css", "./cinquillo-screen.js", "./assets/elteto-mascots-side-v1.png",
  "./", "./index.html", "./styles.css", "./app.js", "./table-view.js", "./card-art.js", "./assets/elteto-mascots-v1.png", "./local-session.js", "./local-transport.js",
  "./room-code.js", "./online-room.js", "./firebase-client.js", "./firebase-config.js",
  "./manifest.webmanifest", "./icon.svg", "./qrcode-generator.js", "./qr-encode.js", "./qr-scanner.js", "./jsqr.js",
  "./game-core/index.js", "./game-core/engine.js", "./game-core/deck.js", "./game-core/catalog.js",
  "./game-core/games/mus.js", "./game-core/games/cinquillo.js"
];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((path) => new Request(new URL(path, self.registration.scope), {cache: "reload"})))));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("elteto-shell-") && key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // Network-first must also revalidate the browser's HTTP cache after a deployment.
  event.respondWith(fetch(request, {cache: "no-cache"}).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy));
    return response;
  }).catch(async () => (await caches.match(request)) || Response.error()));
});
