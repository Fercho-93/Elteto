import assert from 'node:assert/strict';
import {readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GAME_CATALOG, listGames, getGame, buildCardMaterial, buildDominoSet, canPlaceCinquillo, cinquilloEngine, musEngine, musRank, musCardValue} from '../dist/game-core/index.js';

const provenance = JSON.parse(await readFile('reglas_juegos/procedencia.json','utf8'));
assert.equal(GAME_CATALOG.length,20);
assert.equal(new Set(GAME_CATALOG.map(g=>g.id)).size,20);
assert.deepEqual(GAME_CATALOG.filter(g=>g.status==='playable').map(g=>g.id).sort(),listGames().map(g=>g.id).sort());
for (const source of provenance) {
  const bytes=await readFile(`reglas_juegos/${source.archivo}`);
  assert.equal(bytes.length,source.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),source.sha256);
  const plan=GAME_CATALOG.find(g=>g.id.replace(/-/g,"_")===source.slug);
  assert.equal(plan.rules.sha256,source.sha256);
  assert.equal((await stat(`dist/${plan.rules.file}`)).size,source.bytes);
  assert.ok(plan.phases.length && plan.actions.length && plan.acceptance.length);
  if(plan.status==='planned') assert.throws(()=>getGame(plan.id));
  const inert=await readFile(`dist/reglas_juegos/lectura/${plan.id.replace(/-/g,"_")}.html`,'utf8');
  assert.doesNotMatch(inert,/<script|<iframe|<form/i);
}
const sw=await readFile('dist/sw.js','utf8');
assert.ok(sw.includes('./game-core/catalog.js'));
for(const s of provenance) assert.ok(sw.includes(`./reglas_juegos/${s.archivo}`));
for(const [kind,size] of [['spanish-40',40],['spanish-48',48],['french-52',52],['french-jokers-54',54],['spanish-poker-54',54]]) {
  const cards=buildCardMaterial(kind,2);
  assert.equal(cards.length,2*size);
  assert.equal(new Set(cards.map(c=>c.id)).size,2*size);
}
assert.throws(()=>buildCardMaterial('spanish-40',0));
assert.equal(buildDominoSet().length,28);
assert.equal(buildDominoSet().filter(t=>t.left===t.right).length,7);
assert.ok(canPlaceCinquillo({oros:{low:4,high:6}},{suit:'oros',rank:'10'}));
assert.equal(canPlaceCinquillo({oros:{low:4,high:6}},{suit:'oros',rank:'8'}),false);
assert.equal(canPlaceCinquillo({},{suit:'corazones',rank:'5'}),false);
assert.equal(canPlaceCinquillo({},{suit:'corazones',rank:'5'},'legacy-french-52'),true);
const ids=['a','b','c','d'];
// Last card: scoring uses remaining cards once, and only the hand winner can deal.
let c=cinquilloEngine.createInitialState(ids,19);
c.hands={a:[{suit:'oros',rank:'6'}],b:[{suit:'copas',rank:'1'}],c:[{suit:'bastos',rank:'12'}],d:[{suit:'espadas',rank:'2'}]};
c.table={oros:{low:4,high:4}}; c.turn=0;
c=cinquilloEngine.applyAction(c,'a',{type:'play',card:c.hands.a[0]});
assert.deepEqual(c.scores,{a:8,b:-1,c:-1,d:-1});
assert.equal(c.finished,false);
assert.throws(()=>cinquilloEngine.applyAction(c,'b',{type:'next-hand'}));
const next=cinquilloEngine.applyAction(c,'a',{type:'next-hand'});
assert.equal(next.handNumber,2);assert.deepEqual(next.scores,c.scores);
assert.equal(Object.values(next.hands).flat().length,40);
assert.equal(musRank('3','eight-kings'),musRank('12','eight-kings'));
assert.equal(musRank('2','eight-kings'),musRank('1','eight-kings'));
assert.equal(musCardValue('3','eight-kings'),10);
assert.equal(musCardValue('2','eight-kings'),1);
assert.equal(musCardValue('3','four-kings'),3);
// An accepted ordago awards one complete game, and the third game ends the match.
let m=musEngine.createInitialState(ids,10);
for(let n=1;n<=3;n++) {
  m.hands={a:[{suit:'oros',rank:'12'},{suit:'copas',rank:'3'},{suit:'espadas',rank:'12'},{suit:'bastos',rank:'3'}],b:[{suit:'oros',rank:'1'},{suit:'copas',rank:'2'},{suit:'espadas',rank:'1'},{suit:'bastos',rank:'2'}],c:[{suit:'oros',rank:'4'},{suit:'copas',rank:'4'},{suit:'espadas',rank:'4'},{suit:'bastos',rank:'4'}],d:[{suit:'oros',rank:'5'},{suit:'copas',rank:'5'},{suit:'espadas',rank:'5'},{suit:'bastos',rank:'5'}]};
  m.phase='grande';m.betting={turnSeat:0,pendingBet:null,previousAmount:1,consecutivePasses:0};
  m=musEngine.applyAction(m,'a',{type:'ordago'});
  m=musEngine.applyAction(m,'b',{type:'accept'});
  assert.equal(m.gamesWon.A,n);assert.equal(m.finished,n===3);
  assert.ok(musEngine.view(m,'a').revealedHands);
  if(n<3){m=musEngine.applyAction(m,m.players[m.mano],{type:'next-hand'});assert.deepEqual(m.scores,{A:0,B:0});}
}
// First-hand mus corrido: the player who cuts is mano.
m=musEngine.createInitialState(ids,22);
m=musEngine.applyAction(m,'a',{type:'mus',wantsMus:true});
m=musEngine.applyAction(m,'b',{type:'mus',wantsMus:false});
assert.equal(m.mano,1);assert.equal(m.betting.turnSeat,1);
// Rejected punto counts its intrinsic point at showdown, as well as immediate deje.
m=musEngine.createInitialState(ids,11);
m.hands=Object.fromEntries(ids.map((id,i)=>[id,[1,4,5,6].map(rank=>({suit:['oros','copas','espadas','bastos'][i],rank:String(rank)}))]));
m.phase='juego';m.phaseIndex=3;m.betting={turnSeat:0,pendingBet:null,previousAmount:1,consecutivePasses:0};
m=musEngine.applyAction(m,'a',{type:'bet',amount:2});
m=musEngine.applyAction(m,'b',{type:'reject'});
assert.equal(m.scores.A,2);
// A pre-upgrade state preserves four kings and the single-game ending.
m=musEngine.createInitialState(ids,23);
for(const field of ['ruleset','gamesWon','targetGames','gameWinner']) delete m[field];
assert.equal(musEngine.view(m,'a').ruleset,'four-kings');
assert.equal(musEngine.view(m,'a').targetGames,1);
// Refill when only the last player is missing cards excludes that player's discard.
m=musEngine.createInitialState(ids,24);
m.ruleset='four-kings';m.handNumber=2;m.phase='discard';
m.discarded=m.stock.slice(5);m.stock=m.stock.slice(0,5);
const removed=m.hands.d.slice();
for(const id of ids) m=musEngine.applyAction(m,id,{type:'discard',cards:id==='d'?removed:[m.hands[id][0]]});
assert.ok(m.hands.d.every(c=>!removed.some(d=>d.suit===c.suit && d.rank===c.rank)));
const all=[...Object.values(m.hands).flat(),...m.stock,...m.discarded];
assert.equal(all.length,40);assert.equal(new Set(all.map(c=>`${c.suit}:${c.rank}`)).size,40);
console.log('20 rules, byte preservation, offline archive, 20 playable engines, materials, Spanish scoring and Mus matches: OK');
