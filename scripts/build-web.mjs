import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
await cp(web, output, { recursive: true });
await cp(core, path.join(output, "game-core"), { recursive: true });
await rewriteModuleImports(path.join(output, "game-core"));
console.log("Elteto web build generated in dist/.");
