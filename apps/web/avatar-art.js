export const CHARACTER_NAMES = ['Berenjena','Melocotón','Plátano','Bandera','Aguacate','Cerdito','Seta','Gota','Caca','Castañas'];
export function validCharacter(value){return Number.isInteger(value) && value >= 0 && value < CHARACTER_NAMES.length;}
export function characterProfile(value){return validCharacter(value)?{character:value}:{};}
export function savedCharacter(){try {const value=localStorage.getItem('elteto.character');return value!==null&&validCharacter(Number(value))?Number(value):0;}catch{return 0;}}
export function saveCharacter(value){if(validCharacter(value))try{localStorage.setItem('elteto.character',String(value));}catch{}}
export function renderCharacterButton(character){return `<button type="button" class="character-picker-button" data-action="choose-character" aria-label="Elegir personaje. Actual: ${CHARACTER_NAMES[character]}"><span class="character-preview">${renderAvatarArtwork(character,'picker-current')}</span><span>Personaje <strong>${CHARACTER_NAMES[character]}</strong></span><span aria-hidden="true">⌄</span></button>`;}
export function renderCharacterDialog(character){return `<dialog class="character-dialog" aria-labelledby="character-title"><header><h2 id="character-title">Elige tu personaje</h2><button type="button" data-action="close-character-picker" aria-label="Cerrar selector de personajes">✕</button></header><div class="character-grid">${CHARACTER_NAMES.map((name,index)=>`<button type="button" class="character-option" data-action="select-character" data-character="${index}" aria-pressed="${index===character}" aria-label="${name}"><span>${renderAvatarArtwork(index,'picker-option')}</span><strong>${name}</strong></button>`).join('')}</div></dialog>`;}

// Transparent generated atlas. Measured row boundaries keep neighboring feet
// and steam puffs outside each avatar's window.
let avatarInstance=0;
const WIDTH = 1983, HEIGHT = 793;
const ROW_SPLITS = [410, 402, 410, 410, 412];
export function renderAvatarArtwork(character, context = 'portrait') {
  const column = character % 5, x = column * WIDTH / 5;
  const y = character < 5 ? 0 : ROW_SPLITS[column];
  const width = WIDTH / 5, height = character < 5 ? ROW_SPLITS[column] : HEIGHT - y;
  const clip = `avatar-${context}-${character}-${++avatarInstance}`;
  return `<svg viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><defs><clipPath id="${clip}"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs><image href="./assets/elteto-avatars-v3.png" width="${WIDTH}" height="${HEIGHT}" clip-path="url(#${clip})"/></svg>`;
}
