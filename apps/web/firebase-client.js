import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
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

export function connectFirebase() {
  if (connection) return connection;
  connection = (async () => {
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
    const credential = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
    return { app, auth, db, uid: credential.user.uid };
  })().catch((error) => {
    connection = null;
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Activa el inicio de sesión anónimo en Firebase Authentication.");
    }
    throw error;
  });
  return connection;
}
