// La mesa de dominó: salida fija en el centro, serpentina con esquinas y fichas que no saltan.
import assert from 'node:assert/strict';
import {getGame,nextBotMove} from '../dist/game-core/index.js';
globalThis.matchMedia=()=>({matches:false});
const {dominoLayout}=await import('../dist/catalog-games.js');
const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>1e-3&&Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>1e-3;
const touch=(a,b)=>{const dx=Math.max(a.x,b.x)-Math.min(a.x+a.w,b.x+b.w),dy=Math.max(a.y,b.y)-Math.min(a.y+a.h,b.y+b.h);return Math.max(dx,dy)<0.2&&Math.min(dx,dy)<0;};
let layouts=0;
for(let seed=1;seed<=120;seed++)for(const width of [11,17]){
 const engine=getGame('domino');let game=engine.createInitialState(['a','b','c','d'],seed),previous=null,rng=seed;
 while(game.phase==='play'){
  const move=nextBotMove(engine,game,game.players,()=>(rng=(rng*9301+49297)%233280)/233280);game=engine.applyAction(game,move.playerId,move.action);
  if(game.phase!=='play'||!game.chain.length)continue;
  const view=engine.view(game,'a'),{tiles,height}=dominoLayout(view.chain,view.chainStart,width);layouts++;
  assert.equal(tiles.length,view.chain.length);
  assert.equal(view.chain[view.chainStart].id,game.chain[game.chainStart].id);
  for(const t of tiles)assert.ok(t.x>=-1e-6&&t.x+t.w<=width+1e-6&&t.y>=-1e-6&&t.y+t.h<=height+1e-6,'Dentro de la mesa');
  for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++)assert.ok(!overlap(tiles[i],tiles[j]),`Sin solapes (${seed}, ${width})`);
  const at=new Map(tiles.map(t=>[t.index,t]));
  for(let i=1;i<tiles.length;i++)assert.ok(touch(at.get(i-1),at.get(i)),`Fichas consecutivas juntas (${seed}, ${width}, ${i})`);
  // Relative to the opening tile, a placed tile keeps its spot; only a double that turns into a corner moves.
  const origin=at.get(view.chainStart),place=new Map(tiles.map(t=>[t.t.id,[t.x-origin.x,t.y-origin.y,t.vertical]]));
  if(previous)for(const [id,spot] of previous){const now=place.get(id),t=tiles.find(x=>x.t.id===id);if(t.t.left!==t.t.right)assert.deepEqual(now.map(n=>typeof n==='number'?+n.toFixed(4):n),spot.map(n=>typeof n==='number'?+n.toFixed(4):n),`La ficha ${id} no salta (${seed}, ${width})`);}
  previous=place;
 }
}
console.log(`Dominó: ${layouts} mesas en serpentina desde la salida, sin solapes, fichas encadenadas y estables: OK`);
