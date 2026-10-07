// Solo administración local. Usa la sesión de firebase login; nunca una clave
// incrustada en la web ni credenciales guardadas en el repositorio.
import { mkdir, writeFile } from 'node:fs/promises';
import { createActivationCode, activationCodeHash } from '../apps/web/activation-code.js';
import { adminRequest as request } from './firebase-admin-client.mjs';
import { spawnSync } from 'node:child_process';
const base='https://firestore.googleapis.com/v1/projects/elteto-fercho93/databases/(default)/documents';
const [command='list',arg='20',mode='']=process.argv.slice(2);
async function register(hash) {
  const development = process.env.ELTETO_DEVELOPMENT_ADMIN === 'true';
  try { await request(`${base}/activationCodes?documentId=${hash}`,{method:'POST',body:JSON.stringify({fields:{status:{stringValue:'unused'},createdAt:{timestampValue:new Date().toISOString()},expiresAt:development?{timestampValue:new Date(Date.now()+86400000).toISOString()}:{nullValue:null},usedBy:{nullValue:null},usedAt:{nullValue:null},...(development?{kind:{stringValue:'development-admin'}}:{})}})}); }
  catch(error) { if(error.status!==409)throw error; }
}
if(command==='generate') {
  const count=Number(arg);if(!Number.isInteger(count)||count<1||count>500)throw Error('Indica entre 1 y 500 invitaciones.');
  const rows=['codigo,enlace'],hashes=[];
  // Guardar primero cada código evita perder las invitaciones si se interrumpe la red.
  await mkdir('.private',{recursive:true});
  const filename=`.private/invitaciones-${Date.now()}.csv`;
  for(let i=0;i<count;i++) {
    const code=createActivationCode(),hash=await activationCodeHash(code);
    hashes.push(hash);
    rows.push(`${code},https://fercho-93.github.io/Elteto/#activate=${code}`);
    await writeFile(filename,rows.join('\n')+'\n',{mode:0o600});
    if(mode!=='--github')await register(hash);
  }
  if(mode==='--github') {
    const result=spawnSync('gh',['workflow','run','invitaciones.yml','--repo','Fercho-93/Elteto','--json'],{input:JSON.stringify({huellas:hashes.join(',')}),encoding:'utf8'});
    if(result.status!==0)throw Error('No se pudo lanzar el registro en GitHub. El CSV permanece guardado localmente.');
    console.log(`Registro solicitado para ${count} invitaciones. Espera el resultado del workflow antes de repartirlas.`);
  }
  console.log(`Archivo privado: ${filename}. No lo subas ni lo compartas completo.`);
} else if(command==='register-hashes') {
  const hashes=(process.env.ELTETO_INVITATION_HASHES||'').split(',');
  if(hashes.length>500||hashes.some(h=>!/^([a-f0-9]{64})$/.test(h)))throw Error('Huellas no válidas.');
  for(const hash of new Set(hashes))await register(hash);
  console.log(`${hashes.length} huellas registradas; ningún código completo ha viajado a GitHub.`);
} else if(command==='list') {
  let pageToken;
  do {
    const url=new URL(`${base}/activationCodes`);url.searchParams.set('pageSize','500');if(pageToken)url.searchParams.set('pageToken',pageToken);
    const data=await request(url);for(const doc of data.documents||[])console.log(`${doc.name.split('/').at(-1).slice(0,12)}…  ${doc.fields.status.stringValue}  ${doc.fields.usedBy?.stringValue||'sin asignar'}`);
    pageToken=data.nextPageToken;
  }while(pageToken);
} else if(command==='revoke') {
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(arg))throw Error('Indica el UID de la cuenta a revocar.');
  await request(`${base}/hostAccess/${arg}?updateMask.fieldPaths=status&currentDocument.exists=true`,{method:'PATCH',body:JSON.stringify({fields:{status:{stringValue:'revoked'}}})});
  console.log('Acceso revocado. La invitación sigue consumida.');
} else throw Error('Uso: node scripts/manage-invitations.mjs generate 20 | list | revoke UID');
