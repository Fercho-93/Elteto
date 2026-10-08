import {escapeHtml as esc} from './table-view.js';

// Small, local illustrations: no extra downloads are needed to choose a game offline.
function illustration(id){
 let art;
 if(id==='parchis'){
  art='<rect x="14" y="8" width="92" height="92" rx="8" fill="#f8eacb" stroke="#bba274" stroke-width="3"/>';
  for(const [x,y,color] of [[18,12,'#eac75c'],[66,12,'#de728d'],[18,60,'#6ecfc6'],[66,60,'#9bbc71']])art+=`<rect x="${x}" y="${y}" width="36" height="36" rx="5" fill="${color}"/><circle cx="${x+18}" cy="${y+18}" r="10" fill="#fff5" stroke="#fff9"/>`;
  art+='<path d="M60 8v92M14 54h92" stroke="#876d49" stroke-width="2"/>';
 }else if(id==='oca'){
  art='<rect x="12" y="8" width="96" height="92" rx="8" fill="#f3e2bc" stroke="#b79a65" stroke-width="3"/><path d="M24 88V22h72v66H38V36h44v38H52V50h16" fill="none" stroke="#bdc994" stroke-width="11" stroke-linejoin="round"/><path d="M45 60c-12-10-3-23 9-18l13 4 8-20c3-9 17-9 17-1 0 6-4 9-12 8l-2 19c-3 20-28 23-33 8Z" fill="#fff9e7" stroke="#7a826d" stroke-width="2"/><path d="m91 22 9 5-9 4" fill="#dc9c51"/><circle cx="86" cy="22" r="2" fill="#352b32"/><path d="M55 69v13m15-13v13" stroke="#c48a45" stroke-width="3"/>';
 }else if(id==='damas_espanolas'||id==='damas-espanolas'){
  art='<rect x="14" y="8" width="92" height="92" rx="4" fill="#e3cfa6" stroke="#b99d74" stroke-width="3"/>';
  for(let y=0;y<4;y++)for(let x=0;x<4;x++){if((x+y)%2)art+=`<rect x="${14+x*23}" y="${8+y*23}" width="23" height="23" fill="#796047"/>`;if(y===0||y===3)if((x+y)%2===0)art+=`<circle cx="${25.5+x*23}" cy="${22+y*23}" r="9" fill="#51405f"/><circle cx="${25.5+x*23}" cy="${19.5+y*23}" r="9" fill="${y===0?'#eadab6':'#6c5479'}" stroke="#a69284" stroke-width="1.5"/>`;}
 }else if(id==='domino'){
  art='<g transform="rotate(-15 45 55)"><rect x="21" y="9" width="40" height="91" rx="7" fill="#b59b71"/><rect x="21" y="5" width="40" height="91" rx="7" fill="#fff1cf" stroke="#b59b71" stroke-width="2"/><path d="M25 50h32" stroke="#947c59"/><g fill="#34283e"><circle cx="32" cy="24" r="4"/><circle cx="50" cy="39" r="4"/><circle cx="32" cy="64" r="4"/><circle cx="50" cy="83" r="4"/><circle cx="41" cy="74" r="4"/></g></g><g transform="rotate(15 82 59)"><rect x="62" y="17" width="40" height="83" rx="7" fill="#b59b71"/><rect x="62" y="13" width="40" height="83" rx="7" fill="#f8e8c3" stroke="#b59b71" stroke-width="2"/><path d="M66 54h32" stroke="#947c59"/><g fill="#34283e"><circle cx="73" cy="27" r="4"/><circle cx="91" cy="41" r="4"/><circle cx="82" cy="76" r="4"/></g></g>';
 }else{
  const rank=({cinquillo:'5',mus:'R',mentiroso:'?',escoba:'7','texas-holdem':'A',burro:'B',chinchon:'7',canasta:'K',pocha:'3'})[id]||'R';
  art='<g transform="rotate(-18 39 59)"><rect x="13" y="15" width="51" height="83" rx="6" fill="#aa8c61"/><rect x="13" y="11" width="51" height="83" rx="6" fill="#f1deb4" stroke="#c7ac7e" stroke-width="2"/><path d="M27 30h22m-22 8h22m-22 8h22" stroke="#a87f68" stroke-width="3"/></g><g transform="rotate(15 81 59)"><rect x="57" y="16" width="51" height="83" rx="6" fill="#aa8c61"/><rect x="57" y="12" width="51" height="83" rx="6" fill="#ecdab9" stroke="#c7ac7e" stroke-width="2"/><text x="83" y="64" text-anchor="middle" fill="#e1578b" font-size="35">♥</text></g>';
  art+=`<rect x="34" y="7" width="52" height="88" rx="6" fill="#b59972"/><rect x="34" y="3" width="52" height="88" rx="6" fill="#fff4d6" stroke="#cfb588" stroke-width="2"/><text x="42" y="25" fill="#5a384a" font-family="Georgia,serif" font-size="18" font-weight="bold">${rank}</text><text x="60" y="65" text-anchor="middle" fill="#b99145" font-family="Georgia,serif" font-size="38">${id==='mentiroso'?'?':'♣'}</text>`;
 }
 return `<svg viewBox="0 0 120 108" aria-hidden="true" focusable="false">${art}</svg>`;
}
export function renderGameChoices(games,selected,countLabel){
 return `<div class="game-options" aria-label="Juegos disponibles">${games.map(game=>{const kind=['parchis','oca','damas_espanolas','damas-espanolas'].includes(game.id)?'Tablero':game.id==='domino'?'Fichas':'Cartas';return `<label class="game-option ${game.id===selected?'chosen':''}"><input type="radio" name="game" value="${esc(game.id)}" ${game.id===selected?'checked':''}><span class="game-card-kind">${kind}</span><span class="game-check" aria-hidden="true">✓</span><span class="game-card-art">${illustration(game.id)}</span><span class="game-card-copy"><strong>${esc(game.label)}</strong><small>${countLabel(game)} jugadores</small></span></label>`;}).join('')}</div><p class="game-picker-empty" hidden>No hay juegos con ese nombre.</p><div class="game-picker-footer"><span class="game-picker-summary" role="status">Desliza para elegir</span><div class="game-picker-arrows"><button type="button" data-action="game-previous" aria-label="Elegir el juego anterior">←</button><button type="button" data-action="game-next" aria-label="Elegir el juego siguiente">→</button></div></div>`;
}
export function updateGamePicker(app,{scroll=false,instant=false}={}){
 const track=app.querySelector('.game-options');if(!track)return;
 const visible=[...track.querySelectorAll('.game-option')].filter(option=>!option.hidden),selected=track.querySelector('input:checked')?.closest('.game-option');
 for(const option of track.querySelectorAll('.game-option'))option.classList.toggle('chosen',option===selected);
 const index=visible.indexOf(selected);app.querySelector('[data-action="game-previous"]').disabled=index<=0;app.querySelector('[data-action="game-next"]').disabled=!visible.length||index===visible.length-1;
 app.querySelector('.game-picker-empty').hidden=visible.length>0;
 app.querySelector('.game-picker-summary').textContent=selected?`Elegido: ${selected.querySelector('strong').textContent}`:'Desliza para elegir';
 if(scroll){const target=selected&&!selected.hidden?selected:visible[0];if(target){const a=track.getBoundingClientRect(),b=target.getBoundingClientRect();track.scrollTo({left:track.scrollLeft+b.left-a.left-(a.width-b.width)/2,behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}}
}
export function stepGamePicker(app,direction){
 const options=[...app.querySelectorAll('.game-option')].filter(option=>!option.hidden),index=options.findIndex(option=>option.querySelector('input').checked),target=options[index<0?0:index+direction];
 target?.querySelector('input').click();target?.querySelector('input').focus({preventScroll:true});
}
export function filterGamePicker(app,query){
 const normal=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 for(const option of app.querySelectorAll('.game-option')){option.hidden=!normal(option.querySelector('strong').textContent).includes(normal(query));option.querySelector('input').disabled=option.hidden;}
 updateGamePicker(app,{scroll:true,instant:true});
}
