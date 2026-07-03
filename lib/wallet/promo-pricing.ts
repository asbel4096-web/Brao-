import { PRICING } from "@/lib/wallet/types";

/**
 * أسعار باقات الترقية القابلة للتعديل من لوحة الأدمن.
 *
 * مبدأ الأمان: العميل لا يُرسل السعر أبداً — يرسل مفتاح الباقة فقط،
 * والسيرفر يحتسب السعر الفعّال من config/app.promoPricing (أو القيم
 * الافتراضية). هذه الوحدة "نقية" (بلا أي Firebase) فتعمل على العميل
 * والسيرفر معاً للتحقّق والعرض.
 */

export type PromoServiceKey = "featured" | "boost" | "vip" | "urgent";

export const PROMO_KEYS: PromoServiceKey[] = ["featured", "boost", "vip", "urgent"];

export const PROMO_META: Record<
  PromoServiceKey,
  { label: string; emoji: string; durationDays: number; hint: string }
> = {
  featured: { label: "مميّز", emoji: "⭐", durationDays: 3, hint: "ظهور مميّز 3 أيام" },
  boost: { label: "مموّل", emoji: "🚀", durationDays: 3, hint: "تعزيز قوي 3 أيام" },
  vip: { label: "VIP", emoji: "👑", durationDays: 3, hint: "أعلى أولوية 3 أيام" },
  urgent: { label: "عاجل", emoji: "⚡", durationDays: 3, hint: "وسم عاجل 3 أيام" },
};

export const DEFAULT_PROMO_PRICING: Record<PromoServiceKey, number> = {
  featured: PRICING.PROMO_FEATURED,
  boost: PRICING.PROMO_BOOST,
  vip: PRICING.PROMO_VIP,
  urgent: PRICING.PROMO_URGENT,
};

export const PROMO_PRICE_MIN = 1;
export const PROMO_PRICE_MAX = 100000;

/**
 * يُنظّف كائن أسعار قادم من Firestore/الإدخال: يقبل فقط أرقاماً صحيحة
 * ضمن الحدود، ويرجع الباقي إلى الافتراضي. يُستخدم على السيرفر (للشحن
 * والكتابة) وعلى العميل (للعرض) لضمان قيم سليمة دائماً.
 */
export function sanitizePromoPricing(
  raw: unknown
): Record<PromoServiceKey, number> {
  const out: Record<PromoServiceKey, number> = { ...DEFAULT_PROMO_PRICING };
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const k of PROMO_KEYS) {
      const n = Number(obj[k]);
      if (Number.isFinite(n) && n >= PROMO_PRICE_MIN && n <= PROMO_PRICE_MAX) {
        out[k] = Math.round(n);
      }
    }
  }
  return out;
}
