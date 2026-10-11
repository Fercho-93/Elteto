// Local, unchanged traditional deck artwork. Mapping is explicit, never inferred from hidden state.
export function cardAsset(card) {
 const spanish=['oros','copas','espadas','bastos'];
 if(spanish.includes(card.suit)) {
   const rank=({'1':'A','10':'S','11':'C','12':'R'})[card.rank] || card.rank;
   if(!['A','2','3','4','5','6','7','8','9','S','C','R'].includes(rank)) throw new Error('Invalid Spanish card');
   return './assets/decks/'+rank+card.suit+'.png';
 }
 const suit=({picas:'spade',corazones:'heart',diamantes:'diamond',treboles:'club'})[card.suit];
 const rank=({A:'1',J:'jack',Q:'queen',K:'king'})[card.rank] || card.rank;
 if(!suit || !['1','2','3','4','5','6','7','8','9','10','jack','queen','king'].includes(rank)) throw new Error('Invalid French card');
 return './assets/decks/'+suit+'_'+rank+'.png';
}

// Crop windows over the original, unmodified photograph. Only the face enters
// the SVG viewport: the green felt, shadows and adjacent cards remain outside.
// The reference is a 40-card deck; 8 and 9 keep the existing Spanish artwork.
const spanishWindows={
 oros:[[49,141,109,178],[201,133,111,181],[351,140,111,179],[506,129,110,180],[651,138,110,177],[795,126,109,179],[937,129,108,181],[1080,131,108,181],[1226,130,108,182],[1368,135,109,181]],
 espadas:[[50,369,109,179],[195,368,110,179],[348,363,110,179],[502,365,110,179],[649,366,110,180],[795,358,109,182],[937,357,110,181],[1090,349,109,182],[1238,351,110,180],[1382,361,110,181]],
 copas:[[40,600,109,181],[193,599,110,182],[340,595,110,183],[491,596,110,181],[647,595,110,180],[793,592,110,182],[937,592,110,181],[1088,592,111,182],[1240,590,110,182],[1380,591,110,182]],
 bastos:[[33,830,109,181],[186,828,109,181],[337,829,110,180],[491,821,110,182],[641,821,110,183],[790,821,110,181],[940,824,110,181],[1083,823,109,181],[1240,824,110,181],[1383,826,110,182]]
};
const referenceRanks=['1','2','3','4','5','6','7','10','11','12'];
export function renderCardArtwork(card){
 const crop=spanishWindows[card.suit]?.[referenceRanks.indexOf(String(card.rank))];
 if(!crop)return `<img src="${cardAsset(card)}" alt="" draggable="false">`;
 return `<svg class="reference-card-art" viewBox="${crop.join(' ')}" preserveAspectRatio="none" aria-hidden="true" focusable="false"><image href="./assets/decks/fournier-spanish.jpg" width="1536" height="1146"/></svg>`;
}
export function renderCardBack(french=false){
 return `<span class="elteto-card-back ${french?'deck-blue':'deck-red'}" aria-hidden="true"></span>`;
}
export function renderDrawPile(count,french=false){
 if(!(count>0))return '';
 return `<div class="deck-stock ${french?'deck-blue':'deck-red'}" role="img" aria-label="Mazo ${french?'de póker':'español'}: ${count} cartas sin repartir"><span class="deck-stock-card">${renderCardBack(french)}</span><span class="deck-stock-card">${renderCardBack(french)}</span><b class="deck-stock-count">${count}${french?' cartas':''}</b></div>`;
}
