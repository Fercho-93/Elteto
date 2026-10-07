import assert from 'node:assert/strict';
import fs from 'node:fs';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, createUserWithEmailAndPassword, signInWithEmailAndPassword, signInAnonymously } from 'firebase/auth';
import { initializeFirestore, connectFirestoreEmulator, doc, getDocFromServer, setDoc, updateDoc, getDocs, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing';
globalThis.location = new URL('https://fercho-93.github.io/Elteto/');
globalThis.document = {visibilityState:'visible',addEventListener(){},removeEventListener(){}};
const { redeemActivationCode } = await import('../dist/host-access.js');
const { createActivationCode, activationCodeHash } = await import('../dist/activation-code.js');
const { OnlineSession } = await import('../dist/online-room.js');
const env = await initializeTestEnvironment({projectId:'demo-elteto',firestore:{host:'127.0.0.1',port:8080,rules:fs.readFileSync('firestore.rules','utf8')}});
const apps = [], sessions = [];
let n=0;
async function connect(email, password='Prueba-12345') {
  const app=initializeApp({apiKey:'demo-key',projectId:'demo-elteto',authDomain:'demo-elteto.firebaseapp.com'},`access-${++n}`);apps.push(app);
  const auth=getAuth(app);connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
  const db=initializeFirestore(app,{});connectFirestoreEmulator(db,'127.0.0.1',8080);
  if(email) {
    try { await createUserWithEmailAndPassword(auth,email,password); }
    catch(e) { if(e.code!=='auth/email-already-in-use')throw e;await signInWithEmailAndPassword(auth,email,password); }
  } else await signInAnonymously(auth);
  return {db,auth,uid:auth.currentUser.uid};
}
async function issue(expiresAt=null,kind=null) {
  const code=createActivationCode(),hash=await activationCodeHash(code);
  await env.withSecurityRulesDisabled(ctx=>setDoc(doc(ctx.firestore(),'activationCodes',hash),{status:'unused',createdAt:Timestamp.now(),expiresAt,usedBy:null,usedAt:null,...(kind?{kind}:{})}));
  return {code,hash};
}
try {
  await env.clearFirestore();
  const a=await connect('ana@elteto.test'),b=await connect('bea@elteto.test'),anon=await connect();
  const invite=await issue();
  await assertFails(getDocs(collection(a.db,'activationCodes')));
  await assertFails(setDoc(doc(a.db,'activationCodes','f'.repeat(64)),{status:'unused'}));
  await assertFails(setDoc(doc(a.db,'hostAccess',a.uid),{status:'active',codeHash:invite.hash,redeemedAt:serverTimestamp()}));
  await assertFails(updateDoc(doc(a.db,'activationCodes',invite.hash),{status:'used',usedBy:a.uid,usedAt:serverTimestamp()}));
  await assert.rejects(redeemActivationCode(invite.code,anon));
  await assert.rejects(OnlineSession.create({gameId:'cinquillo',hostName:'Invitado'},()=>{},anon),/Activa/);
  const results=await Promise.allSettled([redeemActivationCode(invite.code,a),redeemActivationCode(invite.code,b)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1,'solo una persona gana la carrera');
  const winner=results[0].status==='fulfilled'?a:b,loser=winner===a?b:a;
  const consumed=(await getDocFromServer(doc(winner.db,'activationCodes',invite.hash))).data();
  assert.equal(consumed.status,'used');assert.equal(consumed.usedBy,winner.uid);
  await assert.rejects(redeemActivationCode(invite.code,loser),/usado|válido/);
  await assertFails(updateDoc(doc(winner.db,'activationCodes',invite.hash),{status:'unused',usedBy:null,usedAt:null}));
  const fresh=await issue();await assert.rejects(redeemActivationCode(fresh.code,winner),/ya tiene/);
  assert.equal((await getDocFromServer(doc(loser.db,'activationCodes',fresh.hash))).data().status,'unused');
  const expired=await issue(Timestamp.fromMillis(Date.now()-60000));await assert.rejects(redeemActivationCode(expired.code,loser),/caducado/);
  await assertFails(getDocFromServer(doc(loser.db,'hostAccess',winner.uid)));
  const recovered=await connect(winner.auth.currentUser.email);
  assert.equal(recovered.uid,winner.uid);
  assert.equal((await getDocFromServer(doc(recovered.db,'hostAccess',recovered.uid))).data().status,'active');
  const host=await OnlineSession.create({gameId:'cinquillo',hostName:'Ana'},()=>{},winner);sessions.push(host);
  const guest=await OnlineSession.join(host.roomCode,'Invitado',()=>{},anon);sessions.push(guest);
  await assert.rejects(OnlineSession.create({gameId:'cinquillo',hostName:'Invitado'},()=>{},anon),/Activa/);
  await assert.rejects(guest.claimHost(),/invitados/);
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'hostAccess',winner.uid),{status:'revoked'}));
  await assert.rejects(OnlineSession.create({gameId:'cinquillo',hostName:'Ana'},()=>{},winner),/Activa/);
  await assert.rejects(redeemActivationCode(invite.code,winner),/ya tiene/);
  const developer=await connect(),other=await connect();
  const privateLink=await issue(Timestamp.fromMillis(Date.now()+86400000),'development-admin');
  await redeemActivationCode(privateLink.code,developer);
  assert.equal(developer.auth.currentUser.isAnonymous,true,'desarrollo sin correo ni contraseña');
  assert.equal((await getDocFromServer(doc(developer.db,'hostAccess',developer.uid))).data().status,'active');
  const developmentRoom=await OnlineSession.create({gameId:'cinquillo',hostName:'Administrador'},()=>{},developer);sessions.push(developmentRoom);
  await assert.rejects(redeemActivationCode(privateLink.code,other),/usado|válido/);
  await assert.rejects(redeemActivationCode((await issue()).code,other));
  await assert.rejects(redeemActivationCode((await issue(Timestamp.fromMillis(Date.now()-60000),'development-admin')).code,other),/caducado/);
  await assertFails(setDoc(doc(other.db,'activationCodes','e'.repeat(64)),{status:'unused',kind:'development-admin'}));
  await env.withSecurityRulesDisabled(ctx=>updateDoc(doc(ctx.firestore(),'hostAccess',developer.uid),{status:'revoked'}));
  await assert.rejects(OnlineSession.create({gameId:'cinquillo',hostName:'Administrador'},()=>{},developer),/Activa/);
  console.log('Acceso real: carrera entre dos cuentas, canje atómico, permisos, caducidad, recuperación, invitados y revocación: OK');
} finally {for(const session of sessions)session.teardown();await env.cleanup();await Promise.all(apps.map(deleteApp));}
