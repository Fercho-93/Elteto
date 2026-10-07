import { adminRequest, project } from './firebase-admin-client.mjs';
const value=process.env.ELTETO_PUBLIC_DEVELOPMENT;
if (!['true','false'].includes(value)) throw Error('Indica true o false para el acceso de desarrollo.');
await adminRequest(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/configuration/development`,{
  method:'PATCH',body:JSON.stringify({fields:{enabled:{booleanValue:value==='true'}}})
});
console.log(`Acceso público de desarrollo ${value==='true'?'activado':'desactivado'}. No concede permisos administrativos sobre Firebase.`);
