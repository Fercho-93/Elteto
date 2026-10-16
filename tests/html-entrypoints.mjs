// The Android LAN page, the web app and the guest page must share every stylesheet:
// a missing one leaves buttons with default colours on one platform only.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const sheets=async file=>[...(await readFile(`apps/web/${file}`,'utf8')).matchAll(/rel="stylesheet" href="\.\/([^"?]+\.css)/g)].map(m=>m[1]);
const web=await sheets('index.html');
for(const file of ['lan.html','guest.html'])assert.deepEqual(await sheets(file),web,`${file} carga los mismos estilos que index.html`);
console.log('Páginas de entrada: web, Android LAN e invitado con los mismos estilos: OK');
