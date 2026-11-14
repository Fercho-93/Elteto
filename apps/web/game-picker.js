import {escapeHtml as esc} from './table-view.js';

// Each category opens with its own illustration, cached with the app so it also works offline.
const CATEGORY_ART={board:'./assets/juegos-tablero.webp',cards:'./assets/juegos-cartas.webp'};
// Every game with an engine is offered, grouped the way people look for them at a real table.
export const GAME_GROUPS=[
 {id:'board',title:'Juegos de Tablero',sections:[{title:'Tablero y fichas',ids:['parchis','oca','damas-espanolas','domino']}]},
 {id:'cards',title:'Juegos de cartas',sections:[
  {title:'Para toda la familia',ids:['tetuno','cinquillo','escoba','burro','mentiroso']},
  {title:'Bazas y triunfos',ids:['brisca','tute','guinote','butifarra','pocha','julepe']},
  {title:'Combinaciones',ids:['chinchon','remigio','continental']},
  {title:'Envites y apuestas',ids:['mus','texas-holdem','siete-y-medio']},
 ]},
];
export const AVAILABLE_GAME_IDS=GAME_GROUPS.flatMap(group=>group.sections.flatMap(section=>section.ids));
export function availableGames(games){return AVAILABLE_GAME_IDS.map(id=>games.find(game=>game.id===id)).filter(Boolean);}
const label = game => ({'damas-espanolas':'Damas','texas-holdem':'Póker','oca':'Oca','escoba':'Escoba'})[game.id] || game.label;
const choice=(game,selected,countLabel)=>`<label class="category-choice"><input type="radio" name="game" value="${esc(game.id)}" ${game.id===selected?'checked':''}><span>${esc(label(game))}</span><small>${countLabel(game)} jugadores</small></label>`;
export function renderGameChoices(games,selected,countLabel){
 return `<div class="game-categories" aria-label="Juegos disponibles">${GAME_GROUPS.map(group=>{
  const ids=group.sections.flatMap(section=>section.ids),chosen=games.find(g=>ids.includes(g.id)&&g.id===selected);
  const sections=group.sections.map(section=>({...section,games:section.ids.map(id=>games.find(g=>g.id===id)).filter(Boolean)})).filter(section=>section.games.length);
  const titled=sections.length>1;
  return `<details name="game-category" class="game-category ${chosen?'chosen':''}" data-category="${group.id}"><summary><span class="category-art"><img src="${CATEGORY_ART[group.id]}" alt="" width="720" height="480" decoding="async" draggable="false"></span><strong class="category-title">${group.title}${chosen?': '+esc(label(chosen)):''}</strong><span class="category-hint">${chosen?'Seleccionado · '+countLabel(chosen)+' jugadores':'Pulsa para elegir'} <span aria-hidden="true">⌄</span></span></summary><div class="category-combo" role="group" aria-label="${group.title}">${sections.map(section=>titled?`<div class="category-section" role="group" aria-label="${esc(section.title)}"><p class="category-section-title" aria-hidden="true">${esc(section.title)}</p>${section.games.map(game=>choice(game,selected,countLabel)).join('')}</div>`:section.games.map(game=>choice(game,selected,countLabel)).join('')).join('')}</div></details>`;
 }).join('')}</div><p class="game-picker-summary" role="status">${selected&&games.some(g=>g.id===selected)?'Juego elegido: '+esc(label(games.find(g=>g.id===selected))):'Elige un juego para abrir la mesa'}</p>`;
}
export function updateGamePicker(app){
 const input=app.querySelector('input[name="game"]:checked');
 for(const category of app.querySelectorAll('.game-category')){
  const chosen=category.contains(input),title=category.dataset.category==='board'?'Juegos de Tablero':'Juegos de cartas';
  category.classList.toggle('chosen',chosen);
  category.querySelector('.category-title').textContent=title+(chosen?': '+input.nextElementSibling.textContent:'');
  category.querySelector('.category-hint').textContent=chosen?'Seleccionado · '+input.parentElement.querySelector('small').textContent+' ⌄':'Pulsa para elegir ⌄';
 }
 app.querySelector('.game-picker-summary').textContent=input?'Juego elegido: '+input.nextElementSibling.textContent:'Elige un juego para abrir la mesa';
}
