import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { initializeAuth, GoogleAuthProvider, browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence, inMemoryPersistence } from 'firebase/auth';

// Firebase configuration for English-Quest project
const firebaseConfig = {
    apiKey: "AIzaSyAfeRxb_HVaLU8UuJ20xgmGfxWWqMCKVvg",
    authDomain: "english-quest-95028.firebaseapp.com",
    projectId: "english-quest-95028",
    storageBucket: "english-quest-95028.firebasestorage.app",
    messagingSenderId: "657463040693",
    appId: "1:657463040693:web:3877c39a4621bf5bd57cfc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Do not load a cross-site redirect iframe just to display the login screen.
// Preserve existing sessions, with fallbacks when a browser blocks a storage API.
const auth = initializeAuth(app, {
    persistence: [browserLocalPersistence, indexedDBLocalPersistence, browserSessionPersistence, inMemoryPersistence]
});
const googleProvider = new GoogleAuthProvider();

// Always let the player choose a Google account after signing out.
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { app, db, auth, googleProvider };
