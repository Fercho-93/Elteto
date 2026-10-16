// Cada juego tiene un reglamento completo, propio y sin enlaces, con el formato de rulebooks/README.md.
import assert from 'node:assert/strict';
import {readdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const {listGames,getGamePlan}=await import('../dist/game-core/index.js');
const only=process.argv[2];
const dir=path.resolve('apps/web/rulebooks');
const {RULEBOOK_IDS}=await import(pathToFileURL(path.join(dir,'index.js')));
const known=new Set(listGames().map(game=>game.id.replace(/_/g,'-')));
assert.deepEqual([...RULEBOOK_IDS].sort(),[...known].sort(),'un reglamento por cada juego del catálogo');
const words=text=>String(text).trim().split(/\s+/).filter(Boolean).length;
const texts=block=>typeof block==='string'?[block]:block.note?[block.note]:block.list?block.list:block.steps?block.steps:block.table?[...block.table.head,...block.table.rows.flat()]:assert.fail('bloque desconocido: '+JSON.stringify(block));
const report=[];
for(const id of RULEBOOK_IDS){
 if(only&&only!==id)continue;
 const file=path.join(dir,id+'.js');
 const book=(await import(pathToFileURL(file))).default;
 assert.equal(typeof book.tagline,'string',id+': tagline');
 assert.ok(Array.isArray(book.facts)&&book.facts.length>=2&&book.facts.every(f=>Array.isArray(f)&&f.length===2&&f.every(x=>typeof x==='string'&&x)),id+': facts');
 assert.ok(Array.isArray(book.sections)&&book.sections.length>=5,id+': al menos cinco secciones');
 const titles=book.sections.map(s=>s.title);
 assert.equal(new Set(titles).size,titles.length,id+': títulos de sección repetidos');
 assert.ok(titles.some(t=>/^Objetivo/i.test(t)),id+': falta «Objetivo»');
 assert.ok(titles.some(t=>/Elteto/i.test(t)),id+': falta la sección con las particularidades de Elteto');
 let total=words(book.tagline);
 for(const section of book.sections){
  assert.ok(section.title&&Array.isArray(section.blocks)&&section.blocks.length,id+': sección vacía '+section.title);
  for(const block of section.blocks){
   if(block.table){assert.ok(block.table.head.length&&block.table.rows.every(r=>r.length===block.table.head.length),id+': tabla con columnas desiguales en '+section.title);}
   for(const text of texts(block)){
    assert.equal(typeof text,'string',id+': texto no válido');total+=words(text);
    assert.ok(!/https?:|www\.|<[a-z\/]|\]\(/i.test(text),id+': sin enlaces ni HTML: '+text.slice(0,60));
    assert.ok(!/fuente original|consulta (el|la|los) (reglamento|fuente)|federaci[oó]n/i.test(text)||id==='mus',id+': sin remisiones a fuentes externas: '+text.slice(0,60));
    assert.ok((text.match(/\*\*/g)||[]).length%2===0,id+': negritas sin cerrar: '+text.slice(0,60));
   }
  }
 }
 assert.ok(total>=450,`${id}: reglamento demasiado corto (${total} palabras)`);
 report.push(`${id}:${total}`);
}
console.log('Reglamentos: '+report.join(' · '));
