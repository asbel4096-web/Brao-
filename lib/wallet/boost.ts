import type { Timestamp } from "firebase/firestore";
import { PRICING } from "./types";

/**
 * نظام الترقية الهرمي (Promotion Tiers)
 * ============================================================
 *
 * 3 باقات هرمية (من الأعلى للأدنى):
 *
 * 🥇 vip (إعلان VIP) - 200 BC, 14 يوم:
 *    - أعلى أولوية في المنصة + ظهور في الصفحة الرئيسية
 *    - شارة ذهبية + تمييز بصري خاص (إطار ذهبي)
 *    - الحقول: vipUntil + featured=true + featuredUntil (للصفحة الرئيسية)
 *
 * 🥈 boost (إعلان ممول) - 120 BC, 7 أيام:
 *    - أولوية أعلى من المميز + ظهور أقوى في البحث
 *    - شارة خضراء
 *    - الحقول: boostedUntil
 *
 * 🥉 featured (إعلان مميز) - 50 BC, 3 أيام:
 *    - أولوية أعلى من العادي
 *    - شارة زرقاء
 *    - الحقول: featured=true + featuredUntil
 *
 * ترتيب الأولوية في القوائم:
 *   VIP > ممول > مميز > عادي
 *
 * ✅ توافق كامل: نفس حقول Firestore الحالية
 *    (boostedUntil, featured, featuredUntil) + vipUntil جديد.
 *    الإعلانات القديمة بلا هذه الحقول تُعامَل كعادية.
 *
 * ✅ يحافظ على: المحفظة، الخصم، سجل العمليات، الانتهاء التلقائي،
 *    بنية Firestore، الـAnalytics.
 *
 * تراكم: شراء باقة يمدّد مدتها (يُضاف للوقت المتبقي إن كان نشطاً).
 */

// المفاتيح الثلاثة (نحافظ على نفس الأسماء القديمة boost/featured للتوافق)
export type BoostServiceKey = "featured" | "boost" | "vip";

export interface BoostService {
  key: BoostServiceKey;
  /** المستوى الهرمي: 1=مميز، 2=ممول، 3=VIP (للترتيب) */
  tier: number;
  label: string;
  shortLabel: string;
  description: string;
  features: string[];
  price: number;
  durationDays: number;
  icon: string; // اسم lucide
  emoji: string;
  /** لون الشارة: classes */
  badgeCls: string;
  /** تدرّج البطاقة */
  gradient: string;
  /** لون مميز للحدود/التحديد */
  accent: string;
}

export const BOOST_SERVICES: Record<BoostServiceKey, BoostService> = {
  featured: {
    key: "featured",
    tier: 1,
    label: "إعلان مميز",
    shortLabel: "مميز",
    description: "ظهور أفضل في نتائج البحث",
    features: [
      "شارة مميز زرقاء",
      "أولوية أعلى من الإعلانات العادية",
      "ظهور أفضل في نتائج البحث",
    ],
    price: PRICING.PROMO_FEATURED, // 50
    durationDays: 3,
    icon: "Star",
    emoji: "🥉",
    badgeCls: "bg-blue-600 text-white",
    gradient: "from-blue-50 to-white dark:from-blue-900/20 dark:to-slate-900",
    accent: "blue",
  },
  boost: {
    key: "boost",
    tier: 2,
    label: "إعلان ممول",
    shortLabel: "ممول",
    description: "ظهور أقوى في نتائج البحث",
    features: [
      "شارة ممول خضراء",
      "أولوية أعلى من المميز",
      "ظهور أقوى في نتائج البحث",
      "فرص مشاهدة وتواصل أكبر",
    ],
    price: PRICING.PROMO_BOOST, // 120
    durationDays: 7,
    icon: "Rocket",
    emoji: "🥈",
    badgeCls: "bg-emerald-600 text-white",
    gradient: "from-emerald-50 to-white dark:from-emerald-900/20 dark:to-slate-900",
    accent: "emerald",
  },
  vip: {
    key: "vip",
    tier: 3,
    label: "إعلان VIP",
    shortLabel: "VIP",
    description: "أعلى أولوية + ظهور في الصفحة الرئيسية",
    features: [
      "شارة VIP ذهبية",
      "أعلى أولوية في المنصة",
      "ظهور في أعلى النتائج",
      "ظهور في الصفحة الرئيسية",
      "تمييز بصري خاص للإعلان",
    ],
    price: PRICING.PROMO_VIP, // 200
    durationDays: 14,
    icon: "Crown",
    emoji: "🥇",
    badgeCls: "bg-amber-400 text-amber-950",
    gradient: "from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900",
    accent: "amber",
  },
};

