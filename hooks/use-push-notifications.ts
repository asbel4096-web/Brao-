"use client";

import { useCallback, useEffect, useState } from "react";
import {
  doc,
  serverTimestamp,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { getToken, onMessage } from "firebase/messaging";
import {
  db,
  FCM_VAPID_KEY,
  getMessagingIfSupported,
  isPushSupportedSync,
  isIosSafariNeedsPwa,
} from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * يُسجّل service worker الخاص بـFCM، ممرّراً Firebase config عبر query
 * params (لأن الـSW لا يقرأ env vars). يُعيد الـregistration.
 *
 * كل القيم NEXT_PUBLIC_* (عامة، آمنة في URL). نبنيها مرة ونعيد استخدامها.
 */
async function registerFcmServiceWorker(): Promise<ServiceWorkerRegistration> {
  const cfg = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId:
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  };
  const qs = new URLSearchParams(cfg).toString();
  // الـscope "/" حتى يلتقط الـSW كل التنقّلات. نُمرّر config في الـquery.
  return navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${qs}`,
    { scope: "/" }
  );
}

/**
 * Hook لإدارة Web Push Notifications.
 *
 * الحالات الممكنة:
 *  - "unsupported":       المتصفح لا يدعم Push (iOS Safari قبل PWA، إلخ)
 *  - "needs-pwa":         iPhone Safari خارج PWA - نعرض بانر تثبيت
 *  - "default":           لم يُطلب الإذن بعد
 *  - "granted":           الإذن ممنوح + token مسجَّل
 *  - "denied":            رفض المستخدم - لا يمكن طلبه ثانية برمجياً
 *  - "loading":           فحص أو طلب جارٍ
 *  - "error":             خطأ تقني (VAPID key مفقود، SW registration فشل)
 *
 * المخرجات:
 *  - status: الحالة الحالية
 *  - requestPermission(): يطلب الإذن + يسجّل token
 *  - disable(): يحذف الـtoken من Firestore (إيقاف الإشعارات)
 *  - foregroundMessage: آخر إشعار وصل في foreground (لـtoast مخصّص)
 */

export type PushStatus =
  | "loading"
  | "unsupported"
  | "needs-pwa"
  | "default"
  | "granted"
  | "denied"
  | "error";

export interface ForegroundMessage {
  title: string;
  body: string;
  link?: string;
  receivedAt: number;
}

const TOKEN_STORAGE_KEY = "bratsho:fcm-token";

export function usePushNotifications() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [status, setStatus] = useState<PushStatus>("loading");
  const [foregroundMessage, setForegroundMessage] =
    useState<ForegroundMessage | null>(null);

  // ============================================================
  // فحص أولي للحالة (يعمل على كل mount وعند تغيير الـuid)
  // ============================================================
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // SSR safety
      if (typeof window === "undefined") return;

      // فحص دعم المتصفح
      if (!isPushSupportedSync()) {
        // قد يكون iPhone Safari - نُميّز
        if (isIosSafariNeedsPwa()) {
          if (!cancelled) setStatus("needs-pwa");
        } else {
          if (!cancelled) setStatus("unsupported");
        }
        return;
      }

      // فحص VAPID key
      if (!FCM_VAPID_KEY) {
        if (!cancelled) setStatus("error");
        // eslint-disable-next-line no-console
        console.warn(
          "[push] NEXT_PUBLIC_FIREBASE_VAPID_KEY غير مضبوط - الإشعارات معطّلة."
        );
        return;
      }

      // فحص حالة الإذن
      const perm = Notification.permission;
      if (perm === "denied") {
        if (!cancelled) setStatus("denied");
        return;
      }
      if (perm === "default") {
        if (!cancelled) setStatus("default");
        return;
      }

      // الإذن ممنوح - نتأكد من تسجيل token (لو المستخدم مسجَّل دخول)
      if (!uid) {
        // ممنوح لكن لا login - الـtoken سيُسجَّل عند login
        if (!cancelled) setStatus("granted");
        return;
      }

      try {
        const messaging = await getMessagingIfSupported();
        if (!messaging) {
          if (!cancelled) setStatus("unsupported");
          return;
        }

        // نُسجّل service worker بشكل صريح (Firebase SDK يفعلها أحياناً لكن
        // التحكم اليدوي يجنّبنا race conditions على Safari).
        const swReg = await registerFcmServiceWorker();

        const token = await getToken(messaging, {
          vapidKey: FCM_VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (token) {
          await saveTokenToFirestore(uid, token);
          if (!cancelled) setStatus("granted");
        } else {
          // الـbrowser منح الإذن لكن لم يُصدر token - نادر.
          if (!cancelled) setStatus("default");
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[push] init failed:", err);
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uid]);

  // ============================================================
  // الاستماع لإشعارات foreground
  // ============================================================
  useEffect(() => {
    if (status !== "granted") return;
    let unsub: (() => void) | undefined;

    (async () => {
      const messaging = await getMessagingIfSupported();
      if (!messaging) return;

      unsub = onMessage(messaging, (payload) => {
        const title =
          payload.notification?.title || payload.data?.title || "براتشو كار";
        const body =
          payload.notification?.body ||
          payload.data?.body ||
          "لديك إشعار جديد";
        const link = (payload.fcmOptions as any)?.link || payload.data?.link;

        setForegroundMessage({
          title,
          body,
          link,
          receivedAt: Date.now(),
        });
      });
    })();

    return () => {
      if (unsub) unsub();
    };
  }, [status]);

  // ============================================================
  // طلب الإذن + تسجيل token
  // ============================================================
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;
    if (!isPushSupportedSync()) {
      setStatus(isIosSafariNeedsPwa() ? "needs-pwa" : "unsupported");
      return false;
    }
    if (!FCM_VAPID_KEY) {
      setStatus("error");
      return false;
    }
    if (!uid) {
      // eslint-disable-next-line no-console
      console.warn("[push] requestPermission called without user");
      return false;
    }

    setStatus("loading");

    try {
      const perm = await Notification.requestPermission();
      if (perm === "denied") {
        setStatus("denied");
        return false;
      }
      if (perm !== "granted") {
        setStatus("default");
        return false;
      }

      const messaging = await getMessagingIfSupported();
      if (!messaging) {
        setStatus("unsupported");
        return false;
      }

      const swReg = await registerFcmServiceWorker();

      const token = await getToken(messaging, {
        vapidKey: FCM_VAPID_KEY,
        serviceWorkerRegistration: swReg,
      });

      if (!token) {
        setStatus("default");
        return false;
      }

      await saveTokenToFirestore(uid, token);
      setStatus("granted");
      return true;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[push] requestPermission failed:", err);
      setStatus("error");
      return false;
    }
  }, [uid]);

  // ============================================================
  // إيقاف الإشعارات (حذف الـtoken)
  // ============================================================
  const disable = useCallback(async (): Promise<void> => {
    if (!uid) return;
    const cached = readCachedToken();
    if (!cached) {
      setStatus("default");
      return;
    }
    try {
      await deleteDoc(doc(db, "users", uid, "fcmTokens", cached));
      clearCachedToken();
      setStatus("default");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[push] disable failed:", err);
    }
  }, [uid]);

  return {
    status,
    requestPermission,
    disable,
    foregroundMessage,
    /** يدوياً يمسح آخر foreground msg (للـtoast بعد الإغلاق). */
    clearForegroundMessage: () => setForegroundMessage(null),
  };
}

// ============================================================
// مساعدات داخلية
// ============================================================

/**
 * يحفظ الـtoken في users/{uid}/fcmTokens/{token}.
 * المعرّف = نفس الـtoken (مفيد للـdedupe وإزالة tokens منتهية).
 * يحفظ نسخة في localStorage للوصول السريع عند الـdisable.
 */
async function saveTokenToFirestore(uid: string, token: string) {
  // الـid يجب أن يكون قصيراً وآمناً لـpath - نأخذ hash بسيط للـtoken لأنه
  // طويل جداً (~150 char) ويحوي أحرفاً ممكن تكسر path. نستخدم آخر 40 char
  // كـid (الـuniqueness عالية جداً).
  const tokenId = token.length > 60 ? token.slice(-40) : token;

  await setDoc(
    doc(db, "users", uid, "fcmTokens", tokenId),
    {
      token, // الـtoken الكامل للإرسال من الـserver
      tokenId,
      platform: detectPlatform(),
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "",
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    },
    { merge: true }
  );

  cacheToken(tokenId);
}

function detectPlatform(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Win/i.test(ua)) return "windows";
  if (/Mac/i.test(ua)) return "mac";
  if (/Linux/i.test(ua)) return "linux";
  return "web";
}

function cacheToken(tokenId: string) {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, tokenId);
    }
  } catch {
    /* localStorage قد يكون معطّلاً - ignore */
  }
}

function readCachedToken(): string | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function clearCachedToken() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}
