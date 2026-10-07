import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
export const project='elteto-fercho93';
let tokenPromise;
export function adminToken() { return tokenPromise ||= loadToken(); }
async function loadToken() {
  if(process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const firebaseRequire=createRequire(require.resolve('firebase-tools/package.json'));
    const {GoogleAuth}=firebaseRequire('google-auth-library');
    return new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getAccessToken();
  }
  const auth=require('firebase-tools/lib/auth'),account=auth.getGlobalDefaultAccount();
  if(!account)throw Error('Ejecuta npx firebase-tools login antes de administrar invitaciones.');
  return (await auth.getAccessToken(account.tokens.refresh_token,['https://www.googleapis.com/auth/cloud-platform'])).access_token;
}
export async function adminRequest(url,options={}) {
  const token=await adminToken();
  const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'}});
  if(!response.ok) { const error=Error(`La administración de Firebase rechazó la operación (${response.status}). Revisa los permisos de la cuenta.`);error.status=response.status;throw error; }
  return response.json();
}