/** الباقات مرتّبة من الأعلى للأدنى (VIP أولاً) للعرض. */
export const ALL_BOOST_SERVICES: BoostService[] = [
  BOOST_SERVICES.vip,
  BOOST_SERVICES.boost,
  BOOST_SERVICES.featured,
];

// ============================================================
// Helpers لقراءة حالة الإعلان
// ============================================================

export interface ListingBoostFields {
  boostedUntil?: Timestamp | null;
  featured?: boolean;
  featuredUntil?: Timestamp | null;
  vipUntil?: Timestamp | null;
  bumpedAt?: Timestamp | null;
  bumpCount?: number;
}

function isActive(ts?: Timestamp | null): boolean {
  const ms = ts?.toMillis?.();
  return !!ms && ms > Date.now();
}

/** هل الإعلان VIP نشط الآن؟ */
export function isVipNow(listing: ListingBoostFields): boolean {
  return isActive(listing.vipUntil);
}

/** هل الإعلان مُموَّل (boost) نشط الآن؟ */
export function isBoostedNow(listing: ListingBoostFields): boolean {
  return isActive(listing.boostedUntil);
}

/** هل الإعلان مميَّز (featured) نشط الآن؟ */
export function isFeaturedNow(listing: ListingBoostFields): boolean {
  if (listing.featured !== true) return false;
  return isActive(listing.featuredUntil);
}

/**
 * مستوى الترقية الفعّال للإعلان (للترتيب والعرض):
 *   3 = VIP، 2 = ممول، 1 = مميز، 0 = عادي
 * يأخذ الأعلى إن كان للإعلان أكثر من ترقية.
 */
export function getPromotionTier(listing: ListingBoostFields): number {
  if (isVipNow(listing)) return 3;
  if (isBoostedNow(listing)) return 2;
  if (isFeaturedNow(listing)) return 1;
  return 0;
}

/** مفتاح الباقة الفعّالة، أو null للعادي. */
export function getActiveBoostKey(
  listing: ListingBoostFields
): BoostServiceKey | null {
  const tier = getPromotionTier(listing);
  if (tier === 3) return "vip";
  if (tier === 2) return "boost";
  if (tier === 1) return "featured";
  return null;
}

/** الأيام المتبقية لأعلى ترقية نشطة. */
export function promotionDaysRemaining(
  listing: ListingBoostFields
): number | null {
  const key = getActiveBoostKey(listing);
  if (!key) return null;
  const field =
    key === "vip"
      ? listing.vipUntil
      : key === "boost"
      ? listing.boostedUntil
      : listing.featuredUntil;
  const ms = field?.toMillis?.();
  if (!ms) return null;
  const diff = ms - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** Backward-compat alias. */
export function boostDaysRemaining(listing: ListingBoostFields): number | null {
  return promotionDaysRemaining(listing);
}

export function featuredDaysRemaining(
  listing: ListingBoostFields
): number | null {
  const ms = listing.featuredUntil?.toMillis?.();
  if (!ms) return null;
  const diff = ms - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** صياغة "متبقي X يوم". */
export function formatRemainingDays(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "منتهٍ";
  if (days === 1) return "اليوم الأخير";
  if (days === 2) return "يومان";
  if (days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}

/**
 * مقارنة إعلانين حسب الأولوية (للاستخدام في .sort).
 * يُرجّع سالباً لو a أعلى. الترتيب: VIP > ممول > مميز > عادي.
 */
export function compareByPromotion(
  a: ListingBoostFields,
  b: ListingBoostFields
): number {
  return getPromotionTier(b) - getPromotionTier(a);
}
