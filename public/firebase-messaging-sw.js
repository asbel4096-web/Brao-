/* eslint-disable no-undef */
/**
 * Service Worker لـFirebase Cloud Messaging (background push).
 *
 * كيف يحصل على Firebase config؟
 *  - بدلاً من قيم مكتوبة يدوياً (عرضة للخطأ وتحتاج تحديث عند تغيير المشروع)،
 *    نقرأ القيم من query params في رابط تسجيل الـSW.
 *  - الـclient يُسجّل الـSW هكذا:
 *      navigator.serviceWorker.register(
 *        `/firebase-messaging-sw.js?apiKey=...&projectId=...&...`
 *      )
 *  - نقرأها هنا من self.location.search.
 *
 * لماذا هذا أفضل؟
 *  - لا قيم مكتوبة في الملف (يبقى generic).
 *  - القيم تأتي من نفس مصدر الـclient (env vars) - لا تضارب.
 *  - تغيير المشروع = تغيير env فقط، لا لمس هذا الملف.
 *
 * القيم العامة (apiKey, projectId, ...) آمنة في URL - تظهر في bundle
 * الـclient على أي حال. لا أسرار هنا.
 */

importScripts(
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js"
);

// قراءة config من query params
const params = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: params.get("apiKey") || "",
  authDomain: params.get("authDomain") || "",
  projectId: params.get("projectId") || "",
  storageBucket: params.get("storageBucket") || "",
  messagingSenderId: params.get("messagingSenderId") || "",
  appId: params.get("appId") || "",
};

// تهيئة Firebase فقط إذا توفّرت القيم الأساسية. خلاف ذلك نتجاهل بهدوء
// (الـSW يُسجَّل لكن لا messaging - لن يصل push، لكن لا crash).
let messaging = null;
if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId) {
  try {
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[SW] firebase init failed:", e);
  }
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    // eslint-disable-next-line no-console
    console.log("[SW] background message:", payload);

    const title =
      payload.notification?.title || payload.data?.title || "براتشو كار";
    const body =
      payload.notification?.body || payload.data?.body || "لديك إشعار جديد";
    const link =
      payload.fcmOptions?.link || payload.data?.link || "/notifications";

    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.data?.tag || "bratsho-notif",
      dir: "rtl",
      lang: "ar",
      requireInteraction: false,
      data: { link, ...payload.data },
    });
  });
}

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

      for (const client of allClients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* بعض المتصفحات تمنع navigate؛ تجاهل */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl);
    })()
  );
});
