import {getGamePlan} from './game-core/index.js';
import {escapeHtml as esc} from './table-view.js';
const sources=new Map();
let activeDialog=null;
const allowed=new Set(['P','DIV','SECTION','ARTICLE','H1','H2','H3','H4','H5','H6','UL','OL','LI','STRONG','B','EM','I','BR','TABLE','THEAD','TBODY','TR','TH','TD','IMG','A','SPAN','PRE','BLOCKQUOTE','SUP','SUB']);
export function cleanRulebook(text){
 const source=new DOMParser().parseFromString(text,'text/html');
 source.querySelectorAll('script,style,iframe,form,header,nav,footer,.meta').forEach(el=>el.remove());
 const clean=node=>{
  if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
  if(node.nodeType!==Node.ELEMENT_NODE)return document.createDocumentFragment();
  const tag=node.tagName,el=allowed.has(tag)?document.createElement(tag.toLowerCase()):document.createDocumentFragment();
  if(tag==='IMG'){
   const src=node.getAttribute('src')||'';if(!/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(src))return document.createDocumentFragment();
   el.src=src;el.alt=node.getAttribute('alt')||'Ilustración del reglamento';el.loading='lazy';
  }
  if(tag==='A'){
   const href=node.getAttribute('href')||'';
   if(href.startsWith('https://')){el.href=href;el.target='_blank';el.rel='noopener noreferrer';}
  }
  if(tag==='TD'||tag==='TH')for(const attr of ['colspan','rowspan'])if(/^\d{1,2}$/.test(node.getAttribute(attr)||''))el.setAttribute(attr,node.getAttribute(attr));
  for(const child of node.childNodes)el.append(clean(child));return el;
 };
 const root=document.createElement('article');root.className='help-original';for(const node of source.body.childNodes)root.append(clean(node));return root;
}
function tableRules(id,view){
 const plan=getGamePlan(id),rows=id==='mus'?[]:[plan.summary,plan.implementationNotes];
 if(id==='mus')rows.push(`${view?.ruleset==='four-kings'?'4 reyes: doses y treses conservan su valor.':'8 reyes y 8 ases: los treses equivalen a reyes y los doses a ases.'} Cuatro jugadores, parejas alternas. Se juega a ${view?.targetScore??40} tantos y gana quien consiga ${view?.targetGames??3} juegos.`, 'En la primera mano se aplica mus corrido: quien corta fija la mano. Si todos piden mus, selecciona de una a cuatro cartas y confirma el descarte. Cuando el mazo se agota se reciclan descartes; si solo falta una persona no se le devuelve su propio descarte.', 'Los lances siguen el orden grande, chica, pares y juego o punto. La app comprueba pares y juego. Los empates favorecen a quien está antes desde la mano. Envidos aceptados se cuentan al terminar; los dejes, al rechazarse. El órdago aceptado decide el juego completo. Tras mostrar las cartas, la mano inicia el siguiente reparto.');
 if(id==='texas-holdem')rows.push('Cada dos manos completas ambas ciegas suben 5: 5/10, 10/15, 15/20… El botón de reparto rota entre quienes tienen fichas. Con dos jugadores, el botón paga la pequeña y habla primero antes del flop; la grande habla primero después.', 'Pasar solo es posible sin apuesta pendiente. Igualar paga lo que falta, hasta tus fichas disponibles. El campo «Hasta» es el total de tu apuesta en esa ronda. Una subida debe alcanzar la apuesta actual más la última subida completa. Una subida corta de all-in no reabre por sí sola el derecho a subir de quien ya actuó.', 'Un all-in solo puede ganar los botes a los que ha contribuido. Los empates reparten fichas enteras; los sobrantes se distribuyen desde el asiento siguiente al botón entre los ganadores. Una apuesta sin rival vuelve a su dueño mediante el recuento del bote lateral.', '«Ausentarme y volver» conserva tu plaza, personaje y fichas. Si estás ausente durante 12 segundos en tu turno, se pasa cuando es gratis o se retira la mano si debes pagar. Las ciegas siguen contando; si todos están ausentes, se espera. Quien pierde sus fichas permanece como observador. Una reconexión en el mismo navegador recupera la identidad de la sala.');
 if(id==='oca')rows.push('Las ocas están en 5, 9, 14, 18, 23, 27, 32, 36, 41, 45, 50, 54 y 59. La última conduce a la meta 63. El puente 12 es de llegada: no devuelve al 6. Los dados intercambian 26 y 53 sin encadenar saltos.', 'Posada 19, pozo 31 y laberinto 42: se pierden dos turnos propios. Prisión 52: espera hasta que llegue otra ficha; la anterior ocupa la casilla de origen del recién llegado. Calavera 58: regreso al 1. La salida compartida permite iniciar la partida con todas las fichas juntas.', 'La aplicación usa la edición española de Cayro. Otras ediciones tienen efectos diferentes en pozo, laberinto, puente y dados. El tablero representa los efectos de esta mesa; las flechas siguen el orden consecutivo del 1 al 63. Puedes ampliar el tablero desde el menú.');
 if(id==='parchis')rows.push('Cada jugador tiene cuatro fichas y un color. La tirada inicial decide quién empieza; en caso de empate solo repiten los empatados. El dado y los recorridos se muestran antes de dar paso al siguiente turno.', 'Puedes elegir sacar una ficha con 5 o mover otra. Debes abrir una barrera propia cuando sale 6 y exista un movimiento legal para hacerlo. Ningún movimiento atraviesa una barrera; no se admiten más de dos fichas por casilla. Los seguros impiden capturas, incluidas las salidas.', 'Los premios de 20 por capturar y 10 por llegar a meta se gastan completos con una ficha que pueda realizar ese recorrido. Si no hay movimiento válido se pierde el premio. La entrada en meta exige el número exacto.');
 if(id==='damas-espanolas')rows.push('Selecciona la ficha y marca el recorrido completo, incluidos todos los saltos de una captura encadenada. Los peones avanzan y capturan hacia delante; una dama recorre diagonales y captura a distancia. Al acabar el movimiento en la última fila, el peón se corona.', 'Capturar es obligatorio. Entre varias secuencias debes escoger la que toma más piezas; si empatan, la que toma más damas. Gana quien deja al rival sin movimiento legal.', 'Tablas: por acuerdo aceptado, por tercera repetición con el mismo turno o tras 40 medias jugadas consecutivas sin captura ni movimiento de peón. También se aplica el límite de 26 medias jugadas en el final de tres damas contra una cuando el bando de tres controla la diagonal principal.');
 return `<section class="help-table-rules"><p class="help-eyebrow">ASÍ SE JUEGA EN ESTA MESA</p><h2>La variante de Elteto</h2><ul>${rows.map(row=>`<li>${esc(row)}</li>`).join('')}</ul></section>`;
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
export async function openGameHelp(id,view){
 if(activeDialog?.open)return;
 const plan=getGamePlan(id),dialog=document.createElement('dialog');activeDialog=dialog;
 dialog.className='game-help';dialog.setAttribute('aria-label',`Reglas de ${plan.label}`);
 dialog.innerHTML=`<header><div><p class="help-eyebrow">INFORMACIÓN DEL JUEGO</p><h1>${esc(plan.label)}</h1></div><button class="help-return">← Volver a la partida</button></header><nav class="help-tabs" aria-label="Consultar reglas"><button data-help-jump=".help-table-rules">Reglas de esta mesa</button><button data-help-jump=".help-source">Reglamento completo</button></nav><div class="help-scroll">${tableRules(id,view)}<section class="help-source"><h2>Reglamento completo de referencia</h2><p>Texto de la fuente utilizada para este juego, disponible dentro de Elteto sin conexión. Las variantes de esta mesa están explicadas arriba.</p><a href="${esc(plan.rules.url)}" target="_blank" rel="noopener noreferrer">Consultar la fuente original ↗</a><p class="help-loading" role="status">Cargando reglamento…</p></section></div>`;
 document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(activeDialog===dialog)activeDialog=null;document.querySelector('.game-info-button')?.focus({preventScroll:true});},{once:true});
 dialog.querySelector('.help-return').onclick=()=>dialog.close();dialog.querySelectorAll('[data-help-jump]').forEach(button=>{button.onclick=()=>dialog.querySelector(button.dataset.helpJump).scrollIntoView({block:'start',behavior:'instant'});});dialog.showModal();
 try{
  const file=['parchis','oca'].includes(id)?`reglas_juegos/consulta/${id}.html`:plan.rules.file;
  if(file.endsWith('.pdf')){dialog.querySelector('.help-loading').innerHTML=`El reglamento completo está en el documento original. <a href="./${esc(file)}" target="_blank" rel="noopener">Abrir reglamento completo</a>`;return;}
  if(!sources.has(file))sources.set(file,fetch('./'+file).then(response=>{if(!response.ok)throw new Error('No se pudo cargar el reglamento.');return response.text();}).catch(error=>{sources.delete(file);throw error;}));
  const text=await sources.get(file);if(!dialog.isConnected)return;
  const article=cleanRulebook(text),heads=[...article.querySelectorAll('h2,h3,h4,h5')];
  if(heads.length){const nav=document.createElement('details');nav.className='help-index';nav.innerHTML='<summary>Ir a una sección</summary><div></div>';heads.forEach((head,i)=>{head.id='help-section-'+i;const button=document.createElement('button');button.textContent=head.textContent;button.onclick=()=>head.scrollIntoView({block:'start',behavior:'instant'});nav.querySelector('div').append(button);});dialog.querySelector('.help-loading').before(nav);}
  dialog.querySelector('.help-loading').replaceWith(article);
 }catch(error){if(dialog.isConnected)dialog.querySelector('.help-loading').textContent=error.message+' Cierra y vuelve a abrir la información para reintentar.';}
}
