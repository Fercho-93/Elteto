export const CHARACTER_NAMES = ['Berenjeno','Peluson','Banana','Ohio','Guacameño','Cerdaco','Boletus','Gotelé','Moñigo','Huevada'];
// Visible labels break long names with a soft hyphen in the narrow picker cells.
const CHARACTER_LABELS = CHARACTER_NAMES.map(name => ({Guacameño:'Guaca&shy;meño'})[name] || name);
export function validCharacter(value){return Number.isInteger(value) && value >= 0 && value < CHARACTER_NAMES.length;}
export function characterProfile(value){return validCharacter(value)?{character:value}:{};}
export function savedCharacter(){try {const value=localStorage.getItem('elteto.character');return value!==null&&validCharacter(Number(value))?Number(value):0;}catch{return 0;}}
export function saveCharacter(value){if(validCharacter(value))try{localStorage.setItem('elteto.character',String(value));}catch{}}
export function renderCharacterButton(character){return `<button type="button" class="character-picker-button" data-action="choose-character" aria-label="Elegir avatar. Actual: ${CHARACTER_NAMES[character]}"><span class="character-preview">${renderAvatarArtwork(character,'picker-current')}</span><span>Avatar <strong>${CHARACTER_LABELS[character]}</strong></span><span aria-hidden="true">⌄</span></button>`;}
export function renderCharacterDialog(character){return `<dialog class="character-dialog" aria-labelledby="character-title"><header><h2 id="character-title">Elige tu avatar</h2><button type="button" data-action="close-character-picker" aria-label="Cerrar selector de avatares">✕</button></header><div class="character-grid">${CHARACTER_NAMES.map((name,index)=>`<button type="button" class="character-option" data-action="select-character" data-character="${index}" aria-pressed="${index===character}" aria-label="${name}"><span>${renderAvatarArtwork(index,'picker-option')}</span><strong>${CHARACTER_LABELS[index]}</strong></button>`).join('')}</div></dialog>`;}

// Native raster images avoid Safari's SVG <image>/clipPath repaint after reattachment.
const WIDTH = 1983, HEIGHT = 793;
const ROW_SPLITS = [410, 402, 410, 410, 412];
export function renderAvatarArtwork(character) {
  const column = character % 5, y = character < 5 ? 0 : ROW_SPLITS[column];
  const height = character < 5 ? ROW_SPLITS[column] : HEIGHT - y;
  return `<span class="avatar-artwork" data-avatar="${character}" aria-hidden="true" style="display:block;position:relative;overflow:hidden;width:100%;height:100%"><img src="./assets/elteto-avatars-v3.png" alt="" draggable="false" decoding="sync" loading="eager" style="position:absolute;display:block;max-width:none;width:500%;height:${HEIGHT/height*100}%;left:${-column*100}%;top:${-y/height*100}%"></span>`;
}
