// Original vector artwork, shared by the accessible hand and the 3D textures.
// No photographs of a commercial deck, external fonts or network resources.
export const suitSvg = (suit) => ({
 oros:'<circle cx="30" cy="30" r="23" fill="#edb637" stroke="#703b15" stroke-width="2"/><circle cx="30" cy="30" r="18" fill="none" stroke="#fff08b" stroke-width="3"/><path d="M31 14c-10 1-11 12-6 15l-2 9-7 5h28l-9-8 2-8c6-7 1-14-6-13" fill="#af721b"/><path d="m18 15 4 4m21-4-4 4M14 29h5m23 0h5" stroke="#703b15" stroke-width="2"/>',
 copas:'<path d="M13 11h34l-5 24-12 7-12-7z" fill="#b52d27" stroke="#39251b" stroke-width="2"/><path d="M15 15h30l-2 7H17z" fill="#eac043"/><path d="m19 24 7 6 4-7 4 7 7-6" fill="none" stroke="#168153" stroke-width="3"/><path d="M30 40v10m-13 2h26" stroke="#bc871e" stroke-width="5"/><path d="M13 12h34m-30 40h26" stroke="#452914" stroke-width="2"/>',
 espadas:'<path d="m30 3 6 9-2 31h-8l-2-31z" fill="#bed4de" stroke="#35485a" stroke-width="2"/><path d="M30 10v30" stroke="#f6fcfc" stroke-width="2"/><path d="M17 41h26M30 43v12" stroke="#d1a126" stroke-width="5"/><circle cx="30" cy="55" r="3" fill="#ba482f"/>',
 bastos:'<path d="m22 55-5-8 14-40 10-3 3 9-12 39z" fill="#358343" stroke="#4d321e" stroke-width="2"/><path d="m23 45 12-33m-9 25 10-2m-7-6 10-3" stroke="#e3bb3a" stroke-width="3"/><path d="m27 19-8-4m15 9 9 2" stroke="#a2482b" stroke-width="3"/>',
 picas:'<path d="M30 4C20 16 7 21 8 34c0 11 15 14 20 5l-5 15h14l-5-15c5 9 20 6 20-5C53 21 40 16 30 4" fill="#202635"/>',
 corazones:'<path d="M30 52 9 30C-4 10 19 0 30 16 41 0 64 10 51 30z" fill="#b12d32"/>',
 diamantes:'<path d="m30 3 22 27-22 27L8 30z" fill="#b12d32"/>',
 treboles:'<path d="M30 3c-13 0-17 16-8 23C2 16-5 42 12 45c7 2 14-1 17-6l-7 15h16l-7-15c3 5 10 8 17 6 17-3 10-29-10-19C47 19 43 3 30 3" fill="#202635"/>',
})[suit] || '';
const icon=(suit,x,y,w=42,flip=false)=>`<g transform="translate(${x} ${y}) ${flip ? `translate(${w} ${w}) rotate(180)` : ''} scale(${w/60})">${suitSvg(suit)}</g>`;
function court(card) {
 const king=card.rank==='12'||card.rank==='K', horse=card.rank==='11', queen=card.rank==='Q';
 const head=`<ellipse cx="100" cy="88" rx="21" ry="26" fill="#eec490" stroke="#2c2923" stroke-width="2"/><path d="M81 83h9m17 0h9m-19 5-3 10 8 1m-13 7h20" fill="none" stroke="#39312c" stroke-width="2"/>`;
 const crown=king||queen ? '<path d="m77 69-8-27 20 13 11-21 12 21 19-13-8 27z" fill="#e7b132" stroke="#3e3022" stroke-width="3"/><path d="M76 65h48" stroke="#c2322b" stroke-width="4"/>' : '<path d="M77 70c-4-17 6-27 23-27l22 8-4 21z" fill="#bc3329" stroke="#292520" stroke-width="3"/><path d="M110 47q22-17 28-7l-16 19" fill="#19794d"/>';
 const robes='<path d="m78 112-26 27 7 63 31 18h26l26-18 6-63-26-27z" fill="#b7362d" stroke="#2e2a23" stroke-width="3"/><path d="m87 115-6 100 34 0-5-100" fill="#e0b138" stroke="#2e2a23" stroke-width="2"/><path d="m56 145 27 8m-23 17 24 8m35-25 25-8m-25 32 21-8" stroke="#26734c" stroke-width="10"/><path d="m93 129 11 8-11 9 11 9-11 9 11 9" fill="none" stroke="#884520" stroke-width="2"/>';
 const mount=horse ? '<path d="m58 158 23-12 47 4 24-36 21 9-9 31-29 27-69 5-10 40H43l10-44z" fill="#f6eee0" stroke="#342a24" stroke-width="3"/><path d="m159 118 9-14 4 22m-37 33 25-28" fill="#5a3523"/><circle cx="165" cy="134" r="2" fill="#29201b"/><path d="m63 183-5 48m65-51 11 51" stroke="#35291f" stroke-width="5"/>' : '<path d="M70 216v17m49-17v17" stroke="#253b63" stroke-width="13"/>';
 return `<rect x="40" y="31" width="120" height="210" rx="4" fill="#f3e3b9" stroke="#a79063"/>${robes}${head}${crown}${mount}<path d="m136 137 13-12 7 6-13 13z" fill="#edc58d" stroke="#3b3024"/>${icon(card.suit,139,90,27)}<path d="M54 236h92" stroke="#bf9d63" stroke-width="2"/>`;
}
export function cardSvg(card, corners=true) {
 const rankText=String(card.rank).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[ch]);
 const n=card.rank==='A'?1:Number(card.rank);
 const figure=['10','11','12'].includes(card.rank)&&['oros','copas','espadas','bastos'].includes(card.suit)||['J','Q','K'].includes(card.rank);
 const red=['corazones','diamantes'].includes(card.suit);
 let center='';
 if(figure) center=court(card);
 else if(n===1) center=icon(card.suit,58,95,84);
 else {
   const corners=[[43,47],[115,47],[43,211],[115,211]];
   const six=[[43,47],[115,47],[43,129],[115,129],[43,211],[115,211]];
   const eight=[...six,[79,88],[79,170]];
   const coords={2:[[79,47],[79,211]],3:[[79,47],[79,129],[79,211]],4:corners,5:[...corners,[79,129]],6:six,7:[...six,[79,88]],8:eight,9:[...corners,[43,102],[115,102],[43,156],[115,156],[79,129]],10:[...corners,[43,102],[115,102],[43,156],[115,156],[79,75],[79,183]]}[n]||[];
   for(const [x,y] of coords) center+=icon(card.suit,x,y,42,y>129);
 }
 const corner=corners?`<g fill="${red?'#b12d32':'#272a26'}"><text x="12" y="29" font-family="Georgia,serif" font-size="24" font-weight="bold">${rankText}</text>${icon(card.suit,9,35,22)}<g transform="translate(200 280) rotate(180)"><text x="12" y="29" font-family="Georgia,serif" font-size="24" font-weight="bold">${rankText}</text>${icon(card.suit,9,35,22)}</g></g>`:'';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="200" height="280" aria-hidden="true"><rect x="1" y="1" width="198" height="278" rx="12" fill="#fff4db" stroke="#bbaa88" stroke-width="2"/><rect x="6" y="6" width="188" height="268" rx="9" fill="none" stroke="#e3d0ad"/>${center}${corner}</svg>`;
}
