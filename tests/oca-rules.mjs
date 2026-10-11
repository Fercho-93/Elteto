import assert from 'node:assert/strict';
import {getGame} from '../dist/game-core/index.js';
const e=getGame('oca');
const initial=e.createInitialState(['a','b','c'],22);
// Select a reproducible seed with a one-pip roll; all assertions use the public engine.
let seed;for(let n=1;n<10000;n++){if(e.applyAction({...initial,seed:n},'a',{type:'roll'}).roll===1){seed=n;break;}}
assert.ok(seed);
const land=(n,extra={})=>e.applyAction({...initial,seed,positions:{a:n-1,b:1,c:1},...extra},'a',{type:'roll'});
for(const [at,to] of [[6,12],[26,53],[53,26],[58,1]]){const s=land(at);assert.equal(s.positions.a,to);assert.equal(s.turn,1);assert.equal(s.lastRoll.to,to);}
const geese=[5,9,14,18,23,27,32,36,41,45,50,54,59];
for(let i=0;i<geese.length;i++){const s=land(geese[i]);assert.equal(s.positions.a,geese[i+1]??63);if(i<geese.length-1)assert.equal(s.turn,0);else assert.ok(s.finished);}
for(const at of [19,31,42]){let s=land(at);assert.equal(s.penalties.a,2);for(let missed=1;missed<=2;missed++){const before=s.lastRoll;s=e.applyAction({...s,turn:0},'a',{type:'roll'});assert.equal(s.positions.a,at);assert.equal(s.penalties.a,2-missed);assert.deepEqual(s.lastRoll,before);}}
let s=land(52);assert.equal(s.prison,'a');s=e.applyAction({...s,turn:0},'a',{type:'roll'});assert.equal(s.positions.a,52);assert.equal(s.turn,1);
s=land(52,{positions:{a:51,b:52,c:1},prison:'b'});assert.equal(s.positions.b,51);assert.equal(s.prison,'a');
s=land(17,{positions:{a:16,b:17,c:1}});assert.equal(s.positions.b,16);
s=land(63);assert.ok(s.finished);assert.equal(s.positions.a,63);
for(let n=1;n<10000;n++){const v=e.applyAction({...initial,seed:n,positions:{a:62,b:1,c:1}},'a',{type:'roll'});if(v.roll===3){assert.equal(v.lastRoll.landing,61);assert.deepEqual(v.lastRoll.route,[62,63,62,61]);assert.equal(v.finished,false);break;}}
assert.deepEqual(initial.positions,{a:1,b:1,c:1});console.log('Oca Cayro: 13 ocas, puentes, dados, esperas, prisión, colisión y meta exacta: OK');
