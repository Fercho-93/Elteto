// Measured portrait windows into the user's original artwork. No redrawing or generated parts.
const CROPS=[[27,62,213,213],[271,80,233,233],[523,20,238,238],[784,84,230,230],[1041,77,233,233],[9,490,239,239],[267,440,239,239],[543,477,221,221],[784,461,240,240],[1039,484,236,236]];
export function originalPortrait(character) {
 const [x,y,w,h]=CROPS[character];
 return `<div class="rival-original" data-character="${character}"><svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><image href="./assets/elteto-original-avatars.png" width="1280" height="853"/></svg></div>`;
}
// Only public identity/count/turn information is accepted here.
export function renderRivalRoster(players,esc) {
 return `<div class="rival-roster" data-count="${players.length}" style="--rival-count:${players.length}" role="group" aria-label="Jugadores rivales, en orden de turno">${players.map(p=>`<article class="table-seat rival-seat ${p.active?'active-seat':''}" data-player-id="${esc(p.id)}" aria-label="${esc(p.name)}, ${p.mascot}, ${p.count} ${esc(p.unit||'cartas')}${p.teamLabel?', '+esc(p.teamLabel):''}${p.active?', turno activo':''}" title="${esc(p.name)} · ${p.mascot} · ${p.count} ${esc(p.unit||'cartas')}${p.teamLabel?', '+esc(p.teamLabel):''}${p.active?' · Su turno':''}"><div class="rival-token">${originalPortrait(p.character)}</div><div class="rival-info" aria-hidden="true"><strong class="rival-name">${esc(p.name)}</strong><span class="rival-count ${p.count===1?'last-card':''}" data-count="${p.count}"><i></i>${p.count}${p.teamLabel?`<span class="rival-team"> · ${esc(p.teamLabel)}</span>`:'<span class="rival-count-word"> cartas</span>'}</span></div></article>`).join('')}</div>`;
}
