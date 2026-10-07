import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const output = path.join(root, "dist");
const web = path.join(root, "apps", "web");
const core = path.join(root, "packages", "game-core", "dist");

async function rewriteModuleImports(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await rewriteModuleImports(fullPath);
    else if (entry.name.endsWith(".js")) {
      const source = await readFile(fullPath, "utf8");
      const updated = source.replace(/((?:from\s*|import\s*)["'])(\.{1,2}\/[^"']+)(["'])/g, (match, start, specifier, end) => {
        if (/\.[a-z0-9]+$/i.test(specifier)) return match;
        return `${start}${specifier}.js${end}`;
      });
      if (updated !== source) await writeFile(fullPath, updated);
    }
  }
}

await mkdir(output, { recursive: true });
// Retire previous 3D bundles from incremental local builds as well as fresh builds.
for (const obsolete of ['assets/elteto-mascots-bust-v2.png','assets/elteto-mascots-bust-side-v2.png','table-3d.js','vendor/three.module.min.js','vendor/three.core.min.js','vendor/THREE-LICENSE.txt','vendor/README.md']) {
  await rm(path.join(output,obsolete),{force:true});
}
await cp(web, output, { recursive: true });
await cp(path.join(root, "reglas_juegos"), path.join(output, "reglas_juegos"), {recursive:true});
await cp(core, path.join(output, "game-core"), { recursive: true });
await rewriteModuleImports(path.join(output, "game-core"));
console.log("Elteto web build generated in dist/.");

// Include the source archive and inert library in the offline shell.
const rulesFiles=[];
async function collectRules(dir, prefix="./reglas_juegos") {
 for (const entry of await readdir(dir,{withFileTypes:true})) {
  if(entry.isDirectory()) await collectRules(path.join(dir,entry.name),`${prefix}/${entry.name}`);
  else rulesFiles.push(`${prefix}/${entry.name}`);
 }
}
await collectRules(path.join(root,"reglas_juegos"));
await collectRules(path.join(web,"assets","decks"),"./assets/decks");
const swPath=path.join(output,"sw.js");
const sw=await readFile(swPath,"utf8");
// A changed menu must get a new URL even when a mobile browser retains its HTTP cache.
const menuFiles = ['app.js', 'styles.css'];
const menuHash = createHash('sha256');
for (const file of menuFiles) menuHash.update(await readFile(path.join(output, file)));
const menuVersion = menuHash.digest('hex').slice(0, 12);
const indexPath = path.join(output, 'index.html');
let index = await readFile(indexPath, 'utf8');
for (const file of menuFiles) index = index.replaceAll(`./${file}"`, `./${file}?v=${menuVersion}"`);
await writeFile(indexPath, index);
// Cache both URLs so an installed app still opens offline, including on its first install.
const versionedMenu = menuFiles.map(file => `./${file}?v=${menuVersion}`);
await writeFile(swPath, sw
  .replace('elteto-shell-v25', `elteto-shell-v25-${menuVersion}`)
  .replace('const ASSETS = [', `const ASSETS = [...${JSON.stringify([...rulesFiles, ...versionedMenu])},`));
