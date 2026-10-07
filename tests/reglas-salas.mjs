// Reglas de firestore.rules para las salas online, contra el emulador oficial.
//   npm run test:reglas      (necesita Java)
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs, collection, serverTimestamp, writeBatch, Timestamp } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "demo-elteto",
  firestore: { host: "127.0.0.1", port: 8080, rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});
// Una instancia por persona: las referencias de un lote tienen que salir de la misma.
const instances = new Map();
const db = (uid) => { if (!instances.has(uid)) instances.set(uid, env.authenticatedContext(uid).firestore()); return instances.get(uid); };
const anon = () => { if (!instances.has(null)) instances.set(null, env.unauthenticatedContext().firestore()); return instances.get(null); };
const CODE = "ABCD2345";
const room = (uid, code = CODE) => doc(db(uid), "rooms", code);
const sub = (uid, ...path) => doc(db(uid), "rooms", CODE, ...path);
const player = (name) => ({ name, joinedAt: 1 });
const baseRoom = (extra = {}) => ({
  roomCode: CODE, gameId: "cinquillo", roomName: "Mesa", hostUid: "ana", status: "lobby", version: 1,
  minPlayers: 2, maxPlayers: 3, playerOrder: ["ana", "bea"], players: { ana: player("Ana"), bea: player("Bea") },
  createdAt: Timestamp.fromMillis(Date.now() - 100000), updatedAt: Timestamp.fromMillis(Date.now() - 100000), ...extra,
});
const seed = async (data = baseRoom(), more = async () => {}) => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => { await setDoc(doc(ctx.firestore(), 'hostAccess', 'ana'), { status: 'active' }); await setDoc(doc(ctx.firestore(), "rooms", CODE), data); await more(ctx.firestore()); });
};
const bump = (data, patch) => ({ ...patch, version: data.version + 1, updatedAt: serverTimestamp() });
let checks = 0;
const ok = async (label, promise) => { try { await assertSucceeds(promise); checks++; } catch (error) { throw new Error(`Debería funcionar: ${label}\n${error.message}`); } };
const no = async (label, promise) => { try { await assertFails(promise); checks++; } catch (error) { throw new Error(`Debería fallar: ${label}\n${error.message}`); } };

