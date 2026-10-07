// Genera un enlace privado. Solo la huella viaja al workflow administrativo.
import { mkdir, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { createActivationCode, activationCodeHash } from '../apps/web/activation-code.js';
const code=createActivationCode(), hash=await activationCodeHash(code);
const url=`https://fercho-93.github.io/Elteto/#admin=${code}`;
await mkdir('.private',{recursive:true});
const filename=`.private/administrador-${Date.now()}.html`;
await writeFile(filename,`<!doctype html><meta charset="utf-8"><meta name="referrer" content="no-referrer"><title>Elteto · acceso privado</title><p>Acceso privado de desarrollo, de un solo uso. Ábrelo en el navegador donde vas a jugar.</p><p><a href="${url}">Entrar como administrador</a></p><p>Si vas a usar otro móvil, copia este enlace y ábrelo allí:</p><input readonly style="width:95%" value="${url}">`,{mode:0o600});
const result=spawnSync('gh',['workflow','run','invitaciones.yml','--repo','Fercho-93/Elteto','--json'],{input:JSON.stringify({huellas:hash,administrador:'true'}),encoding:'utf8'});
if(result.status!==0)throw Error('El archivo privado está guardado, pero no se pudo registrar su huella.');
console.log(`Acceso privado guardado en ${filename}. Espera al workflow antes de abrirlo. Canjear en 24 horas; después el navegador conserva el acceso.`);
