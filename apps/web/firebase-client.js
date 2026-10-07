import { initializeApp, getApps, getApp, getAuth, signInAnonymously, connectAuthEmulator,
  getFirestore, initializeFirestore, connectFirestoreEmulator } from './firebase-sdk.js';
import { firebaseConfig } from "./firebase-config.js";

// Una sola conexión por pestaña. Los invitados son anónimos: Firebase conserva el UID en el
// navegador, así que volver a abrir Elteto reutiliza la misma identidad.
let connection;

// En la app instalada de iOS el canal de streaming de Firestore puede quedarse colgado sin
// fallar y toda lectura espera para siempre. Con la detección automática, si el canal no
// responde se pasa a long-polling.
function openDb(app) {
  try { return initializeFirestore(app, { experimentalAutoDetectLongPolling: true }); }
  catch { return getFirestore(app); }
}

export async function connectFirebase() {
  connection ||= (async () => {
    const required = ["apiKey", "authDomain", "projectId", "appId"];
    if (required.some((key) => !firebaseConfig[key])) {
      throw new Error("Falta enlazar el proyecto Firebase de Elteto. Las salas con internet aún no están configuradas.");
    }
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = openDb(app);
    // Solo las pruebas contra los emuladores definen esta variable (tests/online-sala.mjs).
    const emulator = globalThis.__ELTETO_FIREBASE_EMULATOR;
    if (emulator && !globalThis.__eltetoEmulatorConnected) {
      globalThis.__eltetoEmulatorConnected = true;
      connectAuthEmulator(auth, emulator.auth, { disableWarnings: true });
      connectFirestoreEmulator(db, emulator.firestoreHost, emulator.firestorePort);
    }
    auth.languageCode = "es";
    await auth.authStateReady();
    return { app, auth, db };
  })().catch((error) => {
    connection = null;
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Activa el inicio de sesión anónimo en Firebase Authentication.");
    }
    throw error;
  });
  const result = await connection;
  const user = result.auth.currentUser || (await signInAnonymously(result.auth)).user;
  return { ...result, uid: user.uid };
}
