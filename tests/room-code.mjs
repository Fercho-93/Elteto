import assert from "node:assert/strict";
globalThis.location = new URL("https://fercho-93.github.io/Elteto/");
const { createRoomCode, parseRoomCode, inviteUrlFor, ROOM_CODE_PATTERN } = await import("../apps/web/room-code.js");

// Los códigos usan el alfabeto sin I ni O y cumplen el patrón que exigen las reglas.
const seen = new Set();
for (let i = 0; i < 500; i++) {
  const code = createRoomCode();
  assert.match(code, ROOM_CODE_PATTERN);
  seen.add(code);
}
assert.ok(seen.size > 490, "los códigos no se repiten");

assert.equal(parseRoomCode("abcd2345"), "ABCD2345");
assert.equal(parseRoomCode("  ABCD2345 "), "ABCD2345");
assert.equal(parseRoomCode("?join=ABCD2345"), "ABCD2345");
assert.equal(parseRoomCode("https://fercho-93.github.io/Elteto/?join=abcd2345"), "ABCD2345");
assert.equal(parseRoomCode(inviteUrlFor("ABCD2345")), "ABCD2345");
// Lo que no es un código de sala (incluida la señal offline) no se confunde con uno.
assert.equal(parseRoomCode(""), null);
assert.equal(parseRoomCode(null), null);
assert.equal(parseRoomCode("ABCD234"), null);
assert.equal(parseRoomCode("ABCI2345"), null);
assert.equal(parseRoomCode("ABCD2345EXTRA"), null);
assert.equal(parseRoomCode("https://fercho-93.github.io/Elteto/?join=" + "a".repeat(32)), null);
assert.equal(parseRoomCode("eJxVjsEKwjAQRH9lyblQIgpR4kXx4MmL4DFkm9jQJCvZjRbEf7fVHgS9DPMGZubNtFd8yuXHjmpMn4K0JkU8Wv4gHQ0mwj7AfvAhONJcoqL5JyYk6oR8QUCyBHkL8c3fL0Ae"), null);
console.log("Códigos de sala e invitaciones: OK");
