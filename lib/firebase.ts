import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import config from "../firebase-applet-config.json";

const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || config.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || config.appId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || config.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || config.authDomain,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || config.storageBucket,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId,
  measurementId: config.measurementId,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
