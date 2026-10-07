import { connectFirebase } from './firebase-client.js';
import { activationCodeHash } from './activation-code.js';
import { distributionConfig } from './distribution-config.js';
import { doc, getDocFromServer, runTransaction, serverTimestamp, EmailAuthProvider,
  linkWithCredential, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from './firebase-sdk.js';

const CACHE_KEY = 'elteto.hostAccess.v1';
function remember(user, grant) {
  const value = { uid: user.uid, email: user.email, mode: grant?.mode, active: grant?.status === 'active' };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(value)); } catch {}
  return value;
}
export function cachedHostAccess() {
  try { const value = JSON.parse(localStorage.getItem(CACHE_KEY)); return value?.active && value?.uid && (value.mode !== 'development' || distributionConfig.developmentAdminEnabled) ? value : null; }
  catch { return null; }
}
export function accessError(error) {
  const messages = {
    'auth/email-already-in-use': 'Ya tienes cuenta. Pulsa «Ya tengo acceso».',
    'auth/credential-already-in-use': 'Ya tienes cuenta. Pulsa «Ya tengo acceso».',
    'auth/invalid-credential': 'Revisa el correo y la contraseña.',
    'auth/invalid-email': 'Revisa tu correo.',
    'auth/weak-password': 'Usa una contraseña de al menos 8 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un momento.',
    'auth/network-request-failed': 'Necesitas internet para activar o recuperar el acceso.',
    'auth/operation-not-allowed': 'Falta habilitar correo y contraseña en Firebase.',
    'permission-denied': 'No se pudo validar el acceso. Revisa el código o consulta con quien te invitó.',
    'unavailable': 'Necesitas internet para validar el acceso.',
  };
  return new Error(messages[error?.code] || error?.message || 'No se pudo validar el acceso.');
}
export async function redeemActivationCode(code, connection = connectFirebase()) {
  const hash = await activationCodeHash(code);
  const { db, uid } = await connection;
  const invitation = doc(db, 'activationCodes', hash), access = doc(db, 'hostAccess', uid);
  await runTransaction(db, async tx => {
    const [grant, invite] = await Promise.all([tx.get(access), tx.get(invitation)]);
    if (grant.exists()) throw new Error('Esta cuenta ya tiene acceso asignado. No necesitas otro código.');
    const data = invite.data();
    if (!data || data.status !== 'unused' || (data.expiresAt && data.expiresAt.toMillis() <= Date.now())) {
      throw new Error('El código no es válido, ya se ha usado o ha caducado.');
    }
    tx.update(invitation, { status: 'used', usedBy: uid, usedAt: serverTimestamp() });
    tx.set(access, { status: 'active', codeHash: hash, redeemedAt: serverTimestamp() });
  });
}
export async function readHostAccess() {
  const connection = await connectFirebase();
  const user = connection.auth.currentUser;
  if (!user) return null;
  const grant = (await getDocFromServer(doc(connection.db, 'hostAccess', user.uid))).data();
  const access = remember(user, grant);
  return access.active ? access : null;
}
export async function requireHostAccess() {
  if (globalThis.window?.ELTETO_LAN?.hostKey && globalThis.window?.EltetoActivation?.isActivated()) return true;
  // Una Wi-Fi sin salida a internet puede seguir indicando navigator.onLine=true.
  // El permiso local ya concedido permite abrir la mesa sin esperar a la red;
  // OnlineSession.create vuelve a comprobar la licencia en el servidor.
  if (cachedHostAccess()) return true;
  if (!(await readHostAccess())) throw new Error('Activa tu invitación para crear partidas.');
  return true;
}
export async function activateHost({ email, password, code, login = false }) {
  try {
    if (!login) {
      await activationCodeHash(code);
      if (password.length < 8) throw new Error('Usa una contraseña de al menos 8 caracteres.');
    }
    const { auth } = await connectFirebase();
    if (login) await signInWithEmailAndPassword(auth, email.trim(), password);
    else if (auth.currentUser.isAnonymous) await linkWithCredential(auth.currentUser, EmailAuthProvider.credential(email.trim(), password));
    else if (auth.currentUser.email?.toLowerCase() !== email.trim().toLowerCase()) throw new Error('Cierra la sesión actual antes de activar otra cuenta.');
    if (!login) await redeemActivationCode(code);
    const access = await readHostAccess();
    if (!access) throw new Error('Esta cuenta no tiene una invitación activa.');
    if (globalThis.window?.EltetoActivation) {
      const result = JSON.parse(window.EltetoActivation.activate(await auth.currentUser.getIdToken(true)));
      if (!result.ok) throw new Error(result.message || 'No se pudo activar este Android.');
    }
    return access;
  } catch (error) { throw accessError(error); }
}
// Enlace privado de desarrollo: Firebase solo admite el canje anónimo de
// invitaciones marcadas por administración. No es un bypass público del cliente.
export async function activateDevelopmentAdmin(code) {
  try {
    const connection = await connectFirebase();
    if (!(await readHostAccess())) await redeemActivationCode(code, connection);
    const access = await readHostAccess();
    if (!access) throw new Error('No se pudo activar el acceso de desarrollo.');
    if (globalThis.window?.EltetoActivation) {
      const result = JSON.parse(window.EltetoActivation.activate(await connection.auth.currentUser.getIdToken(true)));
      if (!result.ok) throw new Error(result.message || 'No se pudo activar este Android.');
    }
    return access;
  } catch (error) { throw accessError(error); }
}
export async function activatePublicDevelopmentAdmin(connection = connectFirebase()) {
  if (!distributionConfig.developmentAdminEnabled) throw new Error('El acceso de desarrollo está desactivado.');
  const { db, auth, uid } = await connection;
  const setting = doc(db, 'configuration', 'development'), access = doc(db, 'hostAccess', uid);
  await runTransaction(db, async tx => {
    const [config, grant] = await Promise.all([tx.get(setting), tx.get(access)]);
    if (config.data()?.enabled !== true) throw new Error('El acceso de desarrollo está desactivado.');
    if (grant.exists()) {
      if (grant.data().status !== 'active') throw new Error('Este acceso está revocado.');
      return;
    }
    tx.set(access, { status: 'active', mode: 'development', redeemedAt: serverTimestamp() });
  });
  const grant = (await getDocFromServer(access)).data();
  const result = remember(auth.currentUser, grant);
  if (globalThis.window?.EltetoActivation) {
    const native = JSON.parse(window.EltetoActivation.activate(await auth.currentUser.getIdToken(true)));
    if (!native.ok) throw new Error(native.message || 'No se pudo activar este Android.');
  }
  return result;
}
export async function recoverHostPassword(email) {
  try { const { auth } = await connectFirebase(); await sendPasswordResetEmail(auth, email.trim()); }
  catch (error) { throw accessError(error); }
}
export async function leaveHostAccount() {
  const { auth } = await connectFirebase();
  await signOut(auth);
  try { localStorage.removeItem(CACHE_KEY); } catch {}
  window.EltetoActivation?.deactivate();
}
