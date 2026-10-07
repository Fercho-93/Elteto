import assert from 'node:assert/strict';
import {listGames,getGame,createRng,buildCardMaterial,checkersMoves,evaluatePoker,comparePoker,pokerPayout,captures15,analyzeMelds,contractGroups,meldKind,legalTrickCards,GAME_CATALOG,settleJulepe} from '../dist/game-core/index.js';

const old=new Set(['mus','cinquillo','parchis']),games=listGames().filter(g=>!old.has(g.id));
assert.equal(games.length,17);
const ids=n=>Array.from({length:n},(_,i)=>`player-${i}`),random=createRng(713);
const pick=items=>items[Math.floor(random()*items.length)];
function stepAction(engine,s){const p=s.players[s.turn],v=engine.view(s,p);
 if(v.validCards?.length)return {type:'play',card:pick(v.validCards)};
 if(s.id==='damas_espanolas')return {type:'move',path:pick(v.moves).path};
 if(s.id==='escoba'&&s.phase==='play'){const c=pick(s.hands[p]),value=Number(c.rank)>7?Number(c.rank)-2:Number(c.rank),combos=captures15(s.table,15-value);return {type:'capture',card:c.id,table:combos.length?pick(combos):[]};}
 if(s.id==='mentiroso'&&s.phase==='respond')return {type:random()<.03?'challenge':'trust'};
 if(s.id==='mentiroso'&&s.phase==='play'){const cards=s.hands[p].slice(0,1);return {type:'play-facedown',cards:cards.map(c=>c.id),rank:s.declared||(cards[0].rank==='1'?'2':cards[0].rank)};}
 if(s.id==='julepe'&&s.phase==='discard')return {type:'discard',cards:s.hands[p].slice(5).map(c=>c.id)};
 if(s.id==='texas_holdem'&&s.phase!=='result'){const action=v.options.find(o=>o.action.type==='call'||o.action.type==='check').action;return random()<.13&&v.options.some(o=>o.action.type==='all-in')?{type:'all-in'}:action;}
 if(s.id==='siete_y_medio'){if(s.phase==='bet')return {type:'bet',amount:1};if(s.phase!=='result')return {type:v.total<5?'hit':'stand'};}
 const options=v.options.filter(o=>!['offer-draw','declare-capote','take-pinta'].includes(o.action.type));
 assert.ok(options.length,`No action: ${s.id}/${s.phase}/${p}`);return pick(options).action;
}
let matches=0,actions=0;
for(const engine of games){
 const counts=GAME_CATALOG.find(g=>g.id===engine.id).players;
 for(const count of counts){let s=engine.createInitialState(ids(count),71+count);const snapshot=JSON.stringify(s);assert.throws(()=>engine.applyAction(s,'intruder',{type:'play'}));assert.equal(JSON.stringify(s),snapshot);
 for(const p of s.players){const v=engine.view(s,p);assert.equal(v.players.length,count);assert.equal(v.hands,undefined);assert.equal(v.stock,undefined);assert.equal(v.seed,undefined);assert.deepEqual(v.myHand,s.hands[p]);v.myHand.length=0;assert.equal(JSON.stringify(s),snapshot);}
 if(['chinchon','remigio','continental'].includes(s.id))continue;
 for(let n=0;n<12000&&!s.finished;n++){const original=s,before=JSON.stringify(s),p=s.players[s.turn],action=stepAction(engine,s);try{s=engine.applyAction(s,p,action);}catch(e){throw new Error(`${engine.id}/${count}/${n}/${s.phase}: ${JSON.stringify(action)}: ${e.message}`,{cause:e});}assert.equal(JSON.stringify(original),before);actions++;if(n%31===0)for(const id of s.players){const v=engine.view(s,id);assert.equal(v.hands,undefined);assert.equal(v.seed,undefined);assert.ok(v.myHand.every(c=>s.hands[id].some(x=>x.id===c.id)));}
  if(s.id==='texas_holdem')assert.equal(Object.values(s.chips).reduce((a,b)=>a+b,0)+(s.phase==='result'||s.finished?0:Object.values(s.paid).reduce((a,b)=>a+b,0)),count*500);
  if(s.id==='siete_y_medio')assert.equal(Object.values(s.chips).reduce((a,b)=>a+b,0),count*100);
 }
 assert.ok(s.finished,`${engine.id}/${count} did not finish`);matches++;console.log(`${engine.id}: ${count} players, complete match OK`);
 }
}
// Flying kings and mandatory maximum-quality capture.
let board=Array(64).fill(0);board[42]=1;board[33]=-1;board[17]=-2;
const moves=checkersMoves(board,1);assert.ok(moves.every(m=>m.captures.length===2));assert.deepEqual(moves[0].path,[42,24,10]);
board=Array(64).fill(0);board[56]=2;board[35]=-1;assert.ok(checkersMoves(board,1).every(m=>m.captures[0]===35));
// Poker rankings, ace-low straight and independent side pots.
const french=buildCardMaterial('french-52');const cs=(suit,ranks)=>ranks.map(rank=>french.find(c=>c.suit===suit&&c.rank===rank));
assert.equal(evaluatePoker(cs('picas',['A','2','3','4','5']))[0],8);
assert.ok(comparePoker(evaluatePoker(cs('picas',['10','J','Q','K','A'])),evaluatePoker(cs('picas',['A','2','3','4','5'])))>0);
let poker=getGame('texas_holdem').createInitialState(ids(3),14);poker.board=[...cs('corazones',['2','5','8']),...cs('treboles',['9','J'])];poker.hands={'player-0':cs('picas',['A','K']),'player-1':[...cs('picas',['2']),...cs('diamantes',['2'])],'player-2':[...cs('picas',['5']),...cs('diamantes',['5'])]};poker.paid={'player-0':100,'player-1':200,'player-2':300};poker.chips={'player-0':400,'player-1':300,'player-2':200};poker.folded=Object.fromEntries(ids(3).map(p=>[p,false]));pokerPayout(poker);assert.deepEqual(poker.chips,{'player-0':400,'player-1':300,'player-2':800});
// Multi-pack melds, wildcards and every Continental contract.
const spanish=buildCardMaterial('spanish-40',2),rummy=buildCardMaterial('french-jokers-54',3);
const at=(pack,suit,rank)=>rummy.find(c=>c.pack===pack&&c.suit===suit&&c.rank===rank);
const trio=(pack,rank)=>['picas','corazones','diamantes'].map(suit=>at(pack,suit,rank));
const run=(pack,suit)=>['3','4','5','6'].map(rank=>at(pack,suit,rank));
assert.equal(meldKind([at(0,'picas','3'),at(0,'joker','1'),at(0,'picas','5')],'remigio'),'run');
assert.equal(meldKind([at(0,'picas','3'),at(1,'picas','3'),at(0,'picas','4'),at(0,'picas','5')],'continental'),null);
assert.equal(analyzeMelds(spanish.filter(c=>c.pack===0&&c.suit==='oros'&&['1','2','3','4','5','6','7'].includes(c.rank)),'chinchon').points,0);
for(const [index,[sets,runs]] of [[2,0],[1,1],[0,2],[3,0],[2,1],[1,2],[0,3]].entries()){
 const cards=[...Array.from({length:sets},(_,i)=>trio(i,'K')).flat(),...Array.from({length:runs},(_,i)=>run(i,'treboles')).flat()];
 const real=cards;
 assert.ok(contractGroups(real,sets,runs));
 const engine=getGame('continental'),s=engine.createInitialState(ids(2),17);s.handNumber=index+1;s.phase='discard';s.turn=0;s.hands['player-0']=real;s.hands['player-1']=[at(0,'corazones','8')];s.stock=[];s.discard=[];
 const done=engine.applyAction(s,'player-0',{type:'meld',cards:real.map(c=>c.id)});assert.equal(done.scores['player-1'],10);assert.equal(done.phase,index===6?'finished':'result');
}
// Close a real Chinchón/Remigio hand; invalid ownership and invalid melds cannot alter state.
for(const id of ['chinchon','remigio']){const engine=getGame(id),s=engine.createInitialState(ids(2),5);s.turn=0;s.phase='discard';const material=buildCardMaterial(id==='chinchon'?'spanish-40':'spanish-poker-54',2);const sequence=id==='chinchon'?['1','2','3','4','5','6','7']:['A','2','3','4','5','6','7','8','9','10'];const hand=sequence.map(rank=>material.find(c=>c.pack===0&&c.suit==='oros'&&c.rank===rank));const discard=material.find(c=>c.suit==='copas'&&c.rank==='2');s.hands['player-0']=[...hand,discard];let result=engine.applyAction(s,'player-0',{type:'close',card:discard.id});while(['show','layoff'].includes(result.phase))result=engine.applyAction(result,result.players[result.turn],{type:'continue'});assert.equal(result.phase,'result');assert.equal(result.scores['player-0'],id==='chinchon'?-10:0);assert.throws(()=>engine.applyAction(s,'player-0',{type:'discard',card:'not-mine'}));}
console.log(`New catalog: ${matches} complete matches, ${actions} actions; private views, ownership, 7 contracts, scoring, captures and poker side pots: OK`);

