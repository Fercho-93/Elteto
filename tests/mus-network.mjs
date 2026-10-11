import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
globalThis.crypto??=webcrypto;globalThis.location=new URL('http://192.168.1.2:3000/');globalThis.window={ELTETO_LAN:{roomCode:'ABCD2345',inviteBase:'http://192.168.1.2:3000',hostKey:'secret'}};
globalThis.fetch=async()=>({ok:true,json:async()=>({roomCode:'ABCD2345',inviteBase:'http://192.168.1.2:3000'})});
let hostSocket;const guests=new Map(),packets=[];
class Socket{static OPEN=1;constructor(url){this.url=new URL(url);this.readyState=1;this.host=this.url.searchParams.has('host');this.id=this.url.searchParams.get('resume');if(this.host)hostSocket=this;else guests.set(this.id,this);queueMicrotask(()=>this.receive({type:'connected'}));}receive(data){queueMicrotask(()=>this.onmessage?.({data:JSON.stringify(data)}));}send(raw){const d=JSON.parse(raw);if(this.host){packets.push(d);if(d.close)guests.get(d.target)?.close();else guests.get(d.target)?.receive(d.message);}else hostSocket.receive({type:'guest-message',playerId:this.id,message:d});}close(){if(!this.readyState)return;this.readyState=0;if(!this.host&&guests.get(this.id)===this){guests.delete(this.id);hostSocket.receive({type:'guest-left',playerId:this.id});}this.onclose?.();}}
globalThis.WebSocket=Socket;
const storage=()=>{const m=new Map();globalThis.sessionStorage={getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v))};};
const {LanSession}=await import('../dist/lan-session.js');
const events=[[],[],[],[]],sessions=[];const tick=()=>new Promise(r=>setTimeout(r,10));const until=async(fn)=>{for(let i=0;i<800;i++){const v=fn();if(v)return v;await tick();}throw new Error('La mesa no avanzó');};
const view=i=>events[i].findLast(e=>e.kind==='game')?.view;
try{
 storage();sessions.push(await LanSession.create({gameId:'mus',hostName:'Ana',roomName:'Mus',character:0},e=>events[0].push(e)));window.ELTETO_LAN.hostKey=null;
 for(let i=1;i<4;i++){storage();sessions.push(await LanSession.join('ABCD2345',['Ana','Carlos','María','Pedro'][i],e=>events[i].push(e),i));await tick();}
 assert.equal(sessions[0].local.players().length,4);await sessions[0].startGame(7,{targetScore:30});
 await until(()=>events.every(ev=>ev.find(e=>e.kind==='game'&&e.view.stage==='DEALING')));
 for(let i=0;i<4;i++)assert.deepEqual(events[i].find(e=>e.kind==='game'&&e.view.stage==='DEALING').view.myHand,[]);
 await until(()=>events.every(ev=>ev.find(e=>e.kind==='game'&&e.view.stage==='CARDS_DEALT')));
 await until(()=>events.every(ev=>ev.at(-1)?.view?.stage==='MUS_DECISION'));
 const ids=view(0).players,byId=id=>sessions[ids.indexOf(id)];assert.equal(view(0).targetScore,30);
 assert.equal(new Set(events.map((_,i)=>view(i).myHand).flat().map(c=>c.suit+':'+c.rank)).size,16);
 for(let i=0;i<4;i++){const v=view(i);assert.equal(v.myHand.length,4);assert.ok(!v.hands&&!v.stock&&!v.seed&&!v.discarded&&!v.pendingDiscard&&!v.revealedHands);}
 for(let i=0;i<4;i++){await byId(view(0).turnPlayer).sendAction({type:'mus',wantsMus:true});await tick();}
 await until(()=>view(0).phase==='discard');const oldRevision=view(0).revision,round=view(0).discardRound;
 // Four independent clients confirm against the same received revision.
 await Promise.all(sessions.map((session,i)=>session.sendAction({type:'discard',cards:[view(i).myHand[0]],expectedRevision:oldRevision,expectedDiscardRound:round})));
 await until(()=>events.every(ev=>ev.find(e=>e.kind==='game'&&e.view.stage==='MUS_REDEAL')));
 for(let i=0;i<4;i++)assert.deepEqual(events[i].find(e=>e.kind==='game'&&e.view.stage==='MUS_REDEAL').view.myHand,[]);
 await until(()=>view(0).stage==='MUS_DECISION');assert.deepEqual(events.flat().filter(e=>e.kind==='error'),[]);
 const handBefore=JSON.stringify(view(2).myHand);sessions[2].ws.close();await tick();assert.equal(sessions[0].local.players().length,4);await assert.rejects(sessions[0].sendAction({type:'mus',wantsMus:false}),/pausa/);clearTimeout(sessions[2].timer);await sessions[2].connect();await tick();await tick();assert.equal(JSON.stringify(view(2).myHand),handBefore);
 await byId(view(0).turnPlayer).sendAction({type:'mus',wantsMus:false});await until(()=>view(0).phase==='grande');
 await byId(view(0).turnPlayer).sendAction({type:'bet',amount:4});await until(()=>view(0).betting?.pendingBet?.amount===4);
 await byId(view(0).turnPlayer).sendAction({type:'accept'});await until(()=>view(0).phase==='chica');assert.deepEqual(view(0).scores,{A:0,B:0});assert.ok(!view(0).results&&!view(0).revealedHands);
 for(const packet of packets.filter(p=>p.message?.type==='state')){const v=packet.message.data.view;if(!['showing','counting','showdown','finished'].includes(v.phase))assert.ok(!v.revealedHands&&!v.results);assert.ok(!v.hands&&!v.stock&&!v.pendingDiscard);const own=sessions[0].local.engine.view(sessions[0].local.state,packet.target);assert.ok(Array.isArray(v.myHand));}
 assert.deepEqual(events.flat().filter(e=>e.kind==='error'&&!e.message.startsWith('Sin conexión')),[]);console.log('Mus LAN: cuatro sesiones, reparto y reposición ocultos, vistas privadas, descartes simultáneos, reconexión, objetivo 30 y envite pendiente: OK');
}finally{sessions.forEach(s=>s.close());}
