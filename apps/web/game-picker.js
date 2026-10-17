import {escapeHtml as esc} from './table-view.js';

// Each category opens with its own illustration, cached with the app so it also works offline.
const CATEGORY_ART={board:'./assets/juegos-tablero.webp',cards:'./assets/juegos-cartas.webp'};
export const AVAILABLE_GAME_IDS = ['parchis','damas-espanolas','mus','texas-holdem'];
export function availableGames(games){return AVAILABLE_GAME_IDS.map(id=>games.find(game=>game.id===id)).filter(Boolean);}
const label = game => ({'damas-espanolas':'Damas','texas-holdem':'Póker'})[game.id] || game.label;
export function renderGameChoices(games,selected,countLabel){
 const groups=[{id:'board',title:'Juegos de Tablero',ids:['parchis','damas-espanolas']},{id:'cards',title:'Juegos de cartas',ids:games.filter(g=>!['parchis','damas-espanolas','oca'].includes(g.id)).map(g=>g.id)}];
 return `<div class="game-categories" aria-label="Juegos disponibles">${groups.map(group=>{
  const choices=games.filter(g=>group.ids.includes(g.id)),chosen=choices.find(g=>g.id===selected);
  return `<details name="game-category" class="game-category ${chosen?'chosen':''}" data-category="${group.id}"><summary><span class="category-art"><img src="${CATEGORY_ART[group.id]}" alt="" width="720" height="480" decoding="async" draggable="false"></span><strong class="category-title">${group.title}${chosen?': '+esc(label(chosen)):''}</strong><span class="category-hint">${chosen?'Seleccionado · '+countLabel(chosen)+' jugadores':'Pulsa para elegir'} <span aria-hidden="true">⌄</span></span></summary><div class="category-combo" role="group" aria-label="${group.title}">${choices.map(game=>`<label class="category-choice"><input type="radio" name="game" value="${esc(game.id)}" ${game.id===selected?'checked':''}><span>${esc(label(game))}</span><small>${countLabel(game)} jugadores</small></label>`).join('')}</div></details>`;
 }).join('')}</div><p class="game-picker-summary" role="status">${selected?'Juego elegido: '+esc(label(games.find(g=>g.id===selected))):'Elige un juego para abrir la mesa'}</p>`;
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
