import assert from 'node:assert/strict';
import {parchisEngine as engine,legalParchisMoves,parchisSquare,parchisLayout,PARCHIS_STARTS,PARCHIS_SAFE,createRng} from '../dist/game-core/index.js';
// Four players on the square; seats are ordered so that 'b' plays red, opposite yellow.
const base=()=>({...engine.createInitialState(['a','c','b','d'],1),phase:'move',turn:0,die:1,pieces:{a:[5,-1,-1,-1],b:[-1,-1,-1,-1],c:[-1,-1,-1,-1],d:[-1,-1,-1,-1]}});
function dieState(s,die){for(let seed=0;seed<1000;seed++)if(1+Math.floor(createRng(seed+s.rollCount*104729)()*6)===die)return {...s,seed};throw Error('No die seed');}
const enemy=square=>(square-PARCHIS_STARTS.red+68)%68;
assert.throws(()=>engine.createInitialState(['a'],1));assert.throws(()=>engine.createInitialState(['a','a'],1));
assert.equal(PARCHIS_SAFE.length,12);assert.equal(new Set(PARCHIS_SAFE).size,12);
for(const color of Object.keys(PARCHIS_STARTS)){
 const route=Array.from({length:64},(_,i)=>parchisSquare(color,i));assert.equal(new Set(route).size,64);assert.equal(route[0],PARCHIS_STARTS[color]);assert.equal(route[63],(PARCHIS_STARTS[color]+63)%68);assert.equal(parchisSquare(color,64),null);
}
let s=base();assert.throws(()=>engine.applyAction(s,'b',{type:'move',piece:0}));assert.throws(()=>engine.applyAction(s,'a',{type:'roll'}));
s={...s,die:5};assert.deepEqual(legalParchisMoves(s).map(m=>m.piece),[0,1,2,3]);assert.equal(engine.applyAction(s,'a',{type:'move',piece:1}).pieces.a[1],0);
assert.equal(legalParchisMoves({...base(),die:4}).some(m=>m.from===-1),false);
// Capture and bonus come from the exact public location, not progress in another color.
s=base();s.pieces.b[0]=enemy(10);let next=engine.applyAction(s,'a',{type:'move',piece:0});assert.equal(next.pieces.b[0],-1);assert.equal(next.phase,'bonus');assert.deepEqual(next.bonuses,[20]);
next=engine.applyAction(next,'a',{type:'move',piece:0});assert.equal(next.pieces.a[0],26);assert.equal(next.phase,'roll');assert.equal(next.turn,1);
// On a safe cell rivals coexist. A third piece may not enter.
s=base();s.pieces.a[0]=6;s.pieces.b[0]=enemy(11);next=engine.applyAction(s,'a',{type:'move',piece:0});assert.notEqual(next.pieces.b[0],-1);assert.equal(next.bonuses.length,0);
s=base();s.pieces.b=[enemy(10),enemy(10),-1,-1];s.die=3;assert.equal(legalParchisMoves(s).length,0);
s=base();s.pieces.a=[0,0,8,-1];s.die=6;assert.deepEqual(legalParchisMoves(s).map(m=>m.piece),[0,1]);assert.ok(legalParchisMoves(s).every(m=>m.steps===6));
s={...base(),die:6,pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[0,4,20,40],b:[-1,-1,-1,-1]}};assert.ok(legalParchisMoves(s).every(m=>m.steps===7));
// Full starts cannot accept a third counter, including an exit on five.
s={...base(),die:5,pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[0,0,-1,-1],b:[-1,-1,-1,-1]}};assert.equal(legalParchisMoves(s).some(m=>m.from===-1),false);
// Finish requires exact steps; bonuses chain and unusable bonuses are skipped.
s={...base(),die:2,pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[70,-1,-1,-1],b:[-1,-1,-1,-1]}};assert.equal(legalParchisMoves(s).length,0);
s={...s,die:1};next=engine.applyAction(s,'a',{type:'move',piece:0});assert.equal(next.pieces.a[0],71);assert.equal(next.phase,'roll');assert.match(next.log.at(-1),/bonificación de 10/);
s={...base(),phase:'bonus',bonuses:[20],pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[51,0,-1,-1],b:[-1,-1,-1,-1]}};next=engine.applyAction(s,'a',{type:'move',piece:0});assert.deepEqual(next.bonuses,[10]);next=engine.applyAction(next,'a',{type:'move',piece:1});assert.equal(next.pieces.a[1],10);
s={...base(),die:1,pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[70,71,71,71],b:[-1,-1,-1,-1]}};next=engine.applyAction(s,'a',{type:'move',piece:0});assert.equal(next.winner,'a');assert.equal(next.finished,true);assert.throws(()=>engine.applyAction(next,'a',{type:'roll'}));
// The supplied rule has no exception for the latest piece reaching home before a third six.
s=dieState({...base(),phase:'roll',sixes:2,lastPiece:0,pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[71,1,2,3],b:[-1,-1,-1,-1]}},6);next=engine.applyAction(s,'a',{type:'roll'});assert.equal(next.pieces.a[0],-1);assert.equal(next.turn,1);assert.equal(next.sixes,0);
s=dieState(engine.createInitialState(['a','b','c'],1),4);s=engine.applyAction(s,'a',{type:'roll'});s=dieState(s,4);s=engine.applyAction(s,'b',{type:'roll'});s=dieState(s,2);s=engine.applyAction(s,'c',{type:'roll'});assert.deepEqual(s.candidates,['a','b']);assert.equal(s.phase,'start');s=dieState(s,5);s=engine.applyAction(s,'a',{type:'roll'});s=dieState(s,3);s=engine.applyAction(s,'b',{type:'roll'});assert.equal(s.turn,0);assert.equal(s.phase,'roll');
// Each player has exactly one opening roll; only tied players reroll. Results survive transitions.
for(const count of [3,4,5,6]){
 let opening=engine.createInitialState(['a','b','c','d','e','f'].slice(0,count),18);
 if(opening.phase==='setup')opening=engine.applyAction(opening,'a',{type:'dice',count:1});
 for(let i=0;i<count;i++){
  const id=opening.players[opening.turn];opening=dieState(opening,i+1);
  const before=opening.lastRoll?.sequence??0;
  opening=engine.applyAction(opening,id,{type:'roll',expectedRoll:before});
  assert.equal(opening.lastRoll.player,id);assert.equal(opening.lastRoll.value,i+1);
  for(const viewer of opening.players)assert.deepEqual(engine.view(opening,viewer).lastRoll,opening.lastRoll);
 }
 assert.equal(opening.phase,'roll');assert.equal(opening.turn,count-1);assert.equal(opening.die,null);
 assert.equal(opening.lastRoll.value,count);
 assert.throws(()=>engine.applyAction(opening,opening.players[opening.turn],{type:'roll',expectedRoll:opening.lastRoll.sequence-1}),/ya fue procesada/);
 const copy=engine.view(opening,opening.players[0]);copy.lastRoll.value=99;copy.startingCandidates.length=0;assert.equal(opening.lastRoll.value,count);assert.equal(opening.candidates.length,count);
}
s=engine.createInitialState(['a','b','c','d'],6);
for(const value of [6,6,2,1]){const id=s.players[s.turn];s=engine.applyAction(dieState(s,value),id,{type:'roll'});}
assert.equal(s.initialRound,2);assert.deepEqual(engine.view(s,'c').startingCandidates,['a','b']);assert.equal(s.lastRoll.value,1);assert.equal(s.die,null);
assert.throws(()=>engine.applyAction(s,'c',{type:'roll'}),/turno/);
for(const value of [4,4])s=engine.applyAction(dieState(s,value),s.players[s.turn],{type:'roll'});
assert.equal(s.initialRound,3);assert.deepEqual(s.candidates,['a','b']);
s=engine.applyAction(dieState(s,3),'a',{type:'roll'});s=engine.applyAction(dieState(s,5),'b',{type:'roll'});assert.equal(s.turn,1);assert.equal(s.phase,'roll');assert.equal(s.lastRoll.value,5);
// Consecutive equal results have different IDs. Skipped turns and third six keep the landed result.
s=dieState({...base(),phase:'roll',pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:[-1,-1,-1,-1],b:[-1,-1,-1,-1]}},2);s=engine.applyAction(s,'a',{type:'roll'});assert.equal(s.turn,1);assert.equal(s.die,null);assert.equal(s.lastRoll.value,2);
const previous=s.lastRoll.sequence;s=engine.applyAction(dieState(s,2),'c',{type:'roll',expectedRoll:previous});assert.equal(s.lastRoll.value,2);assert.equal(s.lastRoll.sequence,previous+1);
s=engine.applyAction(dieState({...base(),phase:'roll',sixes:2,lastPiece:0},6),'a',{type:'roll'});assert.equal(s.lastRoll.value,6);assert.equal(s.turn,1);
// Old saved states without visual metadata can still roll.
s=engine.createInitialState(['a','b','c'],1);delete s.lastRoll;delete s.initialRound;s=engine.applyAction(s,'a',{type:'roll',expectedRoll:0});assert.equal(s.lastRoll.round,1);
// Full deterministic games also verify input immutability, view isolation and color assignment.
for(let seed=1;seed<=90;seed++){
 const count=3+seed%4,ids=['a','b','c','d','e','f'].slice(0,count);let game=engine.createInitialState(ids,seed);
 if(game.phase==='setup')game=engine.applyAction(game,'a',{type:'dice',count:1+seed%2});
 const goal=parchisLayout(game.sides).goal;
 for(let step=0;step<6000&&!game.finished;step++){
  const id=game.players[game.turn],view=engine.view(game,id),snapshot=JSON.stringify(game);
  assert.ok(!('seed' in view)&&!('rollCount' in view)&&!('candidates' in view));
  const moves=view.legalMoves,best=[...moves].sort((a,b)=>(b.to===goal)-(a.to===goal)||(b.from===-1)-(a.from===-1)||b.to-a.to)[0];const action=moves.length?{type:'move',piece:best.piece,...(seed%3?{dice:best.dice}:{})}:{type:'roll'};
  const next=engine.applyAction(game,id,action);assert.equal(JSON.stringify(game),snapshot);assert.deepEqual(next,engine.applyAction(JSON.parse(snapshot),id,action));game=next;
  for(const p of ids){assert.equal(game.pieces[p].length,4);assert.ok(game.pieces[p].every(n=>Number.isInteger(n)&&n>=-1&&n<=goal));}
 }
 assert.ok(game.finished,`Game ${seed} did not finish`);assert.ok(game.pieces[game.winner].every(p=>p===goal));
 const view=engine.view(game,ids[0]);view.pieces[ids[0]][0]=-999;assert.notEqual(game.pieces[ids[0]][0],-999);
}
console.log('Parchís: 90 full games with 3 to 6 players and one or two dice, starting ties, safe cells, barriers, forced opening, captures, exact finish, bonus chains, third six, immutability and public views: OK');