// A short all-in does not reopen a player's already completed raise.
const pokerEngine=getGame('texas-holdem');
let short=pokerEngine.createInitialState(ids(3),123);
short.chips['player-1']=20;short.chips['player-2']+=475;
short=pokerEngine.applyAction(short,'player-0',{type:'raise',amount:20});
short=pokerEngine.applyAction(short,'player-1',{type:'all-in'});
short=pokerEngine.applyAction(short,'player-2',{type:'call'});
assert.equal(short.turn,0);assert.equal(short.currentBet,25);
assert.throws(()=>pokerEngine.applyAction(short,'player-0',{type:'raise',amount:40}));
assert.ok(!pokerEngine.view(short,'player-0').options.some(o=>['raise','all-in'].includes(o.action.type)));
short=pokerEngine.applyAction(short,'player-0',{type:'call'});assert.equal(short.phase,'flop');
// A bank with too few chips changes hands instead of stranding the next bettor.
const bankEngine=getGame('siete-y-medio');let poor=bankEngine.createInitialState(ids(8),33);
poor.phase='result';poor.turn=0;poor.nextBank=0;poor.chips['player-0']=1;poor.chips['player-1']=199;
poor=bankEngine.applyAction(poor,'player-0',{type:'next-hand'});assert.equal(poor.bank,1);
assert.ok(bankEngine.view(poor,poor.players[poor.turn]).options.length);
// Both members of each Butifarra pair can respond to doubling.
const buti=getGame('butifarra');let doubled=buti.createInitialState(ids(4),19);
doubled=buti.applyAction(doubled,'player-0',{type:'choose-trump',suit:'none'});
doubled=buti.applyAction(doubled,'player-1',{type:'continue'});assert.equal(doubled.turn,3);
doubled=buti.applyAction(doubled,'player-3',{type:'double'});
doubled=buti.applyAction(doubled,'player-0',{type:'continue'});assert.equal(doubled.turn,2);
doubled=buti.applyAction(doubled,'player-2',{type:'double'});assert.equal(doubled.multiplier,8);assert.equal(doubled.phase,'play');
// Continental discard priority, penalty, private cards, opening and joker recovery.
const cont=getGame('continental');let claim=cont.createInitialState(ids(4),77),discard=claim.discard.at(-1),drawer=claim.players[claim.turn];
claim=cont.applyAction(claim,drawer,{type:'draw',source:'stock'});assert.equal(claim.phase,'claim');
const claimant=claim.players[claim.turn],oldCount=claim.hands[claimant].length;
claim=cont.applyAction(claim,claimant,{type:'claim-discard'});assert.equal(claim.hands[claimant].length,oldCount+2);assert.ok(claim.hands[claimant].some(c=>c.id===discard.id));assert.equal(claim.players[claim.turn],drawer);assert.equal(claim.phase,'discard');
let jokerState=cont.createInitialState(ids(2),78);jokerState.phase='discard';jokerState.turn=0;jokerState.opened['player-0']=true;
jokerState.exposed['player-1']=[{kind:'run',cards:[at(0,'picas','3'),at(0,'joker','1'),at(0,'picas','5'),at(0,'picas','6')]}];jokerState.hands['player-0']=[at(0,'picas','4'),at(0,'corazones','9')];
assert.throws(()=>cont.applyAction(jokerState,'player-0',{type:'replace-joker',owner:'player-1',index:0,joker:at(0,'joker','1').id,card:at(0,'corazones','9').id}));
jokerState=cont.applyAction(jokerState,'player-0',{type:'replace-joker',owner:'player-1',index:0,joker:at(0,'joker','1').id,card:at(0,'picas','4').id});assert.ok(jokerState.hands['player-0'].some(c=>c.suit==='joker'));
// Discard/refill cycles preserve every physical card at all supported table sizes.
for(const id of ['chinchon','remigio','continental'])for(const count of GAME_CATALOG.find(g=>g.id===id).players){
 const engine=getGame(id);let game=engine.createInitialState(ids(count),count+321);
 const all=s=>[...Object.values(s.hands).flat(),...s.stock,...s.discard,...s.penalty,...Object.values(s.exposed).flat().flatMap(g=>g.cards)].map(c=>c.id).sort();
 const original=all(game);
 for(let i=0;i<300;i++){
  const p=game.players[game.turn];let action;
  if(game.phase==='claim')action={type:i%29===0?'claim-discard':'continue'};
  else if(game.phase==='draw')action={type:'draw',source:'stock'};
  else action={type:'discard',card:pick(game.hands[p]).id};
  game=engine.applyAction(game,p,action);assert.deepEqual(all(game),original);
 }
}
console.log('Boundary cases: short all-in, bank solvency, partner doubling, Continental claims/jokers and 21 meld-game table sizes: OK');

// Julepe pays winners directly; the plate persists except when split by two winners.
const julepe=getGame('julepe');
function julepeScore(tricks,substitute=null){const s=julepe.createInitialState(ids(5),1);s.scores=Object.fromEntries(s.players.map(p=>[p,0]));s.joined=Object.keys(tricks);s.tricks=tricks;s.substitute=substitute;s.pot=10;s.dealer=0;settleJulepe(s);return s;}
let payment=julepeScore({'player-0':3,'player-1':1,'player-2':1});assert.equal(payment.pot,10);assert.equal(payment.scores['player-0'],20);
payment=julepeScore({'player-0':3,'player-1':2});assert.equal(payment.pot,0);assert.equal(payment.scores['player-0'],5);
payment=julepeScore({'player-0':4,'player-1':1},'player-1');assert.equal(payment.pot,0);assert.equal(payment.scores['player-0'],10);assert.equal(payment.scores['player-1'],0);
payment=julepeScore({'player-0':1,'player-1':4},'player-1');assert.equal(payment.pot,20);assert.equal(payment.scores['player-0'],-10);assert.equal(payment.scores['player-1'],0);
console.log('Julepe: plate carry-over, direct payments, split plate and substitute: OK');
