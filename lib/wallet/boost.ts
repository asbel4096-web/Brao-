import type { Timestamp } from "firebase/firestore";
import { PRICING } from "./types";

/**
 * Boosts + Featured Listings System
 *
 * 3 خدمات قابلة للشراء بـBC:
 *
 * 1. bump (رفع للأعلى) - 25 BC, فوري:
 *    يُحدّث listings/{id}.updatedAt → الإعلان يقفز لأعلى القائمة
 *    التأثير: مؤقت (حتى ينشر آخر إعلاناً جديداً)
 *    metadata: { bumpedAt: Timestamp, bumpCount: number }
 *
 * 2. boost (Boost قوي) - 80 BC, 7 أيام:
 *    يضع listings/{id}.boostedUntil = +7 days
 *    قائمة الإعلانات تُرتّب: boosted أولاً (إن لم ينتهِ)، ثم البقية
 *    تراكم: لو الإعلان مُعزَّز حالياً، يُضاف 7 أيام للوقت الحالي
 *
 * 3. featured (إعلان مميَّز) - 150 BC, 7 أيام:
 *    يضع listings/{id}.featured = true + featuredUntil = +7 days
 *    يظهر:
 *      - شارة 🔥 على البطاقة
 *      - في قسم "الإعلانات المميَّزة" بالصفحة الرئيسية
 *      - أعلى نتائج البحث (قبل boosted)
 *
 * الترتيب النهائي في القوائم:
 *   1. featured && featuredUntil > now    (الأعلى)
 *   2. boostedUntil > now
 *   3. updatedAt desc                     (العادي)
 *
 * تراكم الخدمات: نعم. المستخدم يستطيع شراء أكثر من خدمة
 * على نفس الإعلان (مثلاً bump + featured = الأقوى).
 *
 * Lazy cleanup: عند فتح /admin/boosts، النظام يُنظّف
 * featured/boosted المنتهية (يضع featured=false عند الانتهاء).
 */

export type BoostServiceKey = "bump" | "boost" | "featured";

export interface BoostService {
  key: BoostServiceKey;
  label: string;
  shortLabel: string;
  description: string;
  price: number;
  durationDays?: number;  // bump فوري (لا مدة)
  icon: string;
  gradient: string;
}

export const BOOST_SERVICES: Record<BoostServiceKey, BoostService> = {
  bump: {
    key: "bump",
    label: "رفع للأعلى",
    shortLabel: "رفع",
    description: "اقفز فوراً لأعلى القائمة (مؤقت)",
    price: PRICING.BOOST_TO_TOP,
    icon: "⬆️",
    gradient: "from-blue-500 to-indigo-600",
  },
  boost: {
    key: "boost",
    label: "Boost قوي",
    shortLabel: "Boost",
    description: "ابقَ في أعلى القائمة لمدة 7 أيام",
    price: PRICING.BOOST_STRONG,
    durationDays: 7,
    icon: "🚀",
    gradient: "from-purple-500 to-pink-600",
  },
  featured: {
    key: "featured",
    label: "إعلان مميَّز",
    shortLabel: "مميَّز",
    description: "شارة + ظهور في قسم المميَّزة بالصفحة الرئيسية",
    price: PRICING.FEATURED_LISTING_7DAYS,
    durationDays: 7,
    icon: "✨",
    gradient: "from-amber-500 to-orange-600",
  },
};

export const ALL_BOOST_SERVICES: BoostService[] = Object.values(BOOST_SERVICES);

// ============================================================
// Helpers لقراءة حالة الإعلان
// ============================================================

export interface ListingBoostFields {
  boostedUntil?: Timestamp | null;
  featured?: boolean;
  featuredUntil?: Timestamp | null;
  bumpedAt?: Timestamp | null;
  bumpCount?: number;
}

/** هل الإعلان مُعزَّز فعلياً الآن؟ */
export function isBoostedNow(listing: ListingBoostFields): boolean {
  const ms = listing.boostedUntil?.toMillis?.();
  return !!ms && ms > Date.now();
}

/** هل الإعلان مميَّز فعلياً الآن؟ */
export function isFeaturedNow(listing: ListingBoostFields): boolean {
  if (listing.featured !== true) return false;
  const ms = listing.featuredUntil?.toMillis?.();
  return !!ms && ms > Date.now();
}

/** عدد الأيام المتبقية لـboost. */
export function boostDaysRemaining(listing: ListingBoostFields): number | null {
  const ms = listing.boostedUntil?.toMillis?.();
  if (!ms) return null;
  const diff = ms - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** عدد الأيام المتبقية لـfeatured. */
export function featuredDaysRemaining(listing: ListingBoostFields): number | null {
  const ms = listing.featuredUntil?.toMillis?.();
  if (!ms) return null;
  const diff = ms - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** صياغة "متبقي X يوم" أو "اليوم الأخير". */
export function formatRemainingDays(days: number | null): string {
  if (days === null) return "—";
  if (days <= 0) return "منتهٍ";
  if (days === 1) return "اليوم الأخير";
  if (days === 2) return "يومان";
  if (days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}
