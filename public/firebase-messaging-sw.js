/* eslint-disable no-undef */
/**
 * Service Worker لاستقبال إشعارات Firebase Cloud Messaging في الـbackground.
 *
 * متى يُشغَّل؟
 *  - عندما يكون التطبيق مغلقاً أو الـtab غير نشط، ويصل push.
 *  - الـbrowser يُشغّل هذا الـSW تلقائياً ويسلّمه payload.
 *
 * متى لا يُشغَّل؟
 *  - عندما يكون التطبيق مفتوحاً ونشطاً - في هذه الحالة `onMessage`
 *    في كود الـclient (use-push-notifications.ts) يلتقط الإشعار.
 *
 * مهم:
 *  - هذا الملف يجب أن يكون في public/ ليُخدَم من الجذر `/firebase-messaging-sw.js`.
 *  - لا يدعم ES modules بأناقة على بعض المتصفحات - نستخدم importScripts.
 *  - النسخة المثبّتة من firebase JS SDK يجب أن تطابق نسخة الـclient app.
 *
 * تحديثات على Firebase config:
 *  - عند تغيير projectId/apiKey في .env، يجب تحديث الأرقام أدناه أيضاً
 *    لأن الـSW لا يقرأ environment variables.
 *  - الـapiKey و projectId و messagingSenderId و appId عامة (تظهر في
 *    bundles الـclient) - لا حساسية أمنية في وضعها هنا.
 */

importScripts(
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js"
);

// =============================================================================
// IMPORTANT: استبدلي هذه القيم بقيم مشروعك من Firebase Console:
//   Project Settings → General → Your apps → Web app → SDK setup
// =============================================================================
firebase.initializeApp({
  apiKey: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_API_KEY",
  authDomain: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  projectId: "bratsho-car",
  storageBucket: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_NEXT_PUBLIC_FIREBASE_APP_ID",
});

const messaging = firebase.messaging();

/**
 * عند وصول push في background:
 *  - data-only messages: نُنشئ Notification يدوياً (تحكم كامل بالـicon والـclick).
 *  - notification messages: المتصفح يُنشئ الإشعار تلقائياً، لكن مازلنا نتلقى
 *    onBackgroundMessage للـlogging أو تعديل title.
 *
 * نستخدم data-only من الـserver عندنا للسيطرة الكاملة على المظهر.
 */
messaging.onBackgroundMessage((payload) => {
  // eslint-disable-next-line no-console
  console.log("[SW] background message:", payload);

  const title =
    payload.notification?.title ||
    payload.data?.title ||
    "براتشو كار";
  const body =
    payload.notification?.body ||
    payload.data?.body ||
    "لديك إشعار جديد";
  const link = payload.fcmOptions?.link || payload.data?.link || "/notifications";

  const options = {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: payload.data?.tag || "bratsho-notif",
    dir: "rtl",
    lang: "ar",
    requireInteraction: false,
    data: { link, ...payload.data },
  };

  self.registration.showNotification(title, options);
});

/**
 * عند ضغط الإشعار: نفتح الـtab الموجودة (إن وجدت) أو نفتح جديدة.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const link = (event.notification.data && event.notification.data.link) || "/";
  const targetUrl = new URL(link, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      // أعِد تركيز tab موجود لنفس الـorigin إن أمكن.
      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* بعض المتصفحات تمنع navigate عبر origins؛ تجاهل بأمان. */
            }
          }
          return;
        }
      }

      // لا tab مفتوح - افتح جديدة.
      await self.clients.openWindow(targetUrl);
    })()
  );
});
