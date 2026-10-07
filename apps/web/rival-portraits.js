import { renderAvatarArtwork } from './avatar-art.js';
// Newly generated transparent characters, shared with the menu gallery.
export function originalPortrait(character) {
 return `<div class="rival-original" data-character="${character}">${renderAvatarArtwork(character)}</div>`;
}
// Only public identity/count/turn information is accepted here.
export function renderRivalRoster(players,esc) {
 return `<div class="rival-roster player-roster" data-count="${players.length}" style="--rival-count:${players.length}" role="group" aria-label="Jugadores, en orden de turno">${players.map(p=>`<article class="table-seat rival-seat ${p.isSelf?'self-seat ':''}${p.active?'active-seat':''}" data-player-id="${esc(p.id)}" ${p.active?'aria-current="true"':''} aria-label="${esc(p.name)}${p.isSelf?', tú':''}, ${p.mascot}, ${p.count} ${esc(p.unit||'cartas')}${p.teamLabel?', '+esc(p.teamLabel):''}${p.active?', turno activo':''}" title="${esc(p.name)}${p.isSelf?' · tú':''} · ${p.mascot} · ${p.count} ${esc(p.unit||'cartas')}${p.teamLabel?', '+esc(p.teamLabel):''}${p.active?' · Su turno':''}"><div class="rival-token">${originalPortrait(p.character)}${p.active?'<span class="player-turn-marker" aria-hidden="true">▾</span>':''}${p.roll!==undefined?`<span class="player-roll" aria-label="Tirada: ${esc(p.roll)}">${esc(p.roll)}</span>`:''}</div><div class="rival-info" aria-hidden="true"><strong class="rival-name">${p.isSelf?'Tú':esc(p.name)}</strong><span class="rival-count ${p.count===1?'last-card':''}" data-count="${p.count}"><i></i>${p.count}${p.teamLabel?`<span class="rival-team"> · ${esc(p.teamLabel)}</span>`:'<span class="rival-count-word"> cartas</span>'}</span></div></article>`).join('')}</div>`;
}

// Scroll only the player strip, keeping the current turn visible on narrow screens.
export function revealActivePlayer(app) {
 const roster=app.querySelector('.player-roster'),active=roster?.querySelector('[aria-current="true"]');
 if(!active)return;
 const frame=roster.getBoundingClientRect(),seat=active.getBoundingClientRect();
 if(seat.left<frame.left||seat.right>frame.right)roster.scrollLeft+=seat.left-frame.left-(frame.width-seat.width)/2;
}
