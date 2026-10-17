import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;
globalThis.location = new URL('http://192.168.1.2:3000/');
const storage = new Map();
globalThis.sessionStorage = {getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.window = { ELTETO_LAN: {roomCode:'ABCD2345',inviteBase:'http://192.168.1.2:3000',hostKey:'secret'} };
globalThis.fetch = async () => ({ ok: true, json: async () => ({roomCode:'ABCD2345',inviteBase:'http://192.168.1.2:3000'}) });
let hostSocket;
const guests = new Map();
class Socket {
 static OPEN=1;
 constructor(url) {
  this.url=new URL(url);this.readyState=1;
  this.host=this.url.searchParams.has('host');this.id=this.url.searchParams.get('resume');
  if(this.host)hostSocket=this;else guests.set(this.id,this);
  queueMicrotask(()=>this.receive({type:'connected'}));
 }
 receive(data) {queueMicrotask(()=>this.onmessage?.({data:JSON.stringify(data)}));}
 send(raw) {
  const data=JSON.parse(raw);
  if(this.host){if(data.close)guests.get(data.target)?.close();else guests.get(data.target)?.receive(data.message);}
  else hostSocket.receive({type:'guest-message',playerId:this.id,message:data});
 }
 close(){
  if(!this.readyState)return;this.readyState=0;
  if(!this.host && guests.get(this.id)===this){guests.delete(this.id);hostSocket.receive({type:'guest-left',playerId:this.id});}
  this.onclose?.();
 }
}
globalThis.WebSocket=Socket;
const {LanSession}=await import('../dist/lan-session.js');
const {SPANISH_RANKS}=await import('../dist/game-core/index.js');
const tick=()=>new Promise(r=>setImmediate(r));
const events=[[],[]];
const host=await LanSession.create({gameId:'cinquillo',hostName:'Ana',character:2,roomName:'Mesa'},e=>events[0].push(e));
window.ELTETO_LAN.hostKey=null;
const guest=await LanSession.join('ABCD2345','Bea',e=>events[1].push(e),9);
await tick();await tick();
assert.equal(host.local.players().length,2);
assert.deepEqual(host.local.players().map(p=>p.character),[2,9]);
assert.equal(guest.playerId,guest.resume);
// Avatars are unique: a second guest asking for a seated one is refused and told which are taken.
{
 const first=globalThis.sessionStorage,other=new Map(),rival=[];
 globalThis.sessionStorage={getItem:k=>other.get(k)||null,setItem:(k,v)=>other.set(k,v)};
 const dup=await LanSession.join('ABCD2345','Cris',e=>rival.push(e),9);await tick();await tick();
 const refusal=rival.find(e=>e.kind==='avatar-taken');
 assert.deepEqual(refusal.taken,[2,9]);assert.match(refusal.message,/ya está elegido/);
 assert.equal(host.local.players().length,2);assert.ok(!host.local.connections.has(dup.playerId));
 await dup.exit();
 const hostDup=await LanSession.join('ABCD2345','Dani',()=>{},2);await tick();await tick();
 assert.equal(host.local.players().length,2,'the host avatar cannot be copied either');await hostDup.exit();
 const free=await LanSession.join('ABCD2345','Cris',e=>rival.push(e),5);await tick();await tick();
 assert.deepEqual(host.local.players().map(p=>p.character),[2,9,5]);
 await free.exit();await tick();await tick();
 assert.deepEqual(host.local.players().map(p=>p.character),[2,9]);
 globalThis.sessionStorage=first;
}
await host.startGame();await tick();
const last=i=>events[i].findLast(e=>e.kind==='game')?.view;
assert.equal(last(0).myHand.length+last(1).myHand.length,40);
assert.equal(new Set([...last(0).myHand,...last(1).myHand].map(c=>c.suit+':'+c.rank)).size,40);
assert.ok(!('hands' in last(1)),'guest does not receive the complete state');
assert.equal(host.local.connections.get(guest.playerId).peer.connected,true);
// Losing a guest retains the seat and pauses play. A reconnect recovers its hand.
const before=JSON.stringify(last(1).myHand);
guest.ws.close();await tick();
await assert.rejects(host.sendAction({type:'pass'}),/pausa/);
clearTimeout(guest.timer);await guest.connect();await tick();await tick();
assert.equal(JSON.stringify(last(1).myHand),before);
assert.deepEqual(host.local.players().map(p=>p.character),[2,9]);
assert.deepEqual(events[1].findLast(e=>e.kind==='lobby').players.map(p=>p.character),[2,9]);
assert.equal(host.local.players().length,2);
// Play a complete game through host validation and private messages.
let turns=0;
while(!last(0).finished && turns++<3000){
 const mine=last(0).turnPlayer==='host'?0:1;
 const view=last(mine);
 const card=view.myHand.find(c=>{
  const entry=view.table[c.suit],n=SPANISH_RANKS.indexOf(c.rank);
  if (!Object.keys(view.table).length) return c.suit === 'oros' && c.rank === '5';
  return entry?n===entry.low-1||n===entry.high+1:c.rank==='5';
 });
 await (mine===0?host:guest).sendAction(view.handWinner?{type:'next-hand'}:card?{type:'play',card}:{type:'pass'});
 await tick();await tick();
}
assert.ok(last(0).finished,'game completes');assert.equal(last(0).winner,last(1).winner);
// A sequence already processed must not apply another move.
const snapshot=JSON.stringify(host.local.state);
host.handleHostPacket({type:'guest-message',playerId:guest.playerId,message:{type:'action',seq:guest.seq,data:{action:{type:'pass'}}}});
assert.equal(JSON.stringify(host.local.state),snapshot);
await guest.exit();await host.exit();
console.log('LAN: conexión, 40 cartas privadas, pausa, reconexión, partida completa y deduplicación: OK');

// Android LAN also supports a solo table; bots are never marked disconnected.
window.ELTETO_LAN.hostKey='secret';
const aiEvents=[];
const aiHost=await LanSession.create({gameId:'mus',hostName:'Ana',roomName:'IA'},e=>aiEvents.push(e));
await aiHost.fillWithBots();assert.equal(aiHost.local.players().length,4);
assert.ok(aiEvents.findLast(e=>e.kind==='lobby').players.every(p=>!p.away));
await aiHost.removePlayer('bot-1');assert.equal(aiHost.local.players().length,3);
await aiHost.fillWithBots();await aiHost.startGame();
aiHost.local.botRunner.stop();aiHost.local.botRunner.delay=1;
await aiHost.sendAction({type:'mus',wantsMus:true});
await new Promise(r=>setTimeout(r,40));assert.notEqual(aiHost.local.state.phase,'mus');
assert.ok(aiEvents.findLast(e=>e.kind==='game').players.every(p=>!p.away));
await aiHost.exit();
console.log('LAN: completar con IA, quitar IA y turnos automáticos sin invitados: OK');

// Hold'em retains absent seats and waits for them: there is no turn timer.
window.ELTETO_LAN.hostKey='secret';const pokerEvents=[[],[]];
const pokerHost=await LanSession.create({gameId:'texas-holdem',hostName:'Ana',character:2,roomName:'Poker'},e=>pokerEvents[0].push(e));
window.ELTETO_LAN.hostKey=null;
const pokerGuest=await LanSession.join('ABCD2345','Bea',e=>pokerEvents[1].push(e),9);
await tick();await tick();await pokerHost.startGame();await tick();
const pokerId=pokerGuest.playerId;
await pokerGuest.setSittingOut(true);await tick();await tick();
assert.ok(pokerHost.local.players().find(p=>p.id===pokerId).away);
await pokerGuest.setSittingOut(false);await tick();await tick();
assert.equal(pokerHost.local.players().find(p=>p.id===pokerId).away,false);
pokerGuest.ws.close();await tick();clearTimeout(pokerGuest.timer);
assert.equal(pokerHost.local.players().length,2);
await pokerHost.sendAction({type:'call'});await tick();
assert.equal(pokerHost.local.state.players[pokerHost.local.state.turn],pokerId);
await new Promise(r=>setTimeout(r,60));
assert.equal(pokerHost.local.state.phase,'preflop','no timer acts for an absent guest');
assert.equal(pokerHost.local.state.players[pokerHost.local.state.turn],pokerId,'the table waits for the absent guest');
const chips=pokerHost.local.state.chips[pokerId],hand=JSON.stringify(pokerHost.local.state.hands[pokerId]);
await pokerGuest.connect();await tick();await tick();
assert.equal(pokerGuest.playerId,pokerId);
assert.equal(pokerHost.local.state.chips[pokerId],chips);
assert.equal(JSON.stringify(pokerHost.local.state.hands[pokerId]),hand);
assert.equal(pokerHost.local.players().find(p=>p.id===pokerId).character,9);
assert.equal(pokerHost.local.players().find(p=>p.id===pokerId).away,false);
await pokerGuest.exit();await pokerHost.exit();
console.log('LAN póker: ausentarse, esperar sin cronómetro y reenganche con fichas/personaje: OK');
// Salir de una partida de damas avisa al anfitrión y le da la victoria; en una mesa de tres solo se avisa.
{
 const left=[[],[]];
 window.ELTETO_LAN.hostKey='secret';
 const hostD=await LanSession.create({gameId:'damas-espanolas',hostName:'Ana',character:2,roomName:'Damas'},e=>left[0].push(e));
 window.ELTETO_LAN.hostKey=null;
 const guestD=await LanSession.join('ABCD2345','Bea',e=>left[1].push(e),9);
 await tick();await tick();await hostD.startGame();await tick();await tick();
 await guestD.exit();await tick();await tick();
 const notice=left[0].find(e=>e.kind==='notice');
 assert.match(notice.message,/Bea ha salido de la partida/);
 const view=hostD.local.engine.view(hostD.local.state,'host');
 assert.equal(view.finished,true);assert.equal(view.winner,'host');assert.equal(view.forfeitBy,guestD.playerId);assert.equal(view.forfeitName,'Bea');
 await hostD.exit();
 const tres=[[],[],[]];
 window.ELTETO_LAN.hostKey='secret';
 const hostO=await LanSession.create({gameId:'oca',hostName:'Ana',character:2,roomName:'Oca'},e=>tres[0].push(e));
 window.ELTETO_LAN.hostKey=null;
 const first=globalThis.sessionStorage,second=new Map();
 const g1=await LanSession.join('ABCD2345','Bea',e=>tres[1].push(e),9);
 globalThis.sessionStorage={getItem:k=>second.get(k)||null,setItem:(k,v)=>second.set(k,v)};
 const g2=await LanSession.join('ABCD2345','Cris',e=>tres[2].push(e),5);
 globalThis.sessionStorage=first;
 await tick();await tick();await hostO.startGame();await tick();await tick();
 await g2.exit();await tick();await tick();
 assert.ok(tres[0].some(e=>e.kind==='notice'&&/Cris ha salido/.test(e.message)));
 assert.ok(tres[1].some(e=>e.kind==='notice'&&/Cris ha salido/.test(e.message)),'the other guest is told too');
 assert.equal(hostO.local.state.finished,false);
 await g1.exit();await hostO.exit();
}
console.log('LAN: salir de una partida avisa y da la victoria al que se queda en una mesa de dos: OK');

// Ausentes: figuran como tales, su turno se salta, y el anfitrión puede saltar turnos y expulsar en cualquier juego.
{
 const ev=[[],[],[]];
 window.ELTETO_LAN.hostKey='secret';
 const hostP=await LanSession.create({gameId:'parchis',hostName:'Ana',character:2,roomName:'Parchís'},e=>ev[0].push(e));
 window.ELTETO_LAN.hostKey=null;
 const first=globalThis.sessionStorage,second=new Map();
 const gb=await LanSession.join('ABCD2345','Bea',e=>ev[1].push(e),9);
 globalThis.sessionStorage={getItem:k=>second.get(k)||null,setItem:(k,v)=>second.set(k,v)};
 const gc=await LanSession.join('ABCD2345','Cris',e=>ev[2].push(e),5);
 globalThis.sessionStorage=first;
 await tick();await tick();await hostP.startGame();await tick();await tick();
 const local=hostP.local;local.graceMs=40;
 const playing=turn=>{local.state={...local.state,phase:'roll',turn,die:null,sixes:0,candidates:[...local.state.players],startingPlayer:local.state.players[0],bonuses:[]};};
 const bea=gb.playerId,cris=gc.playerId;
 // Quien pierde la conexión figura como ausente y, pasado el margen, pierde el turno.
 playing(1);gb.ws.close();await tick();await tick();
 assert.ok(local.players().find(p=>p.id===bea).away,'la persona desconectada figura como ausente');
 assert.equal(local.state.players[local.state.turn],bea,'durante el margen la mesa espera');
 // The hand-built state counts as a public move; clear the pacing so the 1.5 s absent delay is what is measured.
 local.botPacing.until=0;local.botRunner.stop();local.botRunner.schedule();
 await new Promise(r=>setTimeout(r,1900));
 assert.equal(local.state.players[local.state.turn],cris,'pasado el margen se salta su turno');
 assert.match(local.state.log.at(-1),/pierde el turno/);
 // El anfitrión salta el turno de quien juega ahora.
 await hostP.skipTurn();assert.equal(local.state.players[local.state.turn],'host');
 assert.ok(ev[0].some(e=>e.kind==='notice'&&/saltado el turno de Cris/.test(e.message)));
 await assert.rejects(hostP.skipTurn(),/solo te toca/);
 // Expulsar: sus fichas salen del tablero, no vuelve a jugar y la mesa lo sabe.
 await hostP.kickPlayer(cris);await tick();await tick();
 assert.equal(local.state.departed[cris],'Cris');assert.ok(local.state.expelled[cris]);assert.deepEqual(local.state.left,[cris]);
 assert.ok(local.state.pieces[cris].every(p=>p===-1));
 assert.ok(ev[0].some(e=>e.kind==='notice'&&/Cris ha sido expulsado/.test(e.message)));
 assert.ok(local.players().find(p=>p.id===cris).away);
 assert.equal(local.engine.view(local.state,'host').expelled[cris],true);
 playing(0);hostP.local.state=local.engine.applyAction({...local.state,phase:'roll',turn:0},'host',{type:'skip'});
 assert.equal(local.state.players[local.state.turn],bea,'el asiento expulsado no recibe turno');
 // Con una sola persona presente gana por abandono.
 await hostP.kickPlayer(bea);await tick();
 assert.equal(local.state.finished,true);assert.equal(local.state.winner,'host');
 await gb.exit();await gc.exit();await hostP.exit();
}
console.log('LAN: ausentes, turno saltado, saltar turno y expulsar del anfitrión: OK');
