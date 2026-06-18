import { isNative } from "./platform";

/**
 * الروابط العميقة (Universal/App Links): عند فتح رابط
 * https://www.bratshocar.com/listings/123 من خارج التطبيق، نوجّه داخلياً
 * إلى /listings/123 بدل فتح المتصفّح.
 */
const SITE_HOSTS = ["www.bratshocar.com", "bratshocar.com"];

export async function attachDeepLinks(navigate: (path: string) => void): Promise<void> {
  if (!isNative()) return;
  try {
    const { App } = await import("@capacitor/app");
    await App.addListener("appUrlOpen", ({ url }) => {
      try {
        const u = new URL(url);
        // نقبل نطاق الموقع أو سكيمة مخصّصة com.bratsho.car://
        const isSite = SITE_HOSTS.includes(u.hostname);
        const isScheme = u.protocol.startsWith("com.bratsho.car");
        if (isSite || isScheme) {
          const path = `${u.pathname}${u.search}` || "/";
          navigate(path);
        }
      } catch {
        /* تجاهل روابط غير صالحة */
      }
    });
  } catch {
    /* تجاهل */
  }
}
