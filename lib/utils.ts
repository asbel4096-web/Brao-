import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Timestamp } from "firebase/firestore";
import type { Listing, ListingEntityType } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n) || n <= 0) return "السعر عند الطلب";
  return new Intl.NumberFormat("ar-LY").format(n) + " د.ل";
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value);
  if (!isFinite(n)) return "0";
  return new Intl.NumberFormat("ar-LY").format(n);
}

export function normalizeLibyanPhone(input: string): string {
  if (!input) return "";
  const digits = input.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("218")) return digits;
  if (digits.startsWith("0")) return "218" + digits.slice(1);
  return "218" + digits;
}

export function timeAgo(ts?: Timestamp | null): string {
  if (!ts) return "الآن";
  try {
    const date = ts.toDate();
    const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffSec < 60) return "الآن";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `منذ ${diffHr} ساعة`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 30) return `منذ ${diffDay} يوم`;
    const diffMon = Math.floor(diffDay / 30);
    if (diffMon < 12) return `منذ ${diffMon} شهر`;
    return `منذ ${Math.floor(diffMon / 12)} سنة`;
  } catch {
    return "—";
  }
}

export function formatDateTime(ts?: Timestamp | null): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleString("ar-LY", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function buildChatId(uidA: string, uidB: string, listingId: string): string {
  const [u1, u2] = [uidA, uidB].sort();
  return `${listingId}__${u1}__${u2}`;
}

export function truncate(text: string, max = 60): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function inferListingEntityType(listing?: Partial<Listing> | null): ListingEntityType {
  if (listing?.entityType === "service" || listing?.entityType === "listing") {
    return listing.entityType;
  }

  const source = `${listing?.category || ""} ${listing?.title || ""} ${listing?.description || ""}`.toLowerCase();
  const serviceKeywords = [
    "خدمة",
    "خدمات",
    "ورشة",
    "ورشه",
    "ميكانيك",
    "سمكرة",
    "زواق",
    "كهرباء",
    "غسيل",
    "تركيب",
    "صيانة",
    "service",
    "services",
    "workshop",
  ];

  return serviceKeywords.some((keyword) => source.includes(keyword)) ? "service" : "listing";
}

export function getTraderDisplayName(
  profile?: { dealerName?: string; businessName?: string; name?: string } | null
): string {
  return (
    profile?.dealerName?.trim() ||
    profile?.businessName?.trim() ||
    profile?.name?.trim() ||
    "تاجر براتشو كار"
  );
}

/**
 * هل الإعلان مميز حالياً؟ يفحص العلامة + تاريخ الانتهاء client-side.
 * عند انتهاء featuredUntil يُعامَل كإعلان عادي (لا rerun لـCloud Function
 * مطلوب - الفلترة في الواجهة كافية).
 */
export function isListingFeatured(listing: {
  featured?: boolean;
  featuredUntil?: Timestamp | null;
}): boolean {
  if (!listing.featured) return false;
  const until = listing.featuredUntil;
  if (!until) return false;
  try {
    const expiresMs = (until as any).toMillis
      ? (until as any).toMillis()
      : new Date(until as any).getTime();
    return Number.isFinite(expiresMs) && expiresMs > Date.now();
  } catch {
    return false;
  }
}

/**
 * حساب المسافة بالكيلومتر بين نقطتين جغرافيتين باستخدام معادلة Haversine.
 * المعادلة مناسبة لكل المسافات على الكرة الأرضية (لا تتأثر بالقطبية).
 * تُرجع المسافة بالكيلومتر، أو null لو أحد المدخلات ليس رقماً صالحاً.
 *
 * مثال: calculateDistanceKm(32.88, 13.18, 32.85, 13.20) → ~3.7
 */
export function calculateDistanceKm(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined
): number | null {
  if (
    lat1 == null || lng1 == null || lat2 == null || lng2 == null ||
    !Number.isFinite(lat1) || !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) || !Number.isFinite(lng2)
  ) {
    return null;
  }
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * يُنسّق المسافة لعرضها للمستخدم. أمثلة:
 *  - 0.45 → "450 م"
 *  - 1.2  → "1.2 كم"
 *  - 12.7 → "13 كم"
 */
export function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "";
  if (km < 1) return `${Math.round(km * 1000)} م`;
  if (km < 10) return `${km.toFixed(1)} كم`;
  return `${Math.round(km)} كم`;
}
