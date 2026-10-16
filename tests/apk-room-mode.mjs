import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile('apps/web/app.js','utf8');
// Exercise the shipping dispatch and online setup, replacing only network transports.
const create=source.split('else if (action === "create-room") {')[1].split('} else if (action === "join-room")')[0];
const online=source.split('async function openOnlineRoom() {')[1].split('async function beginOnlineJoin')[0];
for (const mode of ['lan','online']) {
 const calls=[];
 const session={roomCode:'ABCD2345',inviteUrl:mode==='lan'?'http://192.168.1.2:3000/?join=ABCD2345':'https://fercho-93.github.io/Elteto/guest.html?join=ABCD2345'};
 const state={character:0};
 const context=vm.createContext({state,LAN:{hostKey:'local'},GUEST:false,Boolean,
  document:{querySelector(selector){return {value:selector.includes('room-mode')?mode:selector.includes('game')?'mus':selector.includes('name')?'Ana':'Mesa'};}},
  availableGames:x=>x,listGames:()=>[{id:'mus'}],readHostAccess:async()=>null,cachedHostAccess:()=>null,
  distributionConfig:{developmentAdminEnabled:true},activatePublicDevelopmentAdmin:async()=>calls.push('authorize'),
  onOnlineChange(){},renderLobby(){calls.push('lobby')},
  LanSession:{create:async()=>{calls.push('lan');return session;}},OnlineSession:{create:async()=>{calls.push('online');return session;}}
 });
 vm.runInContext('async function openOnlineRoom() {'+online.replace('const { OnlineSession } = await import("./online-room.js");','')+'\nasync function createRoom(){'+create.replace('const { LanSession } = await import("./lan-session.js");','')+'}',context);
 await vm.runInContext('createRoom()',context);
 assert.deepEqual(calls,mode==='lan'?['lan','lobby']:['authorize','online','lobby']);
 assert.equal(state.inviteMode,mode);
 assert.equal(state.offerCode,session.inviteUrl);
 if(mode==='online') {
  context.state.online=null;context.state.host=null;context.distributionConfig.developmentAdminEnabled=false;
  await assert.rejects(vm.runInContext('openOnlineRoom()',context),/Activa tu acceso online/);
 }
}
console.log('APK: local creation without cloud authorization, authorized online creation, disabled-access rejection and correct invitations: OK');
