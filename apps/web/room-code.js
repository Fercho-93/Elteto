// Códigos e invitaciones de sala. Sin dependencias: lo carga la aplicación al arrancar,
// incluso sin conexión, para reconocer un enlace de invitación.
const ROOM_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;

export function createRoomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (byte) => ROOM_CHARS[byte % ROOM_CHARS.length]).join("");
}

export function parseRoomCode(value) {
  const input = String(value || "").trim();
  if (ROOM_CODE_PATTERN.test(input.toUpperCase()) && !/[/:.?]/.test(input)) return input.toUpperCase();
  try {
    const url = new URL(input, globalThis.location?.origin || "http://localhost");
    const code = (url.searchParams.get("join") || "").toUpperCase();
    return ROOM_CODE_PATTERN.test(code) ? code : null;
  } catch { return null; }
}

export function inviteUrlFor(code) {
  const url = new URL('./guest.html', globalThis.location.href);
  url.searchParams.set("join", code);
  return url.toString();
}
