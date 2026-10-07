// Local presentation assets only. Atlas crops are measured per illustration, not equal cells.
// Explicit SVG clips prevent neighbouring sprites bleeding into portrait letterboxing.
export function rivalArtwork(character,side=false,layer='body'){
 const bounds=side?[[5,73,304,432],[314,120,306,385],[634,78,294,427],[933,150,300,355],[1234,142,302,363],[6,613,303,309],[309,520,338,402],[647,546,274,376],[925,525,294,397],[1218,575,318,347]]:[[6,80,302,425],[309,140,315,365],[631,94,278,411],[914,174,316,331],[1233,160,300,345],[6,621,298,301],[304,521,333,401],[639,561,267,361],[913,544,300,378],[1208,578,328,344]];
 const [x,y,w,h]=bounds[character];
 const clipId=`rival-clip-${character}-${side?'side':'front'}-${layer}`;
 const contour=character===6?[[0,0],[1,0],[1,.65],[.90,.80],[.94,1],[.06,1],[.06,.80],[0,.65]]:character===9?[[.02,0],[1,0],[1,1],[.02,1]]:[[0,0],[1,0],[1,1],[0,1]];
 return `<svg class="rival-art" viewBox="0 0 ${w} ${h}" aria-hidden="true" preserveAspectRatio="xMidYMax meet"><defs><clipPath id="${clipId}" clipPathUnits="userSpaceOnUse"><polygon points="${contour.map(([a,b])=>`${a*w},${b*h}`).join(' ')}"/></clipPath></defs><g clip-path="url(#${clipId})"><image x="${-x}" y="${-y}" href="./assets/elteto-${side?'mascots-bust-side-v2.png':'mascots-bust-v2.png'}" width="1536" height="1024"/></g></svg>`;
}
export function renderRivalPortrait(character,name,side = false) {
 return '<div class="player-character" role="img" aria-label="'+name+'"><div class="rival-portrait" data-character="'+character+'">'+rivalArtwork(character,side)+'</div></div>';
}
