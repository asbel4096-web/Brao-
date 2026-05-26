import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import {
  getMessaging,
  isSupported as isMessagingSupported,
  type Messaging,
} from "firebase/messaging";

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
// Firebase Cloud Messaging (FCM) - استدعاء كسول
// ============================================================================
//
// لماذا lazy؟
//  - getMessaging() يفشل في environments لا تدعمه (SSR، iPhone Safari قبل
//    iOS 16.4، browsers قديمة). نُفرز ذلك في isPushSupported().
//  - تحميل الـmodule فقط عند الحاجة - لا يثقل bundle الصفحات التي لا تستخدم.
//
// الـVAPID public key يُولَّد مرة واحدة من Firebase Console:
//   Project Settings → Cloud Messaging → Web configuration → Generate key pair
// يُضاف للـenv كـ NEXT_PUBLIC_FIREBASE_VAPID_KEY.
// هذا المفتاح OK تعريضه - عام.
//
// الـmessaging ref نحفظه في module-level cache حتى لا نُنشئه مرتين.
// ============================================================================

export const FCM_VAPID_KEY =
  process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || "";

let _messaging: Messaging | null = null;
let _messagingChecked = false;

/**
 * يُرجِع instance الـmessaging إن كان الـbrowser يدعمها، وإلا null.
 * استدعاء آمن من SSR (يُرجِع null دائماً على server).
 *
 * النتيجة تُكتشف مرة واحدة وتُحفظ - استدعاءات لاحقة سريعة.
 */
export async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  if (_messagingChecked) return _messaging;

  _messagingChecked = true;
  try {
    const supported = await isMessagingSupported();
    if (!supported) {
      _messaging = null;
      return null;
    }
    _messaging = getMessaging(app);
    return _messaging;
  } catch {
    _messaging = null;
    return null;
  }
}

/**
 * فحص سريع: هل المتصفح الحالي يدعم Web Push؟
 * مفيد لإخفاء/عرض البانر دون محاولة getToken الفعلية.
 *
 * Note: iOS Safari يدعم Push فقط بعد "Add to Home Screen" (iOS 16.4+).
 * الفحص هنا يتحقّق من توفر `serviceWorker` + `PushManager` + `Notification`.
 */
export function isPushSupportedSync(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * فحص iOS Safari (لتعرّف المستخدمين الذين يحتاجون "Add to Home Screen").
 * يُرجِع true فقط على iPhone/iPad Safari خارج PWA mode.
 */
export function isIosSafariNeedsPwa(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua);
  if (!isIos) return false;

  // إذا التطبيق مُثبَّت كـPWA: display-mode standalone أو navigator.standalone.
  const isStandalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    // @ts-ignore - non-standard iOS property
    (window.navigator as any).standalone === true;

  // داخل PWA → push مدعوم (على iOS 16.4+). نُرجع false لإخفاء بانر "ثبّت".
  return !isStandalone;
}

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
