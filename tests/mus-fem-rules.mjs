import assert from 'node:assert/strict';
import {musEngine as e,createMusState,getAvailableActions,validateMusState,buildSpanishDeck,calculateGrande,calculateChica,calculatePairs,calculateJuego,calculatePunto,compareGrande,compareChica,comparePairs,compareJuego,comparePunto,applyAmarraco} from '../dist/game-core/index.js';
const ids=['a','b','c','d'];const hand=(...r)=>r.map((rank,i)=>({rank:String(rank),suit:['oros','copas','espadas','bastos'][i]}));
assert.deepEqual(calculateGrande(hand(3,12,2,1)),[12,12,1,1]);assert.deepEqual(calculateChica(hand(3,12,2,1)),[-1,-1,-12,-12]);
assert.equal(compareGrande(hand(12,11,7,4),hand(12,10,7,4)),1);assert.equal(compareChica(hand(1,4,5,6),hand(1,4,5,7)),1);
assert.equal(compareGrande(hand(12,3,1,2),hand(3,12,2,1)),0);
for(const [h,kind,n] of [[hand(12,3,5,6),'pares',1],[hand(12,3,12,5),'medias',2],[hand(12,3,1,2),'duples',3],[hand(12,3,12,3),'duples',3]]){assert.equal(calculatePairs(h).kind,kind);assert.equal(calculatePairs(h).points,n);}
assert.equal(comparePairs(hand(12,3,1,2),hand(11,11,7,7)),1);assert.equal(comparePairs(hand(1,2,1,2),hand(12,3,12,7)),1);
const games=[hand(12,11,10,1),hand(12,11,5,7),hand(12,11,10,3),hand(12,11,10,7),hand(12,11,10,6),hand(12,11,10,5),hand(12,11,10,4),hand(12,11,7,6)];
assert.deepEqual(games.map(h=>calculateJuego(h).total),[31,32,40,37,36,35,34,33]);for(let i=0;i<games.length-1;i++)assert.equal(compareJuego(games[i],games[i+1]),1);
assert.equal(calculatePunto(hand(12,11,7,3)),37);assert.equal(calculatePunto(hand(12,11,7,2)),28);assert.equal(comparePunto(hand(12,11,6,4),hand(12,11,5,4)),1);
assert.deepEqual(applyAmarraco(27,40),{total:27,amarracos:5,piedras:2,remaining:13,inside:false});assert.ok(applyAmarraco(36,40).inside);
const act=(s,p,a)=>e.applyAction(s,p,a);
const advance=s=>act(s,'a',{type:'advance',expectedRevision:s.revision});
const ready=s=>{while(['dealing','cards-dealt','redeal','showing','counting'].includes(s.phase))s=advance(s);return s;};
const cut=s=>{s=ready(s);return act(s,s.players[s.musTurn],{type:'mus',wantsMus:false});};
function fixture(hands,target=40){const usedCards=new Set();hands=hands.map(h=>h.map(c=>{const suit=[c.suit,...['oros','copas','espadas','bastos']].find(s=>!usedCards.has(s+':'+c.rank));usedCards.add(suit+':'+c.rank);return {...c,suit};}));let s=createMusState(ids,12,'eight-kings',target);s.hands=Object.fromEntries(ids.map((p,i)=>[p,hands[i]]));const used=new Set(hands.flat().map(c=>c.suit+':'+c.rank));assert.equal(used.size,16);s.stock=buildSpanishDeck().filter(c=>!used.has(c.suit+':'+c.rank));s.discarded=[];return s;}
const baseHands=[hand(12,3,7,5),hand(11,10,6,4),hand(3,12,2,1),hand(7,6,5,4)];
let s=createMusState(ids,22);assert.equal(s.stage,'DEALING');for(const p of ids){const v=e.view(s,p);assert.deepEqual(v.myHand,[]);assert.ok(!v.revealedHands);assert.ok(!v.hands&&!v.stock&&!v.discarded&&!v.pendingDiscard);}
s=ready(s);assert.equal(s.stage,'MUS_DECISION');const stable=JSON.stringify(s);assert.throws(()=>act(s,'b',{type:'mus',wantsMus:true}),/turno|habla/);assert.equal(JSON.stringify(s),stable);
for(let round=0;round<6;round++){
 for(let i=0;i<4;i++)s=act(s,s.players[s.musTurn],{type:'mus',wantsMus:true});assert.equal(s.stage,'MUS_DISCARD');assert.throws(()=>act(s,'a',{type:'discard',cards:[]}),/una a cuatro/);
 for(const p of ids){const card=s.hands[p][0];s=act(s,p,{type:'discard',cards:[card]});for(const q of ids){const v=e.view(s,q);assert.ok(!v.pendingDiscard&&!v.discarded&&!v.hands);assert.ok(!('analyses' in v));}assert.equal(e.view(s,'b').discardCounts[p],1);}
 assert.equal(s.stage,'MUS_REDEAL');assert.deepEqual(e.view(s,'a').myHand,[]);s=ready(s);validateMusState(s);assert.equal(s.discardNumber,round+1);
}
assert.ok(s.events.filter(ev=>ev.stage==='MUS_REDEAL').length>=6);
s=cut(s);assert.equal(s.stage,'GRANDE');assert.throws(()=>act(s,ids[s.mano],{type:'discard',cards:[s.hands[ids[s.mano]][0]]}));
// Accepted bets stay pending and never expose their computed winner.
s=cut(fixture(baseHands));s=act(s,'a',{type:'bet',amount:2});s=act(s,'b',{type:'bet',amount:5});assert.deepEqual(s.betting.history.map(h=>h.amount),[2,5]);assert.throws(()=>act(s,'c',{type:'bet',amount:5}),/entero/);s=act(s,'c',{type:'accept'});assert.deepEqual(s.scores,{A:0,B:0});assert.equal(s.phase,'chica');assert.ok(!('results' in e.view(s,'b')));assert.ok(!('winnerPlayer' in e.view(s,'b').lastResult));
// Rejected reenvites count the previous amount once, immediately.
s=cut(fixture(baseHands));s=act(s,'a',{type:'bet',amount:2});s=act(s,'b',{type:'bet',amount:8});s=act(s,'c',{type:'reject'});assert.equal(s.scores.B,2);assert.equal(s.ledger[0].cause,'reenvite rechazado');assert.equal(s.phase,'chica');
// Full hand, truthful declarations, exact ordered ledger and four private perspectives.
for(let seed=1;seed<=100;seed++){
 s=createMusState(ids,seed,'eight-kings',seed%2?30:40);let steps=0;
 while(!s.finished&&steps++<2500){
  s=ready(s);if(s.finished)break;
  for(const p of ids){const v=e.view(s,p);if(!['showdown','finished'].includes(s.phase)){assert.ok(!v.revealedHands);assert.ok(!v.results);}assert.equal(v.myHand.length,4);assert.deepEqual(v.myHand,s.hands[p]);assert.ok(!v.seed&&!v.stock&&!v.pendingDiscard);}
  const p=e.view(s,'a').turnPlayer,options=getAvailableActions(s,p),option=options.find(o=>o.type==='next-hand')||options.find(o=>o.type==='mus'&&!o.wantsMus)||options.find(o=>o.type.startsWith('declare-'))||options.find(o=>o.type==='pass')||options.find(o=>o.type==='accept')||options.find(o=>o.type==='reject');
  assert.ok(option,JSON.stringify({phase:s.phase,p,options}));s=act(s,p,{type:option.type,...(option.has!==undefined?{has:option.has}:{}),...(option.wantsMus!==undefined?{wantsMus:option.wantsMus}:{})});validateMusState(s);
 }
 assert.ok(s.finished,`seed ${seed} did not finish`);assert.ok(s.scores[s.winnerTeam]>=s.targetScore);assert.ok(e.view(s,'a').revealedHands);
 for(const t of ['A','B'])assert.equal(s.ledger.filter(x=>x.team===t).reduce((n,x)=>n+x.points,0),s.scores[t]);
}
// Stop at Grande, with later accepted envites uncounted, for both configured goals.
for(const target of [30,40]){
 s=cut(fixture(baseHands,target));s.scores={A:target-2,B:0};s=act(s,'a',{type:'bet',amount:2});s=act(s,'b',{type:'accept'});
 let n=0;while(s.phase!=='showing'&&n++<40){const p=e.view(s,'a').turnPlayer,o=getAvailableActions(s,p).find(o=>o.type==='pass'||o.type.startsWith('declare-'));s=act(s,p,{type:o.type,...(o.has!==undefined?{has:o.has}:{})});}
 s=advance(s);assert.equal(s.phase,'counting');s=advance(s);assert.ok(s.finished);assert.equal(s.scores.A,target);assert.deepEqual(s.ledger.map(x=>x.lance),['grande']);assert.ok(!s.phaseResults.chica.counted);
}
// Equal four hands: lexicographic equality resolved exclusively by mano.
const ties=fixture([hand(12,11,7,1),[{rank:'12',suit:'copas'},{rank:'11',suit:'espadas'},{rank:'7',suit:'bastos'},{rank:'1',suit:'oros'}],[{rank:'12',suit:'espadas'},{rank:'11',suit:'bastos'},{rank:'7',suit:'oros'},{rank:'1',suit:'copas'}],[{rank:'12',suit:'bastos'},{rank:'11',suit:'oros'},{rank:'7',suit:'copas'},{rank:'1',suit:'espadas'}]]);
for(let mano=0;mano<4;mano++){s=ready({...ties,mano,musTurn:mano});s=cut(s);s=act(s,ids[mano],{type:'ordago'});assert.deepEqual(getAvailableActions(s,e.view(s,'a').turnPlayer).map(a=>a.type),['accept','reject']);assert.throws(()=>act(s,e.view(s,'a').turnPlayer,{type:'bet',amount:100}),/habla/);s=act(s,e.view(s,'a').turnPlayer,{type:'accept'});assert.ok(s.finished);assert.equal(s.winnerTeam,mano%2?'B':'A');assert.ok(e.view(s,'a').revealedHands);}
// False declarations are rejected without leaking their values.
s=cut(fixture(baseHands));while(s.phase!=='pares-declaration'){const p=e.view(s,'a').turnPlayer;s=act(s,p,{type:'pass'});}assert.throws(()=>act(s,'a',{type:'declare-pairs',has:false}),/declaración/);
assert.throws(()=>act(s,'a',{type:'declare-pairs',has:true,expectedRevision:s.revision-1}),/avanzado/);
// First negada, then accepted órdago: no previously accepted lance is scored.
s=cut(fixture(baseHands));s=act(s,'a',{type:'bet',amount:4});s=act(s,'b',{type:'reject'});assert.equal(s.scores.A,1);assert.equal(s.ledger[0].cause,'negada');
s=cut(fixture(baseHands));s=act(s,'a',{type:'bet',amount:8});s=act(s,'b',{type:'accept'});s=act(s,'a',{type:'ordago'});s=act(s,'b',{type:'accept'});assert.ok(s.finished);assert.deepEqual(s.ledger.map(e=>e.lance),['chica']);assert.equal(s.ledger[0].cause,'órdago');
// No game leads to Punto, whose intrinsic point has no extra deje.
s=cut(fixture([hand(12,11,6,4),hand(12,11,5,4),hand(12,11,6,2),hand(12,11,5,1)]));
while(s.phase!=='punto'){const p=e.view(s,'a').turnPlayer,o=getAvailableActions(s,p).find(o=>o.type==='pass'||o.type.startsWith('declare-'));s=act(s,p,{type:o.type,...(o.has!==undefined?{has:o.has}:{})});}
assert.ok(s.events.some(e=>e.type==='no-juego'));s=act(s,'a',{type:'bet',amount:2});s=act(s,'b',{type:'reject'});assert.equal(s.ledger.filter(e=>e.lance==='punto').reduce((n,e)=>n+e.points,0),1);
s=ready(s);assert.equal(s.phaseResults.pares.kind,'none');assert.ok(s.phaseResults.pares.counted);assert.equal(s.ledger.filter(e=>e.lance==='punto').reduce((n,e)=>n+e.points,0),2);assert.equal(s.ledger.filter(e=>e.lance==='punto'&&e.cause==='punto').length,1);
// Independent confirmations are accepted only in the same discard round.
s=ready(createMusState(ids,7));for(let i=0;i<4;i++)s=act(s,ids[s.musTurn],{type:'mus',wantsMus:true});const rev=s.revision,round=e.view(s,'a').discardRound;
for(const p of ids)s=act(s,p,{type:'discard',cards:[s.hands[p][0]],expectedRevision:rev,expectedDiscardRound:round});assert.equal(s.phase,'redeal');s=ready(s);assert.throws(()=>act(s,'a',{type:'discard',cards:[s.hands.a[0]],expectedRevision:rev,expectedDiscardRound:round}),/avanzado/);
// Third seat can cut early; other cuts wait unless a team is within five.
s=ready(createMusState(ids,5));assert.ok(getAvailableActions(s,'c').some(o=>o.type==='mus'&&!o.wantsMus));assert.ok(!getAvailableActions(s,'b').some(o=>o.type==='mus'));s.scores.A=35;assert.ok(getAvailableActions(s,'b').some(o=>o.type==='mus'&&!o.wantsMus));
// The postre minimum cannot accept an órdago in Pares or Juego.
for(const [lance,hands] of [['pares',[hand(12,3,7,5),hand(1,2,6,4),hand(11,10,7,4),hand(7,6,5,4)]],['juego',[hand(12,11,10,1),hand(12,11,7,6),hand(7,6,5,4),hand(7,6,5,1)]]]){
 s=cut(fixture(hands));while(s.phase!==lance){const p=e.view(s,'a').turnPlayer,o=getAvailableActions(s,p).find(o=>o.type==='pass'||o.type.startsWith('declare-'));s=act(s,p,{type:o.type,...(o.has!==undefined?{has:o.has}:{})});}
 s=act(s,'a',{type:'ordago'});assert.deepEqual(getAvailableActions(s,'b').map(o=>o.type),['reject']);assert.throws(()=>act(s,'b',{type:'accept'}),/mínima de postre/);
}
// A supplied seed and identical actions yield an identical serialized state.
assert.equal(JSON.stringify(cut(createMusState(ids,777))),JSON.stringify(cut(createMusState(ids,777))));
console.log('FEM V7: comparadores, 100 partidas 30/40, mus repetido, declaraciones, privacidad, envites, reenvites, negadas, órdago, empates, amarracos y corte del recuento: OK');
