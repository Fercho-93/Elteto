import {getGamePlan} from './game-core/index.js';
import {escapeHtml as esc} from './table-view.js';
import {loadRulebook} from './rulebooks/index.js';
let activeDialog=null;
const rich=text=>esc(text).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');
function renderBlock(block){
 if(typeof block==='string')return `<p>${rich(block)}</p>`;
 if(block.note)return `<aside class="help-note">${rich(block.note)}</aside>`;
 if(block.list)return `<ul>${block.list.map(item=>`<li>${rich(item)}</li>`).join('')}</ul>`;
 if(block.steps)return `<ol class="help-steps">${block.steps.map(item=>`<li>${rich(item)}</li>`).join('')}</ol>`;
 if(block.table)return `<div class="help-table"><table><thead><tr>${block.table.head.map(cell=>`<th>${rich(cell)}</th>`).join('')}</tr></thead><tbody>${block.table.rows.map(row=>`<tr>${row.map(cell=>`<td>${rich(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
 return '';
}
// Lo mismo para todos los juegos: qué pasa cuando alguien se marcha a mitad de partida.
function leaveSection(id){
 const plan=getGamePlan(id),pair=plan.players.includes(2)&&!['mus','texas-holdem'].includes(id);
 return {title:'Si alguien sale de la partida',blocks:[pair?'La mesa recibe el aviso «X ha salido de la partida». En una mesa de dos, la partida termina en ese momento y **gana quien se queda**.':'La mesa recibe el aviso «X ha salido de la partida». Quien se ausenta puede volver a su plaza desde el mismo navegador.']};
}
export function renderRulebook(book,id){
 const sections=[...book.sections,leaveSection(id)];
 const facts=book.facts?.length?`<dl class="help-facts">${book.facts.map(([name,value])=>`<div><dt>${esc(name)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>`:'';
 const index=`<details class="help-index"><summary>Ir a una sección</summary><div>${sections.map((section,i)=>`<button type="button" data-help-section="${i}">${esc(section.title)}</button>`).join('')}</div></details>`;
 return `<article class="help-rulebook"><p class="help-lead">${rich(book.tagline)}</p>${facts}${index}${sections.map((section,i)=>`<section class="help-section" id="help-section-${i}"><h2>${esc(section.title)}</h2>${section.blocks.map(renderBlock).join('')}</section>`).join('')}</article>`;
}
export function mountGameHelp(app,id){
 if(!id)return;
 const header=app.querySelector('.play-header')||app.querySelector('.menu-room-shell .menu-header');if(!header||header.querySelector('.game-info-button'))return;
 const button=document.createElement('button');button.className='game-info-button';button.dataset.action='open-game-help';button.setAttribute('aria-label',`Información y reglas de ${getGamePlan(id).label}`);button.innerHTML='<span aria-hidden="true">i</span>';
 const menu=header.querySelector('.game-menu-button');if(menu)header.insertBefore(button,menu);else header.append(button);
 // Older in-menu links now open the same in-app rulebook.
 app.querySelectorAll(`a[href="./reglas_juegos/lectura/${id.replaceAll('-','_')}.html"]`).forEach(link=>{link.dataset.action='open-game-help';link.href='#';link.textContent='Ver todas las reglas';});
}
export function closeGameHelp(){activeDialog?.close();}
export async function openGameHelp(id){
 if(activeDialog?.open)return;
 const plan=getGamePlan(id),dialog=document.createElement('dialog');activeDialog=dialog;
 dialog.className='game-help';dialog.setAttribute('aria-label',`Reglas de ${plan.label}`);
 dialog.innerHTML=`<header><div><p class="help-eyebrow">REGLAMENTO</p><h1>${esc(plan.label)}</h1></div><button class="help-return">← Volver a la partida</button></header><div class="help-scroll"><p class="help-loading" role="status">Cargando reglamento…</p></div>`;
 document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(activeDialog===dialog)activeDialog=null;document.querySelector('.game-info-button')?.focus({preventScroll:true});},{once:true});
 dialog.querySelector('.help-return').onclick=()=>dialog.close();dialog.showModal();
 try{
  const book=await loadRulebook(id);if(!dialog.isConnected)return;
  const scroll=dialog.querySelector('.help-scroll');scroll.innerHTML=renderRulebook(book,id);
  scroll.querySelectorAll('[data-help-section]').forEach(button=>{button.onclick=()=>{scroll.querySelector('#help-section-'+button.dataset.helpSection).scrollIntoView({block:'start',behavior:'instant'});};});
 }catch(error){if(dialog.isConnected)dialog.querySelector('.help-loading').textContent=error.message+' Cierra y vuelve a abrir la información para reintentar.';}
}
