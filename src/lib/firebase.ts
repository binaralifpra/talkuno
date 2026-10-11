import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAOoAMJTQnMuYMzrYV-Ob2hCLDQ6DYUABw",
  authDomain: "talkuno-2be65.firebaseapp.com",
  projectId: "talkuno-2be65",
  storageBucket: "talkuno-2be65.firebasestorage.app",
  messagingSenderId: "286731161917",
  appId: "1:286731161917:web:ed91c4928402d2fbccb554",
};

// Prevent duplicate app initialization in Next.js (dev HMR)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