// A five during opening determines order only; an actual five enables every home pawn.
let five=dieState(engine.createInitialState(['a','b','c'],1),5);five=engine.applyAction(five,'a',{type:'roll'});
assert.equal(five.phase,'start');assert.deepEqual(five.pieces.a,[-1,-1,-1,-1]);
five=dieState(five,3);five=engine.applyAction(five,'b',{type:'roll'});five=dieState(five,2);five=engine.applyAction(five,'c',{type:'roll'});assert.equal(five.phase,'roll');assert.equal(five.turn,0);
five=dieState(five,5);five=engine.applyAction(five,'a',{type:'roll'});assert.equal(five.phase,'move');assert.equal(legalParchisMoves(five).filter(m=>m.from===-1).length,4);
assert.equal(engine.view(five,'b').legalMoves.length,0);
five=engine.applyAction(five,'a',{type:'move',piece:2});assert.equal(five.pieces.a[2],0);
console.log('Parchís: opening five, playable five, private turn actions and blocked full starts: OK');
// The start roll selects the first player; the circular legal order is preserved.
for(let seed=1;seed<=30;seed++){
 let game=engine.createInitialState(['a','b','c','d'],seed);
 for(let i=0;game.phase==='start'&&i<40;i++)game=engine.applyAction(game,game.players[game.turn],{type:'roll'});
 assert.equal(game.phase,'roll');const view=engine.view(game,'a');assert.equal(view.turnOrder[0],game.startingPlayer);
 assert.equal(view.turnOrder[0],view.turnPlayer);
 assert.deepEqual(view.turnOrder,Array.from({length:4},(_,i)=>game.players[(game.players.indexOf(game.startingPlayer)+i)%4]));
 assert.ok(Object.values(game.pieces).flat().every(p=>p===-1),'The start roll never moves or opens pieces');
 const previousOrder=[...view.turnOrder];let moved=game;
 for(let i=0;i<20&&!moved.finished;i++){const actor=moved.players[moved.turn],v=engine.view(moved,actor);moved=engine.applyAction(moved,actor,v.phase==='roll'?{type:'roll'}:{type:'move',piece:v.legalMoves[0].piece});assert.deepEqual(engine.view(moved,'a').turnOrder,previousOrder);}
}
console.log('Parchís: starting player, fixed clockwise turn order and no movement during sortition: OK');

