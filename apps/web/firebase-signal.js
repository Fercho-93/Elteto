import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import {
  getDatabase, ref, get, set, remove, onValue, onDisconnect, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

let connectionPromise;

async function connectFirebase() {
  if (connectionPromise) return connectionPromise;
  connectionPromise = (async () => {
    const required = ["apiKey", "authDomain", "databaseURL", "projectId", "appId"];
    if (required.some((key) => !firebaseConfig[key])) {
      throw new Error("Falta enlazar el proyecto Firebase de Elteto. La conexión de sala aún no está configurada.");
    }
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const credential = auth.currentUser ? { user: auth.currentUser } : await signInAnonymously(auth);
    return { db: getDatabase(app), uid: credential.user.uid };
  })().catch((error) => {
    connectionPromise = null;
    if (error?.code === "auth/operation-not-allowed") {
      throw new Error("Activa el inicio de sesión anónimo en Firebase Authentication.");
    }
    if (error?.code?.startsWith("database/")) {
      throw new Error("Firebase rechazó la sala. Revisa las reglas de Realtime Database.");
    }
    throw error;
  });
  return connectionPromise;
}

const path = (roomId, suffix = "") => `rooms/${roomId}${suffix ? `/${suffix}` : ""}`;

export async function createSignalRoom({ gameId, roomName, hostName }, onRequests) {
  const { db, uid } = await connectFirebase();
  const roomId = crypto.randomUUID().replaceAll("-", "");
  const roomRef = ref(db, path(roomId));
  await set(ref(db, path(roomId, "meta")), {
    ownerUid: uid, gameId, roomName, hostName, createdAt: serverTimestamp(),
  });
  await onDisconnect(roomRef).remove();
  const stopRequests = onValue(ref(db, path(roomId, "requests")), (snapshot) => {
    onRequests(snapshot.val() || {});
  });
  const invite = new URL(location.pathname, location.origin);
  invite.searchParams.set("join", roomId);

  return {
    roomId,
    inviteUrl: invite.toString(),
    async publishOffer(guestUid, offerCode) {
      await set(ref(db, path(roomId, `requests/${guestUid}/offer`)), offerCode);
    },
    watchAnswer(guestUid, callback) {
      return onValue(ref(db, path(roomId, `requests/${guestUid}/answer`)), (snapshot) => {
        callback(snapshot.val());
      });
    },
    async removeGuest(guestUid) {
      await remove(ref(db, path(roomId, `requests/${guestUid}`)));
    },
    async close() {
      stopRequests();
      await remove(roomRef);
    },
  };
}

export async function requestRoomJoin(roomId, playerName) {
  const { db, uid } = await connectFirebase();
  const metaSnapshot = await get(ref(db, path(roomId, "meta")));
  if (!metaSnapshot.exists()) throw new Error("No encuentro esa sala. Pide al anfitrión un QR nuevo.");
  const requestRef = ref(db, path(roomId, `requests/${uid}`));
  await set(ref(db, path(roomId, `requests/${uid}/join`)), {
    name: playerName,
    createdAt: serverTimestamp(),
  });
  return {
    uid,
    meta: metaSnapshot.val(),
    watchOffer(callback) {
      return onValue(ref(db, path(roomId, `requests/${uid}/offer`)), (snapshot) => {
        callback(snapshot.val());
      });
    },
    async publishAnswer(answerCode) {
      await set(ref(db, path(roomId, `requests/${uid}/answer`), answerCode));
    },
    async leave() {
      await remove(requestRef);
    },
  };
}
