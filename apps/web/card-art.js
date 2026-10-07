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
