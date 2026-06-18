import { isNative } from "./platform";

/**
 * إشعارات الدفع الأصلية (FCM) باستخدام @capacitor-firebase/messaging — يعطي
 * توكن FCM موحّداً على Android وiOS، متوافق مع باكند المشروع الذي يخزّن
 * التوكنات في users/{uid}/fcmTokens/{token}.
 *
 * استدعِ registerNativePush(uid) بعد تسجيل الدخول على الأصلي فقط.
 */
export async function registerNativePush(
  saveToken: (token: string, platform: string) => Promise<void>
): Promise<void> {
  if (!isNative()) return;
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
    const { Capacitor } = await import("@capacitor/core");

    const perm = await FirebaseMessaging.requestPermissions();
    if (perm.receive !== "granted") return;

    const { token } = await FirebaseMessaging.getToken();
    if (token) await saveToken(token, Capacitor.getPlatform());

    // تحديث التوكن عند تغيّره
    await FirebaseMessaging.addListener("tokenReceived", (event: any) => {
      if (event?.token) void saveToken(event.token, Capacitor.getPlatform());
    });
  } catch (err) {
    // لا نُفشل التطبيق إن غاب الإعداد الأصلي
    console.error("native push register failed", err);
  }
}

/** نقر المستخدم على إشعار → توجيه داخل التطبيق (مرّر دالة router.push). */
export async function attachPushNavigation(navigate: (path: string) => void): Promise<void> {
  if (!isNative()) return;
  try {
    const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");
    await FirebaseMessaging.addListener("notificationActionPerformed", (event: any) => {
      const link = event?.notification?.data?.link;
      if (typeof link === "string" && link.startsWith("/")) navigate(link);
    });
  } catch {
    /* تجاهل */
  }
}
