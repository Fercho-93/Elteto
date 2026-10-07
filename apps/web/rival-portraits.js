import { renderAvatarArtwork } from './avatar-art.js';
// Newly generated transparent characters, shared with the menu gallery.
export function originalPortrait(character) {
 return `<div class="rival-original" data-character="${character}">${renderAvatarArtwork(character)}</div>`;
}
// Only public identity/count/turn information is accepted here.
export function renderRivalRoster(players,esc) {
 return `<div class="rival-roster" data-count="${players.length}" style="--rival-count:${players.length}" role="group" aria-label="Jugadores rivales, en orden de turno">${players.map(p=>`<article class="table-seat rival-seat ${p.active?'active-seat':''}" data-player-id="${esc(p.id)}" aria-label="${esc(p.name)}, ${p.mascot}, ${p.count} ${esc(p.unit||'cartas')}${p.teamLabel?', '+esc(p.teamLabel):''}${p.active?', turno activo':''}" title="${esc(p.name)} · ${p.mascot} · ${p.count} ${esc(p.unit||'cartas')}${p.teamLabel?', '+esc(p.teamLabel):''}${p.active?' · Su turno':''}"><div class="rival-token">${originalPortrait(p.character)}</div><div class="rival-info" aria-hidden="true"><strong class="rival-name">${esc(p.name)}</strong><span class="rival-count ${p.count===1?'last-card':''}" data-count="${p.count}"><i></i>${p.count}${p.teamLabel?`<span class="rival-team"> · ${esc(p.teamLabel)}</span>`:'<span class="rival-count-word"> cartas</span>'}</span></div></article>`).join('')}</div>`;
}
