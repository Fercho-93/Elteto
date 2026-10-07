// Explicit maintenance task, never run during a build or in the game.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const folder = new URL('../apps/web/assets/decks/', import.meta.url);
await mkdir(folder, { recursive: true });
const headers = { 'User-Agent': 'Elteto-card-assets/1.0 (https://github.com/Fercho-93/Elteto)' };
async function get(url) {
  let response;
  for (let attempt=0;attempt<5;attempt++) {
    response = await fetch(url, { headers });
    if (response.status !== 429) break;
    await new Promise(resolve=>setTimeout(resolve,5000*(attempt+1)));
  }
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
const names = ['oros','copas','espadas','bastos'].flatMap(suit => ['A','2','3','4','5','6','7','8','9','S','C','R'].map(rank => `${rank}${suit}.png`));
const api = 'https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url%7Cextmetadata&titles=' + encodeURIComponent(names.map(name=>'File:'+name).join('|'));
const metadata = await (await get(api)).json();
const manifest = [];
for (const item of Object.values(metadata.query.pages)) {
  const info=item.imageinfo?.[0];
  if (!info || info.extmetadata.LicenseShortName.value !== 'CC BY-SA 3.0') throw new Error('Unexpected Spanish card license: '+item.title);
  const file=item.title.slice(5), url=info.url.split('?')[0];
  const bytes=await readFile(new URL(file,folder)).catch(async()=>{ const data=Buffer.from(await (await get(url)).arrayBuffer()); await new Promise(resolve=>setTimeout(resolve,1500)); return data; });
  await writeFile(new URL(file,folder),bytes);
  manifest.push({file,source:info.descriptionurl,artist:'Basquetteur and Germarquezm',license:'CC BY-SA 3.0',licenseUrl:info.extmetadata.LicenseUrl.value,sha256:createHash('sha256').update(bytes).digest('hex')});
}
const repo='https://raw.githubusercontent.com/htdebeer/SVG-cards/master/';
for (const suit of ['club','diamond','heart','spade']) for (const rank of ['1','2','3','4','5','6','7','8','9','10','jack','queen','king']) {
  const file=`${suit}_${rank}.png`, url=repo+'png/2x/'+file;
  const bytes=Buffer.from(await (await get(url)).arrayBuffer());
  await writeFile(new URL(file,folder),bytes);
  manifest.push({file,source:url,artist:'David Bellot; SVG-cards maintained by Huub de Beer',license:'LGPL-2.1',sha256:createHash('sha256').update(bytes).digest('hex')});
}
for (const [source,file] of [['svg-cards.svg','french-source.svg'],['LICENSE','FRENCH-LICENSE.txt']]) await writeFile(new URL(file,folder),Buffer.from(await (await get(repo+source)).arrayBuffer()));
await writeFile(new URL('manifest.json',folder),JSON.stringify(manifest,null,2)+'\n');
console.log(`Stored ${manifest.length} original card faces and French SVG source/license.`);
