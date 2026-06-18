import { isNative } from "./platform";

/**
 * مشاركة رابط/نص. على الأصلي يستخدم @capacitor/share (شيت المشاركة الأصلي)،
 * وعلى الويب يستخدم navigator.share ثم ينسخ الرابط كحل أخير.
 */
export async function shareLink(opts: {
  title?: string;
  text?: string;
  url: string;
}): Promise<boolean> {
  if (isNative()) {
    try {
      const { Share } = await import("@capacitor/share");
      await Share.share({
        title: opts.title,
        text: opts.text,
        url: opts.url,
        dialogTitle: "مشاركة عبر",
      });
      return true;
    } catch {
      return false;
    }
  }
  try {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      await (navigator as any).share(opts);
      return true;
    }
    await navigator.clipboard.writeText(opts.url);
    return true;
  } catch {
    return false;
  }
}
