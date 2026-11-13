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

// Each of the 40 faces of the original photograph (fournier-spanish.jpg) is
// straightened and trimmed to its own image, so the whole card is visible even
// though the photographed cards sit slightly askew. They are plain <img> faces:
// card-paint.js reuses the decoded nodes across redraws, with no blank frames.
// The reference is a 40-card deck; 8 and 9 keep the existing Spanish artwork.
const referenceSuits=['oros','espadas','copas','bastos'];
const referenceRanks=['1','2','3','4','5','6','7','10','11','12'];
const referenceFace=(suit,rank)=>`./assets/decks/fournier/${rank}${suit}.webp`;
// Keep every face decoded in memory, so a new node for a known card paints at once.
const warmFaces=[];
function warmReferenceDeck(){
 if(warmFaces.length||typeof Image==='undefined')return;
 for(const suit of referenceSuits)for(const rank of referenceRanks){const img=new Image();img.decoding='async';img.src=referenceFace(suit,rank);img.decode?.().catch(()=>{});warmFaces.push(img);}
}
export function renderCardArtwork(card){
 const rank=String(card.rank);
 if(!referenceSuits.includes(card.suit)||!referenceRanks.includes(rank))return `<img src="${cardAsset(card)}" alt="" draggable="false">`;
 warmReferenceDeck();
 return `<img class="reference-card-art" src="${referenceFace(card.suit,rank)}" alt="" draggable="false" decoding="sync">`;
}
export function renderCardBack(french=false){
 return `<span class="elteto-card-back ${french?'deck-blue':'deck-red'}" aria-hidden="true"></span>`;
}
export function renderDrawPile(count,french=false){
 if(!(count>0))return '';
 return `<div class="deck-stock ${french?'deck-blue':'deck-red'}" role="img" aria-label="Mazo ${french?'de póker':'español'}: ${count} cartas sin repartir"><span class="deck-stock-card">${renderCardBack(french)}</span><span class="deck-stock-card">${renderCardBack(french)}</span><b class="deck-stock-count">${count}${french?' cartas':''}</b></div>`;
}
