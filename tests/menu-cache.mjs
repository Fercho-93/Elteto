// Reproduce an existing installation whose browser HTTP cache still holds the old menu.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import vm from 'node:vm';

const index = await readFile('dist/index.html', 'utf8');
const worker = await readFile('dist/sw.js', 'utf8');
const hash = createHash('sha256');
for (const file of ['app.js', 'styles.css', 'qr-scanner.js', 'firebase-sdk.js', 'host-access.js', 'activation-code.js', 'online-room.js', 'room-code.js', 'distribution-config.js', 'guest.html', 'catalog-games.js', 'catalog-games.css', 'board-games.js', 'board-games.css', 'board-motion.js', 'turn-events.js', 'turn-sequence.js', 'turn-sequence.css', 'game-picker.js', 'rival-portraits.js', 'rival-portraits.css', 'game-physics.js', 'card-paint.js', 'table-speech.js', 'parchis-board.js', 'parchis-board.css', 'table-view.js', 'parchis-dice.js', 'parchis-dice.css', 'game-core/catalog.js', 'game-core/engine.js', 'game-core/index.js', 'game-core/bots.js', 'local-session.js', 'lan-session.js', ...['shared','boards','social-cards','tricks','melds','holdem'].map(name => `game-core/games/${name}.js`)]) {
  let content = await readFile(`dist/${file}`);
  if (file === 'guest.html') content = Buffer.from(content.toString().replace(/\?v=[a-f0-9]{12}/g, ''));
  hash.update(content);
}
const version = hash.digest('hex').slice(0, 12);
assert.ok(index.includes(`./app.js?v=${version}`));
assert.ok(index.includes(`./styles.css?v=${version}`));
assert.ok(index.includes(`./qr-scanner.js?v=${version}`));
assert.ok(worker.includes(`elteto-shell-v30-${version}`));

const origin = 'https://example.test/Elteto/';
const handlers = new Map();
const stores = new Map([['elteto-shell-v24', new Map()]]);
const requests = [];
let offline = false, claimed = false;
const fetch = async (input, options = {}) => {
  const request = input instanceof Request ? input : new Request(input);
  const cache = options.cache || request.cache;
  requests.push({url: request.url, cache});
  if (offline) throw new TypeError('Offline');
  // Without explicit revalidation the HTTP layer returns the old app despite network-first.
  return new Response(cache === 'reload' || cache === 'no-cache' ? 'new-menu' : 'old-menu');
};
const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async addAll(inputs) { for (const input of inputs) store.set(input.url, await fetch(input)); },
      async put(input, response) { store.set(input.url, response); },
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
  async match(input) {
    for (const store of stores.values()) if (store.has(input.url)) return store.get(input.url).clone();
  },
};
const self = {
  registration: {scope: origin}, location: new URL(origin),
  addEventListener(type, handler) { handlers.set(type, handler); },
  skipWaiting() {}, clients: {claim() { claimed = true; }},
};
vm.runInNewContext(worker, {self, caches, fetch, URL, Request, Response});
let done;
handlers.get('install')({waitUntil(promise) { done = promise; }});
await done;
assert.ok(requests.length > 20);
assert.ok(requests.every(request => request.cache === 'reload'));
handlers.get('activate')({waitUntil(promise) { done = promise; }});
await done;
assert.equal(stores.has('elteto-shell-v24'), false);
assert.ok(claimed);
async function load(path) {
  let response;
  handlers.get('fetch')({request: new Request(new URL(path, origin)), respondWith(promise) { response = promise; }});
  return await response;
}
assert.equal(await (await load('app.js')).text(), 'new-menu');
assert.equal(requests.at(-1).cache, 'no-cache');
offline = true;
for (const path of ['./', 'index.html', 'app.js', 'styles.css', 'qr-scanner.js', `app.js?v=${version}`, `styles.css?v=${version}`, `qr-scanner.js?v=${version}`]) {
  assert.equal(await (await load(path)).text(), 'new-menu', `${path} stays available offline`);
}
console.log('Menu cache: versioned URLs, stale HTTP cache bypass, old cache retirement and offline menu: OK');
