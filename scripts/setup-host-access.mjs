import { adminRequest, project } from './firebase-admin-client.mjs';
const url=`https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`;
const config=await adminRequest(url);
if(!config.signIn?.email?.enabled || !config.signIn.email.passwordRequired) {
  await adminRequest(`${url}?updateMask=signIn.email`,{method:'PATCH',body:JSON.stringify({signIn:{email:{enabled:true,passwordRequired:true}}})});
}
console.log('Acceso por correo y contraseña habilitado. No se han cambiado el plan ni la facturación.');