try {
  // --- Crear una sala y la cuota ------------------------------------------------------
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'hostAccess', 'ana'), {status: 'active'}));
  const fresh = (uid, code = CODE, extra = {}) => ({
    roomCode: code, gameId: "mus", roomName: "Mesa", hostUid: uid, status: "lobby", version: 1, minPlayers: 4, maxPlayers: 4,
    playerOrder: [uid], players: { [uid]: player(uid) }, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), ...extra,
  });
  const create = (uid, code = CODE, extra = {}) => {
    const batch = writeBatch(db(uid));
    batch.set(doc(db(uid), "roomCreation", uid), { lastCreatedAt: serverTimestamp(), roomCode: code });
    batch.set(doc(db(uid), "rooms", code), fresh(uid, code, extra));
    return batch.commit();
  };
  await no("sin sesión", (async () => { const b = writeBatch(anon()); b.set(doc(anon(), "rooms", CODE), fresh("x")); return b.commit(); })());
  await no("sin registro de cuota", setDoc(room("ana"), fresh("ana")));
  await no('un invitado no crea salas aunque imite la app', create('cris'));
  await no("código con letras prohibidas (I, O)", create("ana", "ABCI2345"));
  await no("anfitrión que no es quien escribe", create("ana", CODE, { hostUid: "bea" }));
  await no("más plazas de las permitidas", create("ana", CODE, { maxPlayers: 9 }));
  await no("empezar ya en juego", create("ana", CODE, { status: "playing" }));
  await no("jugadores de más al crear", create("ana", CODE, { playerOrder: ["ana", "bea"], players: { ana: player("Ana"), bea: player("Bea") } }));
  await no("nombre vacío", create("ana", CODE, { players: { ana: player("") } }));
  await ok("crear sala", create("ana"));
  await no("segunda sala antes de 30 s", create("ana", "ZZZZ2222"));
  await no("pisar una sala existente", create("bea"));
  await no("cuota de otra persona", setDoc(doc(db("bea"), "roomCreation", "ana"), { lastCreatedAt: serverTimestamp(), roomCode: "QQQQ2222" }));
  await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "roomCreation", "ana"), { lastCreatedAt: Timestamp.fromMillis(Date.now() - 60000), roomCode: CODE }));
  await ok("otra sala pasados 30 s", create("ana", "ZZZZ2222"));

  // --- Leer ---------------------------------------------------------------------------
  await seed();
  await ok("un desconocido lee el vestíbulo para poder entrar", getDoc(room("cris")));
  await ok("una sala inexistente se lee como vacía", getDoc(room("cris", "ZZZZ9999")));
  await no("sin sesión no se lee", getDoc(doc(anon(), "rooms", CODE)));
  await no("no se listan las salas", getDocs(collection(db("ana"), "rooms")));
  await seed(baseRoom({ status: "playing" }));
  await no("una partida en marcha solo la ven sus jugadores", getDoc(room("cris")));
  await ok("un jugador lee su partida", getDoc(room("bea")));

  // --- Entrar, salir, expulsar --------------------------------------------------------
  const lobby = baseRoom();
  const join = (uid, data = lobby, patch = {}) => updateDoc(room(uid), bump(data, {
    players: { ...data.players, [uid]: player(uid) }, playerOrder: [...data.playerOrder, uid], ...patch }));
  await seed();
  await ok("entrar en el vestíbulo", join("cris"));
  await seed();
  await no("entrar con otro uid en el mapa", updateDoc(room("cris"), bump(lobby, { players: { ...lobby.players, dani: player("Dani") }, playerOrder: [...lobby.playerOrder, "cris"] })));
  await no("colarse en medio del orden", updateDoc(room("cris"), bump(lobby, { players: { ...lobby.players, cris: player("Cris") }, playerOrder: ["cris", ...lobby.playerOrder] })));
  await no("entrar sin subir la versión", updateDoc(room("cris"), { players: { ...lobby.players, cris: player("Cris") }, playerOrder: [...lobby.playerOrder, "cris"], updatedAt: serverTimestamp() }));
  await no("entrar y ser anfitrión a la vez", join("cris", lobby, { hostUid: "cris" }));
  await no("entrar con nombre vacío", updateDoc(room("cris"), bump(lobby, { players: { ...lobby.players, cris: player("") }, playerOrder: [...lobby.playerOrder, "cris"] })));
  await seed(baseRoom({ playerOrder: ["ana", "bea", "cris"], players: { ana: player("Ana"), bea: player("Bea"), cris: player("Cris") } }));
  await no("sala completa", join("dani", baseRoom({ playerOrder: ["ana", "bea", "cris"], players: { ana: player("Ana"), bea: player("Bea"), cris: player("Cris") } })));
  await seed(baseRoom({ status: "playing" }));
  await no("entrar con la partida en marcha", join("cris", baseRoom({ status: "playing" })));

  await seed();
  await no("el anfitrión no se marcha: cierra", updateDoc(room("ana"), bump(lobby, { players: { bea: player("Bea") }, playerOrder: ["bea"] })));
  await no("marchar a otra persona", updateDoc(room("bea"), bump(lobby, { players: { bea: player("Bea") }, playerOrder: ["bea"] })));
  await ok("marcharse del vestíbulo", updateDoc(room("bea"), bump(lobby, { players: { ana: player("Ana") }, playerOrder: ["ana"] })));
  await seed();
  await ok("el anfitrión expulsa", updateDoc(room("ana"), bump(lobby, { players: { ana: player("Ana") }, playerOrder: ["ana"] })));
  await seed();
  await no("expulsar sin ser anfitrión", updateDoc(room("cris"), bump(lobby, { players: { ana: player("Ana") }, playerOrder: ["ana"] })));
  await no("el anfitrión no se expulsa a sí mismo", updateDoc(room("ana"), bump(lobby, { players: { bea: player("Bea") }, playerOrder: ["bea"] })));

  // --- Empezar, jugar, cerrar ---------------------------------------------------------
  await seed();
  await no("empezar sin ser anfitrión", updateDoc(room("bea"), bump(lobby, { status: "playing" })));
  await no("empezar cambiando el anfitrión", updateDoc(room("ana"), bump(lobby, { status: "playing", hostUid: "bea" })));
  await no("cambiar el juego", updateDoc(room("ana"), bump(lobby, { status: "playing", gameId: "mus" })));
  await ok("empezar", updateDoc(room("ana"), bump(lobby, { status: "playing" })));
  const small = baseRoom({ minPlayers: 3 });
  await seed(small);
  await no("empezar sin jugadores suficientes", updateDoc(room("ana"), bump(small, { status: "playing" })));
  const playing = baseRoom({ status: "playing" });
  await seed(playing);
  await ok("el anfitrión confirma una jugada", updateDoc(room("ana"), bump(playing, {})));
  await seed(playing);
  await no("otra persona toca la versión", updateDoc(room("bea"), bump(playing, {})));
  await no("fechar la sala a mano", updateDoc(room("ana"), { version: 2, updatedAt: Timestamp.fromMillis(0) }));
  await no("volver al vestíbulo", updateDoc(room("ana"), bump(playing, { status: "lobby" })));
  await no("nadie borra una sala", deleteDoc(room("ana")));
  await no("cerrar sin ser anfitrión", updateDoc(room("bea"), bump(playing, { status: "ended" })));
  await ok("cerrar la sala", updateDoc(room("ana"), bump(playing, { status: "ended" })));
  await no("no se reabre una sala cerrada", updateDoc(room("ana"), bump(baseRoom({ status: "ended", version: 2 }), { status: "playing" })));

  // --- Presencia ----------------------------------------------------------------------
  await seed(playing);
  await ok("latido propio", setDoc(sub("bea", "presence", "bea"), { seenAt: serverTimestamp(), visible: true }));
  await no("latido de otra persona", setDoc(sub("bea", "presence", "ana"), { seenAt: serverTimestamp(), visible: true }));
  await no("latido con hora inventada", setDoc(sub("bea", "presence", "bea"), { seenAt: Timestamp.fromMillis(0), visible: true }));
  await no("latido de un extraño", setDoc(sub("cris", "presence", "cris"), { seenAt: serverTimestamp(), visible: true }));
  await ok("leer el latido de la sala", getDoc(sub("ana", "presence", "bea")));
  await no("extraño lee presencia", getDoc(sub("cris", "presence", "bea")));

  // --- Jugadas (actions) ----------------------------------------------------------------
  const act = (seq, json = "{}") => ({ seq, json, at: serverTimestamp() });
  await seed(playing);
  await ok("primera jugada", setDoc(sub("bea", "actions", "bea"), act(1)));
  await ok("jugada siguiente", setDoc(sub("bea", "actions", "bea"), act(2)));
  await no("repetir el mismo número", setDoc(sub("bea", "actions", "bea"), act(2)));
  await no("saltarse números", setDoc(sub("bea", "actions", "bea"), act(5)));
  await no("jugar por otra persona", setDoc(sub("bea", "actions", "ana"), act(1)));
  await no("jugada enorme", setDoc(sub("ana", "actions", "ana"), act(1, "x".repeat(3000))));
  await no("campos de más", setDoc(sub("ana", "actions", "ana"), { ...act(1), extra: 1 }));
  await no("jugar con la sala en vestíbulo", (async () => { await seed(); return setDoc(sub("bea", "actions", "bea"), act(1)); })());
  await seed(playing);
  await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "rooms", CODE, "actions", "bea"), { seq: 1, json: "{\"type\":\"pass\"}", at: Timestamp.now() }));
  await ok("el anfitrión lee todas las jugadas", getDocs(collection(db("ana"), "rooms", CODE, "actions")));
  await no("un jugador no lista las jugadas", getDocs(collection(db("bea"), "rooms", CODE, "actions")));
  await ok("quien juega lee la suya", getDoc(sub("bea", "actions", "bea")));
  await no("no se lee la jugada ajena", (async () => { await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), "rooms", CODE, "actions", "ana"), { seq: 1, json: "{}", at: Timestamp.now() })); return getDoc(sub("bea", "actions", "ana")); })());

  // --- Vistas privadas y estado secreto -------------------------------------------------
  const view = (extra = {}) => ({ rev: 1, json: "{\"myHand\":[]}", ack: 0, error: null, at: serverTimestamp(), ...extra });
  await seed(playing);
  await ok("el anfitrión escribe la vista de otra persona", setDoc(sub("ana", "views", "bea"), view()));
  await ok("con un error de la jugada", setDoc(sub("ana", "views", "bea"), view({ error: { seq: 2, message: "No es tu turno." } })));
  await no("un jugador no escribe vistas", setDoc(sub("bea", "views", "bea"), view()));
  await no("el anfitrión no escribe campos de más", setDoc(sub("ana", "views", "bea"), view({ cartas: [1] })));
  await no("vista fechada a mano", setDoc(sub("ana", "views", "bea"), view({ at: Timestamp.fromMillis(0) })));
  await no("vista de alguien que no está", setDoc(sub("ana", "views", "cris"), view()));
  await ok("cada persona lee su vista", getDoc(sub("bea", "views", "bea")));
  await no("pero no la ajena", getDoc(sub("bea", "views", "ana")));
  await ok("el anfitrión sí puede", getDoc(sub("ana", "views", "bea")));
  await no("un extraño no lee vistas", getDoc(sub("cris", "views", "bea")));
  await no("nadie lista las vistas", getDocs(collection(db("ana"), "rooms", CODE, "views")));

  const secret = { rev: 1, json: "{\"deck\":[]}", acks: { bea: 2 }, at: serverTimestamp() };
  await ok("el anfitrión guarda el estado", setDoc(sub("ana", "secret", "state"), secret));
  await ok("y lo lee", getDoc(sub("ana", "secret", "state")));
  await no("un jugador no lee el estado completo", getDoc(sub("bea", "secret", "state")));
  await no("ni lo escribe", setDoc(sub("bea", "secret", "state"), secret));
  await no("otro documento secreto", setDoc(sub("ana", "secret", "otro"), secret));
  await no("nadie lista los secretos", getDocs(collection(db("ana"), "rooms", CODE, "secret")));

  // --- Relevo de anfitrión --------------------------------------------------------------
  const claim = (uid, data = playing) => updateDoc(room(uid), bump(data, { hostUid: uid }));
  const beat = (uid, ageMs, visible = true) => (firestore) => setDoc(doc(firestore, "rooms", CODE, "presence", uid), { seenAt: Timestamp.fromMillis(Date.now() - ageMs), visible });
  await seed(playing, beat("ana", 5000));
  await no("relevo con el anfitrión activo", claim("bea"));
  await seed(playing, beat("ana", 100000));
  await no("relevo de un extraño", claim("cris"));
  await no("relevo con cambios de más", updateDoc(room("bea"), bump(playing, { hostUid: "bea", status: "ended" })));
  await no("un invitado no hereda la mesa aunque falte el anfitrión", claim("bea"));
  await seed(playing, beat("ana", 20000, false));
  await no("un invitado no hereda la mesa en segundo plano", claim("bea"));
  await seed(playing, beat("ana", 20000, true));
  await no("el mismo tiempo con la pantalla visible no basta", claim("bea"));
  await seed(baseRoom({ status: "playing", updatedAt: Timestamp.fromMillis(Date.now() - 200000) }));
  await no("sin latido tampoco se hereda la mesa", claim("bea", baseRoom({ status: "playing" })));
  await seed(baseRoom({ status: "ended" }), beat("ana", 200000));
  await no("no hay relevo en una sala cerrada", claim("bea", baseRoom({ status: "ended" })));
  // Ni siquiera una cuenta activada que entra como invitada hereda esta sala.
  await seed(playing, beat("ana", 100000));
  await env.withSecurityRulesDisabled(ctx => setDoc(doc(ctx.firestore(), 'hostAccess', 'bea'), {status:'active'}));
  await no("anfitrión invitado no toma otra sala", claim("bea"));

  // Tras cerrar, ninguna mano ni jugada sigue accesible.
  await seed(playing);
  await ok('guardar una vista antes del cierre', setDoc(sub('ana','views','bea'), view()));
  await ok('cerrar la mesa', updateDoc(room('ana'), bump(playing, {status:'ended'})));
  await no('el invitado no lee su mano después del cierre', getDoc(sub('bea','views','bea')));
  await no('el anfitrión no escribe nuevas vistas tras cerrar', setDoc(sub('ana','views','bea'), view()));
  await no('el invitado no juega tras cerrar', setDoc(sub('bea','actions','bea'), {seq:1,json:'{}',at:serverTimestamp()}));
  await seed(baseRoom({status:'playing',createdAt:Timestamp.fromMillis(Date.now()-7*60*60*1000)}));
  await no('la sala caduca sin cron ni TTL de pago', getDoc(sub('bea','views','bea')));

  // --- Lo demás está cerrado --------------------------------------------------------------
  await no("colecciones sin regla", setDoc(doc(db("ana"), "otra", "cosa"), { a: 1 }));
  console.log(`Reglas de salas online (${checks} comprobaciones): OK`);
} finally { await env.cleanup(); }
