// Nombres de carta legibles, iguales en la mesa, los avisos de turno y los lectores de pantalla.
const SPANISH=['oros','copas','espadas','bastos'];
export function cardName(card,{poker=false}={}){
 if(!card)return 'Carta oculta';
 if(card.suit==='joker')return 'Comodín';
 const spanish=SPANISH.includes(card.suit),pokerDeck=poker||!spanish||['A','J','Q','K'].includes(card.rank);
 const rank=(spanish?{A:'As',J:'Sota',Q:'Caballo',K:'Rey','1':'As','10':pokerDeck?'10':'Sota','11':'Caballo','12':'Rey'}:{A:'As',J:'Jota',Q:'Reina',K:'Rey'})[card.rank]||card.rank;
 return `${rank} de ${card.suit}`;
}
