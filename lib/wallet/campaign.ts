import type { Timestamp } from "firebase/firestore";
import { isBoostedNow, type ListingBoostFields } from "./boost";

/**
 * ============================================================
 *  Campaign Management — إدارة الحملة الإعلانية الممولة
 * ============================================================
 *
 * يبني فوق نظام الـboost الحالي (boostedUntil) ميزات شبيهة بـFacebook Ads:
 *  - إيقاف مؤقت (Pause): يُجمّد الوقت المتبقي ويوقف الظهور فوراً.
 *  - استئناف (Resume): يكمل من الوقت المتبقي المجمّد.
 *  - تمديد (Extend): شراء أيام إضافية تُضاف للحملة الحالية.
 *  - انتهاء (Expired): تتوقف ويبقى الإعلان عادياً + إعادة تفعيل.
 *
 * الحقول الجديدة على وثيقة الإعلان (تُكتب server-side فقط عبر API):
 *  - boostedUntil           : نهاية الحملة (نشطة).
 *  - boostedAt              : بداية/آخر تفعيل للحملة.
 *  - boostPaused            : true عند الإيقاف المؤقت.
 *  - boostPausedRemainingMs : الوقت المتبقي المجمّد (ملّي ثانية) عند الإيقاف.
 */

export interface CampaignFields extends ListingBoostFields {
  boostedAt?: Timestamp | null;
  boostPaused?: boolean;
  boostPausedRemainingMs?: number;
  // عدّادات الأداء
  views?: number;
  sponsoredImpressions?: number;
  sponsoredClicks?: number;
  phoneClicks?: number;
  whatsappClicks?: number;
  chatClicks?: number;
}

export type CampaignStatus = "active" | "paused" | "expired" | "none";

/** باقات تمديد الحملة الممولة (أيام إضافية). */
export interface BoostExtension {
  days: number;
  price: number; // د.ل (LYD)
  label: string;
}

export const BOOST_EXTENSIONS: BoostExtension[] = [
  { days: 3, price: 50, label: "+3 أيام" },
  { days: 7, price: 110, label: "+7 أيام" },
  { days: 15, price: 220, label: "+15 يوم" },
  { days: 30, price: 400, label: "+30 يوم" },
];

export function getExtension(days: number): BoostExtension | undefined {
  return BOOST_EXTENSIONS.find((e) => e.days === days);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** حالة الحملة الممولة الحالية. */
export function campaignStatus(l: CampaignFields): CampaignStatus {
  if (l.boostPaused === true) return "paused";
  if (isBoostedNow(l)) return "active";
  // كان لها حملة سابقة (boostedAt موجود) لكنها غير نشطة الآن → منتهية
  if (l.boostedAt) return "expired";
  return "none";
}

/** الوقت المتبقي للحملة (ملّي ثانية) — يحترم حالة الإيقاف. */
export function campaignRemainingMs(l: CampaignFields): number {
  if (l.boostPaused === true) {
    return Math.max(0, Number(l.boostPausedRemainingMs) || 0);
  }
  const ms = l.boostedUntil?.toMillis?.() || 0;
  return Math.max(0, ms - Date.now());
}

/** الأيام المتبقية (محسوبة للأعلى). */
export function campaignRemainingDays(l: CampaignFields): number {
  return Math.ceil(campaignRemainingMs(l) / DAY_MS);
}

/** هل للإعلان حملة ممولة (نشطة/متوقفة/منتهية) تستحق لوحة إدارة؟ */
export function hasCampaign(l: CampaignFields): boolean {
  return campaignStatus(l) !== "none";
}

/** نسبة النقر للظهور CTR (%). */
export function campaignCtr(l: CampaignFields): number {
  const imp = Number(l.sponsoredImpressions) || 0;
  const clk = Number(l.sponsoredClicks) || 0;
  if (imp <= 0) return 0;
  return (clk / imp) * 100;
}

export const STATUS_LABEL: Record<CampaignStatus, string> = {
  active: "نشطة",
  paused: "متوقفة",
  expired: "منتهية",
  none: "—",
};
