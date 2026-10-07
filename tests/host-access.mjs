import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Exercise the actual access gates without Firebase/network or browser storage.
const source = (await readFile('apps/web/host-access.js', 'utf8'))
  .replace(/^import[\s\S]*?;\r?\n/gm, '')
  .replace(/\bexport (?=(?:async )?function)/g, '');
const storage = new Map();
const config = { developmentAdminEnabled: false };
let grant;
const user = { uid: 'host', email: 'host@example.test' };
const context = vm.createContext({
  distributionConfig: config,
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  connectFirebase: async () => ({ auth: { currentUser: user }, db: {}, uid: user.uid }),
  doc: () => ({}),
  getDocFromServer: async () => ({ data: () => grant }),
  window: {},
});
vm.runInContext(source, context);

for (const enabled of [false, true]) {
  config.developmentAdminEnabled = enabled;
  for (const mode of [undefined, 'invitation', 'development']) {
    for (const status of ['active', 'revoked']) {
      storage.clear();
      grant = { status, mode };
      const allowed = status === 'active' && (mode !== 'development' || enabled);
      assert.equal(Boolean(await context.readHostAccess()), allowed);
      assert.equal(Boolean(context.cachedHostAccess()), allowed);
      if (allowed) assert.equal(await context.requireHostAccess(), true);
      else await assert.rejects(context.requireHostAccess(), /Activa/);
    }
  }
}

// Updating the app must not restore a disabled temporary grant from the server.
config.developmentAdminEnabled = false;
grant = { status: 'active', mode: 'development' };
storage.set('elteto.hostAccess.v1', JSON.stringify({ uid: user.uid, active: true, mode: 'development' }));
assert.equal(context.cachedHostAccess(), null);
await assert.rejects(context.requireHostAccess(), /Activa/);
assert.equal(JSON.parse(storage.get('elteto.hostAccess.v1')).active, false);
console.log('Acceso local: invitaciones, revocación y retirada de licencias de desarrollo tras actualizar: OK');
