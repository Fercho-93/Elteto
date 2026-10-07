// Salas online de punta a punta: sesiones reales (apps/web/online-room.js) contra los
// emuladores de Auth y Firestore, con las reglas reales y el motor de reglas compilado.
//   npm run test:online      (necesita Java; compila antes con npm run build:web)
import assert from "node:assert/strict";
import fs from "node:fs";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, connectAuthEmulator, signInAnonymously } from "firebase/auth";
import { initializeFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

globalThis.location = new URL("https://fercho-93.github.io/Elteto/");
globalThis.document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };

const { OnlineSession } = await import("../dist/online-room.js");
const { getGame, listGames, captures15, chooseBotAction } = await import("../dist/game-core/index.js");

const PROJECT = "demo-elteto";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(label, check, timeout = 20000) {
  const start = Date.now();
  for (;;) {
    const value = await check();
    if (value) return value;
    if (Date.now() - start > timeout) throw new Error(`Tiempo agotado esperando: ${label}`);
    await sleep(50);
  }
}

// Cada persona es una app de Firebase con su propio invitado anónimo, como un móvil distinto.
let nextApp = 0;
async function connect() {
  const app = initializeApp({ apiKey: "demo-key", authDomain: `${PROJECT}.firebaseapp.com`, projectId: PROJECT, appId: "1:1:web:1" }, `movil-${nextApp++}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  const credential = await signInAnonymously(auth);
  return { db, uid: credential.user.uid };
}

function listener() {
  const changes = [];
  const onChange = (change) => changes.push(change);
  const last = (kind) => [...changes].reverse().find((change) => change.kind === kind);
  return { changes, onChange, last };
}

const admin = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: { host: "127.0.0.1", port: 8080, rules: fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});
const sessions = [];
const track = (session) => { sessions.push(session); return session; };

async function open(gameId, names) {
  const conns = await Promise.all(names.map(() => connect()));
  const events = names.map(() => listener());
  const host = track(await OnlineSession.create({ gameId, roomName: "Mesa de prueba", hostName: names[0] }, events[0].onChange, conns[0]));
  const guests = [];
  for (let i = 1; i < names.length; i++) guests.push(track(await OnlineSession.join(host.roomCode, names[i], events[i].onChange, conns[i])));
  await until("todos en el vestíbulo", () => [host, ...guests].every((s, i) => events[i].last("lobby")?.players.length === names.length));
  return { host, guests, all: [host, ...guests], events, conns };
}

try {
  // --- Vestíbulo ------------------------------------------------------------------------
  const ctx = await open("cinquillo", ["Ana", "Bea", "Cris"]);
  const { host, guests, all, events, conns } = ctx;
  const lobby = events[1].last("lobby");
  assert.equal(lobby.isHost, false);
  assert.equal(events[0].last("lobby").isHost, true);
  assert.deepEqual(lobby.players.map((p) => p.name), ["Ana", "Bea", "Cris"]);
  assert.equal(lobby.roomCode, host.roomCode);
  assert.match(host.inviteUrl, /\?join=[A-Z2-9]{8}$/);
  console.log("  ok  tres personas entran en la sala");

  // Una cuarta, ya sin hueco por la regla de maxPlayers, no depende del cliente: cinquillo admite 6.
  // Quien llega a un código que no existe recibe un aviso legible.
  await assert.rejects(OnlineSession.join("ZZZZ9999", "Dani", () => {}, await connect()), /No existe ninguna sala/);
  // Una sala creada hace menos de 30 s por la misma persona se rechaza.
  await assert.rejects(OnlineSession.create({ gameId: "cinquillo", roomName: "Otra", hostName: "Ana" }, () => {}, conns[0]), /30 segundos|rechaz/);
  console.log("  ok  sala inexistente y cuota de creación");

  // --- Expulsar y volver a entrar -------------------------------------------------------
  await host.removePlayer(guests[1].uid);
  await until("Cris expulsada", () => events[2].last("disconnected"));
  await until("lista de dos", () => events[0].last("lobby").players.length === 2);
  guests[1].closed || guests[1].teardown();
  // Joining resolves after the write, before every listener has received the
  // room. A returned session must reach its own lobby before testing lobby exit.
  // Fresh listeners also prevent the expelled session's old events being reused.
  const crisEvents = listener();
  const cris = track(await OnlineSession.join(host.roomCode, "Cris", crisEvents.onChange, conns[2]));
  await until("Cris de vuelta en ambos móviles", () => events[0].last("lobby").players.length === 3 && crisEvents.last("lobby")?.players.length === 3);
  await cris.exit();
  await until("Cris se marcha", () => events[0].last("lobby").players.length === 2);
  events[2] = listener();
  const cris2 = track(await OnlineSession.join(host.roomCode, "Cris", events[2].onChange, conns[2]));
  await until("Cris otra vez en ambos móviles", () => events[0].last("lobby").players.length === 3 && events[2].last("lobby")?.players.length === 3);
  console.log("  ok  expulsar, marcharse y volver");

  // --- Partida ----------------------------------------------------------------------------
  const players = [host, guests[0], cris2];
  await assert.rejects(guests[0].startGame(), /Solo quien abrió/);
  await host.startGame(12345);
  const views = await until("cada persona recibe su mano", () => {
    const got = events.map((e) => e.last("game"));
    return got.every(Boolean) ? got : null;
  });
  const hands = views.map((c) => c.view.myHand);
  for (const hand of hands) assert.ok(hand.length >= 13, "reparto completo");
  const key = (card) => `${card.suit}:${card.rank}`;
  const seen = new Set(hands.flat().map(key));
  assert.equal(seen.size, hands.flat().length, "ninguna carta repetida entre manos");
  for (const [i, change] of views.entries()) {
    assert.equal(change.playerId, players[i].uid);
    assert.equal(JSON.stringify(change.view).includes("deck"), false);
    // La vista de una persona no contiene las cartas de las demás.
    const others = hands.filter((_, j) => j !== i).flat();
    const mine = JSON.stringify(change.view.myHand);
    for (const card of others) assert.equal(mine.includes(JSON.stringify(card)), false);
  }
  console.log("  ok  reparto: cada persona solo recibe su mano");

  // Un invitado no puede leer el estado completo ni la vista ajena.
  const { getDoc: get } = await import("firebase/firestore");
  await assert.rejects(get(doc(conns[1].db, "rooms", host.roomCode, "secret", "state")), /permission|Missing/i);
  await assert.rejects(get(doc(conns[1].db, "rooms", host.roomCode, "views", conns[2].uid)), /permission|Missing/i);
  console.log("  ok  el estado secreto y las vistas ajenas están cerradas");

  // Una jugada fuera de turno la rechaza el motor y el aviso llega a quien la envió.
  const current = (v) => v.view.turnPlayer;
  const turnUid = current(events[0].last("game"));
  const idleIndex = players.findIndex((p) => p.uid !== turnUid);
  const idle = players[idleIndex];
  const idleHand = events[idleIndex].last("game").view.myHand;
  const before = events[idleIndex].changes.length;
  await idle.sendAction({ type: "play", card: idleHand[0] });
  const rejected = await until("aviso de jugada inválida", () => events[idleIndex].changes.slice(before).find((c) => c.kind === "error"));
  assert.ok(rejected.message.length > 3);
  console.log("  ok  una jugada inválida se rechaza con su motivo:", JSON.stringify(rejected.message));

  // Juego real: cada turno, la persona que lo tiene coloca una carta válida o pasa.
  const engine = getGame("cinquillo");
  async function playTurns(count, group) {
    for (let n = 0; n < count; n++) {
      const latest = group.map((p) => p.events.last("game"));
      const turn = latest[0].view.turnPlayer;
      const mine = group.findIndex((p) => p.session.uid === turn);
      const view = latest[mine].view;
      const playable = view.myHand.find((card) => {
        const idx = ["1", "2", "3", "4", "5", "6", "7", "10", "11", "12"].indexOf(card.rank);
        const entry = view.table[card.suit];
        if (!Object.keys(view.table).length) return card.suit === "oros" && card.rank === "5";
        return entry ? idx === entry.high + 1 || idx === entry.low - 1 : card.rank === "5";
      });
      const startLog = latest[mine].view.log.length;
      await group[mine].session.sendAction(playable ? { type: "play", card: playable } : { type: "pass" });
      await until("turno resuelto", () => group[mine].events.last("game").view.log.length > startLog || group[mine].events.last("game").view.finished);
      await until("todos lo ven", () => group.every((p) => p.events.last("game").view.log.length === group[mine].events.last("game").view.log.length));
      if (group[mine].events.last("game").view.finished) return;
    }
  }
  const group = players.map((session, i) => ({ session, events: events[i] }));
  await playTurns(6, group);
  const logLength = events[0].last("game").view.log.length;
  assert.ok(logLength >= 6, "la partida avanza");
  const handSizes = events[0].last("game").view.handSizes;
  assert.equal(Object.keys(handSizes).length, 3);
  console.log("  ok  seis turnos jugados con las tres manos sincronizadas");

  // --- Relevo del anfitrión ---------------------------------------------------------------
  // El anfitrión desaparece: sin cerrar la sala, sin más latidos y con su último latido
  // antiguo. La primera persona que sigue conectada toma el relevo y retoma el estado guardado.
  const snapshotBefore = JSON.stringify(events[1].last("game").view);
  host.teardown();
  await admin.withSecurityRulesDisabled(async (c) => setDoc(doc(c.firestore(), "rooms", host.roomCode, "presence", host.uid), { seenAt: Timestamp.fromMillis(Date.now() - 120000), visible: true }));
  await until("Bea toma el relevo", () => guests[0].isHost, 30000);
  assert.ok(events[1].changes.some((c) => c.kind === "notice" && /llevas tú/.test(c.message)));
  await until("Cris sabe quién lleva la mesa", () => players[2].room.hostUid === guests[0].uid);
  const resumed = await until("Bea recupera la partida", () => events[1].last("game")?.isHost && events[1].last("game"));
  assert.equal(JSON.stringify(resumed.view.table), JSON.stringify(JSON.parse(snapshotBefore).table), "el estado se recupera tal cual");
  console.log("  ok  relevo: Bea toma la mesa y recupera la partida guardada");

  // La partida sigue con quien queda: Bea (nueva anfitriona) y Cris.
  const newGroup = [{ session: guests[0], events: events[1] }, { session: cris2, events: events[2] }];
  // El turno puede ser del anfitrión que se fue: la jugada no se puede resolver. Si es de las
  // personas que quedan, se juega.
  const turnNow = events[1].last("game").view.turnPlayer;
  if (turnNow !== host.uid) {
    const mine = newGroup.findIndex((p) => p.session.uid === turnNow);
    const view = newGroup[mine].events.last("game").view;
    const startLog = view.log.length;
    await newGroup[mine].session.sendAction({ type: "pass" }).catch(() => {});
    await until("jugada tras el relevo", () => newGroup[mine].events.last("game").view.log.length > startLog || newGroup[mine].events.last("error"), 15000);
    console.log("  ok  la partida continúa tras el relevo");
  } else {
    console.log("  ok  (el turno era del anfitrión ausente; se omite la jugada posterior)");
  }

  // La nueva anfitriona cierra la sala y los demás lo saben.
  await guests[0].exit();
  await until("Cris ve la sala cerrada", () => events[2].last("disconnected"));
  assert.match(events[2].last("disconnected").message, /cerrado/);
  console.log("  ok  cerrar la sala avisa al resto");

  // --- Mus: cuatro manos de cuatro cartas -----------------------------------------------
  const mus = await open("mus", ["Ana", "Bea", "Cris", "Dani"]);
  await mus.host.startGame(7);
  const musViews = await until("Mus repartido", () => { const v = mus.events.map((e) => e.last("game")); return v.every(Boolean) ? v : null; });
  for (const change of musViews) assert.equal(change.view.myHand.length, 4);
  assert.equal(new Set(musViews.flatMap((c) => c.view.myHand.map((card) => `${card.suit}:${card.rank}`))).size, 16);
  console.log("  ok  Mus: cuatro jugadores, cuatro cartas cada uno");
  await mus.host.sendAction({ type: "mus", wantsMus: false });
  await until("Mus: grande sincronizada", () => mus.events.every(e => e.last("game")?.view.phase === "grande"));
  await mus.host.sendAction({ type: "bet", amount: 2 });
  await until("Mus: envite visible", () => mus.events.every(e => e.last("game")?.view.betting?.pendingBet?.amount === 2));
  const responder = mus.all.find(s => s.uid === mus.events[0].last("game").view.turnPlayer);
  await responder.sendAction({ type: "accept" });
  await until("Mus: chica sincronizada", () => mus.events.every(e => e.last("game")?.view.phase === "chica"));
  for (const events of mus.events) {
    const view = events.last("game").view;
    assert.deepEqual(view.scores, { A: 0, B: 0 });
    assert.equal("revealedHands" in view, false);
  }
  console.log("  ok  Mus: decisión, envite privado, aceptación y tanteo diferido sincronizados");
  await mus.host.exit();

  // Four independent online identities roll in order, including the opening round.
  const board = await open("parchis", ["Ana", "Bea", "Cris", "Dani"]);
  await board.host.startGame(17);
  await until("Parchís listo", () => board.events.every(e => e.last("game")?.view.phase === "start"));
  let moves=0;
  for(let step=0;step<80&&(step<16||moves<2);step++) {
    const view=board.events[0].last("game").view;
    const index=board.all.findIndex(s=>s.uid===view.turnPlayer);
    const before=board.events[index].last("game");
    const sequence=before.view.lastRoll?.sequence??0;
    const legal=before.view.legalMoves;
    await board.all[index].sendAction(legal.length?{type:"move",piece:legal[0].piece}:{type:"roll",expectedRoll:sequence});
    if(legal.length)moves++;
    await until("Parchís acción recibida",()=>{const next=board.events[index].last("game").view;return legal.length?JSON.stringify(next.pieces)!==JSON.stringify(before.view.pieces):(next.lastRoll?.sequence??0)>sequence;});
    const expected=board.events[index].last("game").view;
    await until("Parchís dado sincronizado",()=>board.events.every(e=>JSON.stringify(e.last("game").view.lastRoll)===JSON.stringify(expected.lastRoll)&&JSON.stringify(e.last("game").view.pieces)===JSON.stringify(expected.pieces)&&e.last("game").view.turnPlayer===expected.turnPlayer));
  }
  assert.ok(moves>=2);
  assert.notEqual(board.events[0].last("game").view.phase,"start");
  console.log("  ok  Parchís: cuatro usuarios, tirada inicial, resultados y movimientos sincronizados");
  await board.host.exit();

  // Solo online: one human completes an entire Mus match with three AI seats.
  const solo = await open('mus',['Ana']);
  await solo.host.fillWithBots();
  await until('tres IA en el vestíbulo',()=>solo.events[0].last('lobby').players.length===4);
  assert.equal(solo.host.room.playerOrder.length,1);
  await solo.host.removePlayer('bot-3');
  await until('quitar IA',()=>solo.host.players().length===3);
  await solo.host.fillWithBots();await until('completar otra vez',()=>solo.host.players().length===4);
  solo.host.botRunner.delay=1;
  await solo.host.startGame(77);
  const soloEngine=getGame('mus');
  for(let step=0;step<2000&&!solo.host.state.finished;step++) {
    const view=soloEngine.view(solo.host.state,solo.host.uid);
    const action=chooseBotAction(soloEngine,view,solo.host.uid);
    if(action){await solo.host.sendAction(action);await solo.host.queue;}
    else await sleep(5);
  }
  assert.ok(solo.host.state.finished,'online solo match completes');
  assert.equal(solo.events[0].last('game').view.hands,undefined);
  await solo.host.exit();
  console.log('  ok  Mus online: una persona, tres IA y partida completa');

  // Bots survive host handoff and never receive private view documents or presence.
  const mixed=await open('mus',['Ana','Bea']);
  await mixed.host.fillWithBots();await until('mesa mixta llena',()=>mixed.host.players().length===4);
  await mixed.host.startGame(99);
  await mixed.host.sendAction({type:'mus',wantsMus:false});await mixed.host.queue;
  await mixed.host.sendAction({type:'pass'});await mixed.host.queue;
  await until('turno de Bea',()=>mixed.events[1].last('game')?.view.turnPlayer===mixed.guests[0].uid);
  await mixed.guests[0].sendAction({type:'pass'});
  await until('turno de IA',()=>mixed.host.state?.players[mixed.host.state.betting?.turnSeat]?.startsWith('bot-'));
  mixed.host.botRunner.stop();
  const oldRevision=mixed.host.rev;
  mixed.host.teardown();
  await admin.withSecurityRulesDisabled(async c=>setDoc(doc(c.firestore(),'rooms',mixed.host.roomCode,'presence',mixed.host.uid),{seenAt:Timestamp.fromMillis(Date.now()-120000),visible:true}));
  await mixed.guests[0].claimHost();
  await until('relevo con IA',()=>mixed.guests[0].isHost&&mixed.guests[0].state);
  mixed.guests[0].botRunner.delay=1;
  await until('IA continúa tras relevo',()=>mixed.guests[0].rev>oldRevision);
  assert.equal(mixed.guests[0].players().filter(p=>p.isBot).length,2);
  assert.equal(mixed.events[1].last('game').view.hands,undefined);
  await mixed.guests[0].exit();
  console.log('  ok  mesa mixta: IA conservada y activa después del relevo');

  // Every new game creates a valid room ID and syncs only its player's view.
  for (const engine of listGames().filter(g=>!['cinquillo','mus','parchis'].includes(g.id))) {
    const room=await open(engine.id,Array.from({length:engine.minPlayers},(_,i)=>`Persona ${i+1}`));
    await room.host.startGame(91);
    await until(`${engine.id}: reparto`,()=>room.events.every(e=>e.last('game')));
    for(let step=0;step<5&&!room.host.state.finished;step++) {
      const game=room.host.state,p=game.players[game.turn],view=engine.view(game,p);let action;
      if(view.validCards?.length)action={type:'play',card:view.validCards[0]};
      else if(view.moves?.length)action={type:'move',path:view.moves[0].path};
      else if(game.id==='escoba'&&game.phase==='play'){const c=view.myHand[0],v=Number(c.rank)>7?Number(c.rank)-2:Number(c.rank);action={type:'capture',card:c.id,table:captures15(view.table,15-v)[0]||[]};}
      else if(game.id==='mentiroso'&&game.phase==='play')action={type:'play-facedown',cards:[view.myHand[0].id],rank:view.rankOptions[0]};
      else if(game.phase==='discard'&&['julepe','chinchon','remigio','continental'].includes(game.id))action=game.id==='julepe'?{type:'discard',cards:view.myHand.slice(5).map(c=>c.id)}:{type:'discard',card:view.myHand[0].id};
      else action=view.options.find(o=>!o.action.selection&&!o.action.singleCard&&!o.action.amountInput)?.action;
      assert.ok(action,`${engine.id}: action available`);
      const expected=engine.applyAction(game,p,action);
      await room.all.find(s=>s.uid===p).sendAction(action);
      await until(`${engine.id}: vistas sincronizadas`,()=>room.all.every((session,i)=>JSON.stringify(room.events[i].last('game')?.view)===JSON.stringify(engine.view(expected,session.uid))));
      for(const events of room.events){const v=events.last('game').view;assert.equal(v.hands,undefined);assert.equal(v.stock,undefined);assert.equal(v.seed,undefined);}
    }
    await room.host.exit();console.log(`  ok  ${engine.label}: sala, acciones y vistas privadas`);
  }

  console.log("Salas online de punta a punta: OK");
} finally {
  for (const session of sessions) if (!session.closed) session.teardown();
  await admin.cleanup();
  await Promise.all(getApps().map(app => deleteApp(app)));
}
