import { getApps, initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// TEMP DEBUG — احذفه بعد التحقق
if (typeof window !== "undefined") {
  console.log("[Firebase Debug] projectId:", firebaseConfig.projectId);
  console.log("[Firebase Debug] authDomain:", firebaseConfig.authDomain);
  console.log(
    "[Firebase Debug] apiKey(first 10):",
    firebaseConfig.apiKey?.slice(0, 10)
  );
}

if (typeof window !== "undefined" && !firebaseConfig.apiKey) {
  console.error(
    "[Firebase] متغيرات NEXT_PUBLIC_FIREBASE_* غير مضبوطة. انسخ .env.example إلى .env.local."
  );
}

const app: FirebaseApp = getApps().length
  ? getApps()[0]!
  : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

if (typeof window !== "undefined") {
  auth.useDeviceLanguage();
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// قائمة بريد المشرفين (للـ UI gating). الحماية الفعلية في firestore.rules
export const ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS || ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const isAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

export default app;
