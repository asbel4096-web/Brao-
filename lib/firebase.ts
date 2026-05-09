import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (
  process.env.NODE_ENV !== "production" &&
  typeof window !== "undefined" &&
  (!firebaseConfig.apiKey ||
    !firebaseConfig.authDomain ||
    !firebaseConfig.projectId ||
    !firebaseConfig.storageBucket)
) {
  console.warn(
    "[Firebase] بعض متغيرات NEXT_PUBLIC_FIREBASE_* غير مضبوطة. تأكد من إعداد env بشكل صحيح."
  );
}

const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth: Auth = getAuth(app);

if (typeof window !== "undefined") {
  auth.useDeviceLanguage();
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// ============================================================================
// نظام الأدمن
// ============================================================================
//
// مصدر الحقيقة الوحيد للأدمن في كل مكان (واجهة + قواعد):
//   users/{uid}.isAdmin === true
//
// قائمة الإيميلات أدناه تُستخدم فقط لـ bootstrap أول أدمن:
//   عند تسجيل دخول مستخدم لأول مرة وكان إيميله في القائمة،
//   يُكتب isAdmin: true تلقائياً في وثيقة المستخدم في AuthContext.
//
// بعد ذلك، تغيير الإيميلات في env لن يؤثر على الأدمن الحاليين.
// إدارة الأدمن (منح/سحب) تتم من صفحة /admin/users بكتابة الحقل مباشرة.
// ============================================================================

/** قائمة إيميلات الأدمن لـ bootstrap أوّل أدمن. لا تُستخدم لتقييم الصلاحيات. */
export const BOOTSTRAP_ADMIN_EMAILS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS || ""
)
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

/**
 * يفحص ما إذا كان الإيميل في قائمة bootstrap.
 * **لا تستخدم هذه الدالة لتقييم صلاحيات الأدمن!**
 * استخدم `useAuth().isAdmin` أو حقل `users/{uid}.isAdmin` بدلاً منها.
 */
export const isBootstrapAdminEmail = (email?: string | null): boolean => {
  if (!email) return false;
  return BOOTSTRAP_ADMIN_EMAILS.includes(email.toLowerCase());
};

/**
 * @deprecated استخدم `useAuth().isAdmin` أو احفظ `isAdmin: true` في وثيقة المستخدم.
 * تُحفظ هذه الدالة لتجنّب كسر أي كود قديم لكن لا تقيّم صلاحيات.
 */
export const isAdminEmail = isBootstrapAdminEmail;

export default app;
