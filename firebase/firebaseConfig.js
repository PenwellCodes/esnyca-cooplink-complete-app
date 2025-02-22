import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyAysfDMh1OqK_jHrgfYi03MSnQlB6GLa84",
  authDomain: "app-esnyca.firebaseapp.com",
  projectId: "app-esnyca",
  storageBucket: "app-esnyca.appspot.com",
  messagingSenderId: "441116098322",
  appId: "1:441116098322:web:2184cc66037a1766d87dcb",
  measurementId: "G-VXTDWFLRLE",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
let auth;
if (!getApps().length || !auth) {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

// Optionally initialize Firestore with long polling if needed
const firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Alternatively, get a Firestore instance
const db = getFirestore(app);

// Initialize Firebase Storage
const storage = getStorage(app);

export { auth, db, storage, firestore };
