// Permite ejecutar los módulos del navegador en Node: las importaciones del SDK de Firebase
// desde gstatic.com se redirigen al paquete `firebase` de node_modules. Se usa con
//   node --import ./tests/cdn-loader.mjs tests/online-sala.mjs
import { register } from "node:module";

register("data:text/javascript," + encodeURIComponent(`
  const CDN = /^https:\\/\\/www\\.gstatic\\.com\\/firebasejs\\/[\\d.]+\\/firebase-([\\w-]+)\\.js$/;
  export async function resolve(specifier, context, next) {
    const match = CDN.exec(specifier);
    if (match) return next("firebase/" + match[1], context);
    return next(specifier, context);
  }
`), import.meta.url);
