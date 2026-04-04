import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAbXmfnxYZRDDGhiN1QXruL1_LRd1NwX1g",
  authDomain: "bratcho-platform.firebaseapp.com",
  projectId: "bratcho-platform",
  storageBucket: "bratcho-platform.firebasestorage.app",
  messagingSenderId: "469444325981",
  appId: "1:469444325981:web:6fa8fc0af0ba9913d893b4"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

export const db = getFirestore(app);
export const storage = getStorage(app);
