import {speechText} from './table-speech.js';
import {DICE_DURATION,PAWN_STEP,CHECKER_STEP,PIECE_TRANSFER,CAPTURE_FADE,gooseFlights} from './game-physics.js';
// Public differences only: never use an opponent's private hand or future options.
export const TURN_INTRO=350,TURN_RESULT=1100;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export const viewIdentity=(change)=>`${change.gameId||change.view.id}:${change.view.players.join('|')}:${change.playerId||''}:${change.view.handNumber||1}`;
export function parchisRoutes(before,after){
 if(!before?.pieces||!after.pieces)return [];
 const moved=[];
 for(const player of after.players)after.pieces[player].forEach((to,piece)=>{
  const from=before.pieces[player]?.[piece];if(from===undefined||from===to)return;
  const route=from>=0&&to>from?Array.from({length:to-from+1},(_,i)=>from+i):[from,to];
  moved.push({player,piece,from,to,route,duration:route.length>2?(route.length-1)*PAWN_STEP:PIECE_TRANSFER});
 });
 return moved;
}
export function publicTurnEvent(before,after){
 if(!before||!after||!same(before.players,after.players))return null;
 const roll=after.lastRoll&&(after.lastRoll.sequence!==before.lastRoll?.sequence)?after.lastRoll:null;
 const checkers=after.boardKind==='checkers'&&!same(before.lastMove,after.lastMove)?after.lastMove:null;
 const capture=after.boardKind==='capture'&&after.lastPlay?.sequence!==before.lastPlay?.sequence?after.lastPlay:null;
 const pawns=parchisRoutes(before,after),trick=after.trick?.find(t=>!before.trick?.some(old=>old.player===t.player&&old.card.id===t.card.id));
 const speech=after.lastSpeech?.sequence!==before.lastSpeech?.sequence?after.lastSpeech:null;
 const discarded=before.awaitingDiscardFrom?.find(p=>!after.awaitingDiscardFrom?.includes(p));
 // Log arrays can be capped, so compare their contents rather than their length.
 const meaningful=roll||checkers||speech||pawns.length||!same(before.log,after.log)||before.phase!==after.phase||before.turnPlayer!==after.turnPlayer||!same(before.handSizes,after.handSizes)||!same(before.scores,after.scores);
 if(!meaningful)return null;
 const actor=roll?.player||checkers?.player||capture?.player||speech?.player||trick?.player||discarded||before.turnPlayer;
 let motion=after.boardKind==='domino'?PIECE_TRANSFER:700,kind='action',detail=after.log?.at(-1)||'Jugada realizada';
 if(roll){kind='roll';motion=DICE_DURATION;detail=`Dado: ${roll.value}`;}
 if(after.boardKind==='oca'&&roll){kind='goose';motion=Math.max(...gooseFlights(before,after,roll).map(f=>f.delay+f.duration));detail=`Dado ${roll.value} · ${roll.from} → ${roll.to}${roll.to!==roll.landing?' · casilla especial':''}`;}
 if(checkers){kind='checkers';motion=(checkers.path.length-1)*CHECKER_STEP+(checkers.captures.length?CAPTURE_FADE:0);detail=`${checkers.path.map(i=>i+1).join(' → ')}${checkers.captures.length?` · ${checkers.captures.length} capturas`:''}`;}
 if(pawns.length){kind='parchis';const travel=Math.max(0,...pawns.filter(p=>p.to>=0).map(p=>p.duration));motion=(roll?DICE_DURATION:0)+travel+(pawns.some(p=>p.to<0)?PIECE_TRANSFER:0);if(!travel&&!roll)motion=PIECE_TRANSFER;}
 // Announce the action independently of which player won its result.
 let action=kind==='roll'||kind==='goose'?'Tira el dado':kind==='checkers'||kind==='parchis'?'Mueve ficha':trick?'Juega carta':after.boardKind==='domino'?'Coloca ficha':discarded?'Descarta':before.phase!==after.phase?'Resuelve el turno':'Hace su jugada';
 if(['spanish-40','legacy-french-52'].includes(after.ruleset)&&after.handSizes[actor]<before.handSizes[actor])action='Juega carta';
 if(capture){action='Juega carta';detail=`${capture.card.rank} de ${capture.card.suit}${capture.capturedCount?` · recoge ${capture.capturedCount}${capture.sweep?' · escoba':''}`:' · la deja en la mesa'}`;motion=capture.capturedCount?1200:700;}
 if(after.boardKind==='tricks'&&before.trick?.length&&!after.trick?.length){action='Recoge la baza';detail=`${after.turnPlayer} recoge las cartas`;}
 if(after.boardKind==='burro'){action='Roba boca abajo';detail=`Retira ${(after.discardCount-before.discardCount)/2} parejas`;}
 if(after.boardKind==='oca'&&!roll){action='Pasa turno';detail=before.prison===actor?'Espera en prisión':'Pierde el turno';}
 if(after.bets?.[actor]!==before.bets?.[actor]&&after.bets?.[actor]!==undefined){action='Apuesta';detail=`${after.bets[actor]} fichas`;}
 if(speech){kind='speech';action=speech.kind==='declare'?'Declara cartas':speech.kind==='pass'?'Pasa':'Cuestiona la jugada';detail=speechText(speech);motion=1100;}
 let result=detail;
 if(after.finished)result=after.winner?`${after.winner} gana la partida`:after.winnerTeam?`Gana la pareja ${after.winnerTeam}`:after.loser?`${after.loser} pierde`:'Partida terminada';
 else if(speech?.kind==='challenge')result=after.log?.at(-1)||detail;
 else if(after.handWinner)result=`${after.handWinner} gana la mano`;
 else if(after.phase==='collect')result=after.log?.at(-1)||detail;
 else if(after.boardKind==='oca'&&roll&&after.turnPlayer===actor)result=detail+' · vuelve a tirar';
 return {actor,action,detail,result,kind,motion,pawns};
}
export function readableTurn(text,players,name){
 let result=String(text);
 for(const id of [...players].sort((a,b)=>b.length-a.length)){
  const safe=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  result=result.replace(new RegExp(`(^|[^\\w-])${safe}(?=$|[^\\w-])`,'g'),(_,prefix)=>prefix+name(id));
 }
 return result;
}