// Board shape follows the table: 4 on the square, 3 a triangle, 5 a pentagon, 6 a hexagon.
const ids=['a','b','c','d','e','f'];
for(const [count,sides,colors] of [[3,3,['yellow','green','red']],[4,4,['yellow','green','red','blue']],[5,5,['yellow','green','red','blue','orange']],[6,6,['yellow','green','red','blue','orange','purple']]]){
 const game=engine.createInitialState(ids.slice(0,count),3),layout=parchisLayout(sides);
 assert.equal(game.sides,sides);assert.deepEqual(Object.values(game.colors),colors);
 assert.equal(layout.cells,17*sides);assert.equal(layout.shared,17*sides-4);assert.equal(layout.goal,17*sides+3);assert.equal(layout.safe.length,3*sides);
 for(const color of colors){
  const route=Array.from({length:layout.shared},(_,i)=>parchisSquare(color,i,sides));
  assert.equal(new Set(route).size,layout.shared);assert.equal(route[0],layout.starts[color]);assert.equal(parchisSquare(color,layout.shared,sides),null);
  // The last shared square is the tip of the colour's own arm, just before its lane.
  const arm=layout.colors.indexOf(color);assert.equal(route.at(-1),(arm*17-1+layout.cells)%layout.cells);assert.equal(Math.floor(route[0]/17),arm);
 }
 const view=engine.view(game,'a');assert.equal(view.sides,sides);assert.equal(view.goal,layout.goal);
 assert.equal(game.phase,count>=5?'setup':'start');assert.equal(view.diceCount,count>=5?null:1);
}
assert.deepEqual(parchisLayout(4).starts,PARCHIS_STARTS);assert.deepEqual(parchisLayout(4).safe,PARCHIS_SAFE);
assert.throws(()=>engine.createInitialState(ids.concat('g'),1),/3 a 6/);assert.throws(()=>engine.createInitialState(['a','b'],1),/3 a 6/);
// Five or six players choose the dice before the opening roll; only the first seat chooses.
let table=engine.createInitialState(ids,4);
assert.throws(()=>engine.applyAction(table,'a',{type:'roll'}),/uno o dos dados/);
assert.throws(()=>engine.applyAction(table,'b',{type:'dice',count:2}),/turno/);
assert.throws(()=>engine.applyAction(table,'a',{type:'dice',count:3}),/uno o dos dados/);
assert.equal(engine.view(table,'a').diceChoice,true);assert.equal(engine.view(table,'b').diceChoice,false);
let one=engine.applyAction(table,'a',{type:'dice',count:1});assert.equal(one.phase,'start');assert.equal(one.diceCount,1);
one=engine.applyAction(one,'a',{type:'roll'});assert.equal(one.lastRoll.values,undefined);
table=engine.applyAction(table,'a',{type:'dice',count:2});assert.equal(table.phase,'start');assert.equal(table.diceCount,2);
// The opening roll uses both dice and compares the sums.
for(let i=0;i<6;i++){const id=table.players[table.turn];table=engine.applyAction(table,id,{type:'roll'});assert.equal(table.lastRoll.values.length,2);assert.equal(table.lastRoll.value,table.lastRoll.values[0]+table.lastRoll.values[1]);if(table.phase!=='start')break;}
// Two dice: each die is played separately, with the same piece or another one.
const two=(rolled,pieces,extra={})=>({...engine.createInitialState(ids.slice(0,5),1),phase:'move',turn:0,diceCount:2,rolled,used:rolled.map(()=>false),die:rolled[0],repeat:rolled[0]===rolled[1],pieces:{c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],a:pieces,b:[-1,-1,-1,-1],c:[-1,-1,-1,-1],d:[-1,-1,-1,-1],e:[-1,-1,-1,-1]},...extra});
let d=two([3,4],[10,-1,-1,-1]);
assert.deepEqual(legalParchisMoves(d).map(m=>[m.piece,m.steps,m.dice.join()]),[[0,3,'0'],[0,4,'1']]);
d=engine.applyAction(d,'a',{type:'move',piece:0,dice:[1]});assert.equal(d.pieces.a[0],14);assert.equal(d.phase,'move');assert.equal(d.turn,0);assert.deepEqual(d.used,[false,true]);
assert.deepEqual(legalParchisMoves(d).map(m=>[m.steps,m.dice.join()]),[[3,'0']]);
assert.throws(()=>engine.applyAction(d,'a',{type:'move',piece:0,dice:[1]}),/no puede moverse/);
d=engine.applyAction(d,'a',{type:'move',piece:0});assert.equal(d.pieces.a[0],17);assert.equal(d.turn,1);assert.equal(d.phase,'roll');
// A five on either die or a sum of five takes a piece out; a five can still move instead.
d=two([5,2],[10,-1,-1,-1]);assert.deepEqual(legalParchisMoves(d).filter(m=>m.from===-1).map(m=>m.dice.join()),['0','0','0']);assert.ok(legalParchisMoves(d).some(m=>m.piece===0&&m.steps===5));
d=two([2,3],[10,-1,-1,-1]);const exits=legalParchisMoves(d).filter(m=>m.from===-1);assert.equal(exits.length,3);assert.ok(exits.every(m=>m.dice.join()==='0,1'&&m.to===0));
d=engine.applyAction(d,'a',{type:'move',piece:1,dice:[0,1]});assert.equal(d.pieces.a[1],0);assert.equal(d.turn,1);
d=two([5,5],[-1,-1,-1,-1]);d=engine.applyAction(d,'a',{type:'move',piece:0,dice:[0]});d=engine.applyAction(d,'a',{type:'move',piece:1,dice:[1]});assert.deepEqual(d.pieces.a,[0,0,-1,-1]);assert.equal(d.turn,0,'A double repeats');assert.equal(d.phase,'roll');
// A die without a valid move is lost; the other die is still played.
d=two([2,6],[parchisLayout(5).goal-2,-1,-1,-1]);assert.deepEqual(legalParchisMoves(d).map(m=>m.dice.join()),['0']);d=engine.applyAction(d,'a',{type:'move',piece:0});assert.equal(d.turn,1);assert.match(d.log.at(-2)+d.log.at(-1),/meta|dado/);
// Six counts seven with nobody at home, per die.
d=two([6,1],[3,8,20,30]);assert.ok(legalParchisMoves(d).filter(m=>m.dice[0]===0).every(m=>m.steps===7));
// A double obliges opening a barrier with the first die; afterwards any piece may move.
d=two([4,4],[6,6,20,-1]);assert.deepEqual([...new Set(legalParchisMoves(d).map(m=>m.piece))],[0,1]);
d=engine.applyAction(d,'a',{type:'move',piece:0});assert.deepEqual([...new Set(legalParchisMoves(d).map(m=>m.piece))],[0,1,2]);
d=two([4,2],[6,6,20,-1]);assert.deepEqual([...new Set(legalParchisMoves(d).map(m=>m.piece))],[0,1,2]);
// Capture and arrival bonuses are played before the remaining die.
const layout5=parchisLayout(5),rivalAt=progress=>(parchisSquare('yellow',progress,5)-layout5.starts.green+layout5.cells)%layout5.cells;
d=two([3,2],[7,-1,-1,-1]);d.pieces.b[0]=rivalAt(10);d=engine.applyAction(d,'a',{type:'move',piece:0,dice:[0]});assert.equal(d.pieces.b[0],-1);assert.equal(d.phase,'bonus');assert.deepEqual(d.bonuses,[20]);
d=engine.applyAction(d,'a',{type:'move',piece:0});assert.equal(d.pieces.a[0],30);assert.equal(d.phase,'move');d=engine.applyAction(d,'a',{type:'move',piece:0});assert.equal(d.pieces.a[0],32);assert.equal(d.turn,1);
// Three doubles in a row return the last moved piece and end the turn.
const doubleSeed=s=>{for(let seed=0;seed<5000;seed++){const r=n=>1+Math.floor(createRng(seed+s.rollCount*104729+n*7919)()*6);if(r(0)===r(1))return {...s,seed};}throw Error('No double');};
d=doubleSeed({...two([1,1],[12,30,-1,-1]),phase:'roll',sixes:2,lastPiece:1});d=engine.applyAction(d,'a',{type:'roll'});assert.equal(d.pieces.a[1],-1);assert.equal(d.turn,1);assert.match(d.log.at(-1),/tres dobles/);
// Public views carry the dice and never the seed.
const v=engine.view(two([3,4],[10,-1,-1,-1]),'b');assert.deepEqual([v.diceCount,v.rolled,v.used,v.legalMoves.length,'seed' in v],[2,[3,4],[false,false],0,false]);
console.log('Parchís: triangle, square, pentagon and hexagon routes, dice choice, two-dice exits, doubles, lost dice, barriers and bonuses: OK');
// Absence: a skipped turn passes to the next seat; a player who leaves takes the pieces off the board and never plays again.
{
 const seats=['a','b','c','d'];
 let g={...engine.createInitialState(seats,5),phase:'roll',turn:1,startingPlayer:'a',candidates:[...seats]};
 g.pieces={a:[3,-1,-1,-1],b:[9,10,-1,-1],c:[20,-1,-1,-1],d:[-1,-1,-1,-1]};
 assert.throws(()=>engine.applyAction(g,'a',{type:'skip'}),/No es tu turno/);
 let next=engine.applyAction(g,'b',{type:'skip'});assert.equal(next.turn,2);assert.equal(next.phase,'roll');assert.equal(next.sixes,0);assert.match(next.log.at(-1),/pierde el turno/);
 assert.deepEqual(next.pieces,g.pieces,'skipping moves nothing');
 assert.throws(()=>engine.applyAction({...g,phase:'start'},'b',{type:'skip'}),/saltar/);
 // Leaving mid-turn: pieces go home, the turn moves on and the seat is skipped from then on.
 next=engine.applyAction(g,'b',{type:'leave'});assert.deepEqual(next.pieces.b,[-1,-1,-1,-1]);assert.deepEqual(next.left,['b']);assert.equal(next.turn,2);
 let after=engine.applyAction(next,'c',{type:'skip'});after=engine.applyAction(after,'d',{type:'skip'});after=engine.applyAction(after,'a',{type:'skip'});assert.equal(after.turn,2,'seat b is never visited');
 assert.equal(engine.applyAction(next,'b',{type:'leave'}),next,'leaving twice changes nothing');
 // A departed seat that is not on turn keeps the turn where it is.
 const other=engine.applyAction(g,'d',{type:'leave'});assert.equal(other.turn,1);
 // Leaving during the opening roll: the sortition continues without that player.
 let open=engine.createInitialState(seats,9);open=dieState(open,3);open=engine.applyAction(open,'a',{type:'roll'});
 const mid=engine.applyAction(open,'b',{type:'leave'});assert.equal(mid.turn,2);assert.deepEqual(mid.candidates,['a','c','d']);
 let fin=mid;for(const v of [2,5]){fin=dieState(fin,v);fin=engine.applyAction(fin,fin.players[fin.turn],{type:'roll'});}
 assert.equal(fin.phase,'roll');assert.equal(fin.startingPlayer,'d');
 // Dice choice at a five-player table passes on when the chooser leaves.
 const five=engine.createInitialState(['a','b','c','d','e'],2);assert.equal(five.phase,'setup');
 assert.equal(engine.applyAction(five,'a',{type:'leave'}).turn,1);
}
console.log('Parchís: turno saltado, abandono, asiento omitido y sorteo sin quien se va: OK');
