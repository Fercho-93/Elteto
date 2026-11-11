// Dos jugadores nunca comparten avatar en una mesa, elijan lo que elijan, y todos los dispositivos ven lo mismo.
import assert from 'node:assert/strict';
import {assignMascots,mascotForSeat,MASCOTS} from '../dist/table-view.js';
import {listGames,fillBotSeats} from '../dist/game-core/index.js';
let rng=7;const random=()=>(rng=(rng*16807)%2147483647)/2147483647;
let tables=0;
for(const engine of listGames())for(let count=engine.minPlayers;count<=engine.maxPlayers;count++)for(let trial=0;trial<200;trial++){
 const humans=1+Math.floor(random()*count),ids=Array.from({length:humans},(_,i)=>`persona-${trial}-${i}`);
 const players=[...ids,...fillBotSeats(ids.map(id=>({id})),count).map(bot=>bot.id)].slice(0,count);
 const characters={};
 // Elecciones al azar, a menudo repetidas: todos con el mismo, algunos sin elegir, valores no válidos.
 for(const id of ids){const pick=random();characters[id]=pick<.3?0:pick<.5?undefined:pick<.55?99:Math.floor(random()*MASCOTS.length);}
 const assigned=assignMascots(players,characters);
 assert.equal(new Set(assigned).size,count,`${engine.id}/${count}: avatares repetidos ${JSON.stringify({players,characters,assigned})}`);
 assert.ok(assigned.every(c=>Number.isInteger(c)&&c>=0&&c<MASCOTS.length));
 players.forEach((_,seat)=>assert.equal(mascotForSeat(players,seat,characters),assigned[seat]));
 // Quien eligió primero un avatar libre lo conserva.
 const first=new Map();players.forEach((id,seat)=>{const c=characters[id];if(Number.isInteger(c)&&c>=0&&c<MASCOTS.length&&!first.has(c))first.set(c,seat);});
 for(const [c,seat] of first)assert.equal(assigned[seat],c);
 tables++;
}
console.log(`Avatares: ${tables} mesas de los 20 juegos, sin repetidos y respetando la elección de cada uno: OK`);
