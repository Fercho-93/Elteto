// build-web empaqueta el SDK localmente para que también esté disponible offline.
export { initializeApp, getApps, getApp } from 'firebase/app';
export { getAuth, signInAnonymously, connectAuthEmulator, EmailAuthProvider,
  linkWithCredential, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
export { getFirestore, initializeFirestore, connectFirestoreEmulator, collection,
  deleteDoc, doc, getDoc, getDocFromServer, onSnapshot, runTransaction,
  serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
