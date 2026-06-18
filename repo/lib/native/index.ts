import { isNative, getPlatform } from "./platform";
import { attachDeepLinks } from "./deep-links";
import { registerNativePush, attachPushNavigation } from "./push";

export { isNative, getPlatform } from "./platform";
export { pickPhoto, dataUrlToFile } from "./camera";
export { getCurrentLocation } from "./geolocation";
export { shareLink } from "./share";
export { registerNativePush, attachPushNavigation } from "./push";
export { attachDeepLinks } from "./deep-links";

/**
 * تهيئة الطبقة الأصلية — استدعِها مرّة واحدة عند إقلاع التطبيق
 * (مثلاً داخل useEffect في مزوّد عام)، ومرّر router.push للتوجيه.
 *
 * saveToken: تمرّر دالة حفظ توكن FCM في users/{uid}/fcmTokens (الموجودة لديك).
 */
export async function initNativeLayer(opts: {
  navigate: (path: string) => void;
  saveToken?: (token: string, platform: string) => Promise<void>;
}): Promise<void> {
  if (!isNative()) return;

  // شريط الحالة + إخفاء شاشة الإقلاع
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Dark });
    if (getPlatform() === "android") {
      await StatusBar.setBackgroundColor({ color: "#0a1330" });
    }
  } catch {/* اختياري */}
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
  } catch {/* اختياري */}

  await attachDeepLinks(opts.navigate);
  await attachPushNavigation(opts.navigate);
  if (opts.saveToken) await registerNativePush(opts.saveToken);
}
