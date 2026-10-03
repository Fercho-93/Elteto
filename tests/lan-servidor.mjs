// Tests the actual Java HTTP/WebSocket relay with independent connections.
// LAN_JAVA_CP must contain LanServerMain, LanServer and their Maven dependencies.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
const cp=process.env.LAN_JAVA_CP || await readFile('.lan-java-classpath','utf8');
const server=spawn('java',['-cp',cp,'LanServerMain','dist','0']);
server.stderr.on('data',data=>process.stderr.write(data));
let hostUrl;
const timeout=setTimeout(()=>{server.kill();throw new Error('Server startup timeout')},10000);
try {
 const [output]=await once(server.stdout,'data');hostUrl=String(output).trim();
 const base=new URL(hostUrl).origin;
 const config=await fetch(base+'/lan-config').then(r=>r.json());
 assert.match(config.roomCode,/^[A-HJ-NP-Z2-9]{8}$/);
 assert.equal(config.hostKey,undefined);
 assert.match(await fetch(base+'/').then(r=>r.text()),/lan-config/);
 assert.match(await fetch(base+'/game-core/index.js').then(r=>r.text()),/registerGame/);
 const connect=async url=>{
  const ws=new WebSocket(url);const inbox=[];
  ws.addEventListener('message',e=>inbox.push(JSON.parse(e.data)));
  await once(ws,'open');
  const wait=async type=>{for(let i=0;i<100;i++){const idx=inbox.findIndex(m=>m.type===type);if(idx>=0)return inbox.splice(idx,1)[0];await new Promise(r=>setTimeout(r,10));}throw Error('No '+type)};
  return {ws,inbox,wait};
 };
 const wsBase=base.replace('http:','ws:')+'/socket';
 const invalid=await connect(wsBase+'?code=WRONG&resume='+'a'.repeat(48));
 assert.equal((await invalid.wait('fatal')).message,'Invitación local no válida.');
 const host=await connect(wsBase+'?host='+new URLSearchParams(new URL(hostUrl).hash.slice(1)).get('host'));
 await host.wait('connected');
 const g1=await connect(wsBase+'?code='+config.roomCode+'&resume='+'a'.repeat(48));await g1.wait('connected');
 const g2=await connect(wsBase+'?code='+config.roomCode+'&resume='+'b'.repeat(48));await g2.wait('connected');
 g1.ws.send(JSON.stringify({type:'hello',data:{name:'A'}}));
 const hello=await host.wait('guest-message');const playerId=hello.playerId;assert.notEqual(playerId,'a'.repeat(48));assert.match(playerId,/^[a-f0-9-]{36}$/);
 host.ws.send(JSON.stringify({target:hello.playerId,message:{type:'private-hand',cards:['secret']}}));
 assert.deepEqual((await g1.wait('private-hand')).cards,['secret']);
 await new Promise(r=>setTimeout(r,40));assert.equal(g2.inbox.some(m=>m.type==='private-hand'),false);
 g1.ws.close();assert.equal((await host.wait('guest-left')).playerId,playerId);
 const back=await connect(wsBase+'?code='+config.roomCode+'&resume='+'a'.repeat(48));await back.wait('connected');
 back.ws.send(JSON.stringify({type:'hello'}));assert.equal((await host.wait('guest-message')).playerId,playerId);
 host.ws.close();assert.match((await g2.wait('fatal')).message,/cerrado/);assert.match((await back.wait('fatal')).message,/cerrado/);
 console.log('Servidor Java real: HTTP offline, autorización, rutas privadas, reconexión y cierre: OK');
} finally {clearTimeout(timeout);server.kill();}
