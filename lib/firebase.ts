import { getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDsZF0lFIBHFbZEs0W456Mvvmng-JrvtBE",
  authDomain: "bratsho-car.firebaseapp.com",
  projectId: "bratsho-car",
  storageBucket: "bratsho-car.firebasestorage.app",
  messagingSenderId: "320104607081",
  appId: "1:320104607081:web:1f25ac69df065c4d7921f8"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
export const db = getFirestore(app);
export const storage = getStorage(app);
