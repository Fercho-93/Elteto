// 120 bits aleatorios. No contiene datos personales y nunca se publica el código
// en el catálogo: Firestore guarda únicamente su huella SHA-256.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function normalizeActivationCode(value) {
  let code = String(value || '').trim();
  if (/^https?:\/\//i.test(code)) {
    try { code = new URLSearchParams(new URL(code).hash.slice(1)).get('activate') || ''; }
    catch { return ''; }
  }
  return code.toUpperCase().replace(/[\s-]/g, '');
}
export function createActivationCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const code = Array.from(bytes, b => ALPHABET[b % 32]).join('');
  return code.match(/.{4}/g).join('-');
}
export async function activationCodeHash(value) {
  const code = normalizeActivationCode(value);
  if (!/^[A-HJ-NP-Z2-9]{24}$/.test(code)) throw new Error('Revisa el código de invitación.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
