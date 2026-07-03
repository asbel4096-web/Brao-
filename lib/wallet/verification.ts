import type { Timestamp } from "firebase/firestore";
import { VERIFICATION_PLANS, type VerificationPlanKey } from "./types";

/**
 * Verification subscriptions — helpers.
 *
 * البيانات تُخزَّن داخل users/{uid} مباشرة (لا collection منفصلة):
 *   - verifiedUntil: Timestamp (متى ينتهي الاشتراك)
 *   - verificationPlan: VerificationPlanKey
 *   - verificationStatus: "active" | "expired" | "cancelled" | "granted"
 *   - verifiedSince: Timestamp (متى بدأ آخر اشتراك)
 *
 * "granted" = منحه الأدمن مجاناً (بدون خصم رصيد). نُفرّقه عن "active"
 * لكي نعرف هل المستخدم دفع أم لا (مهم للإحصاءات).
 *
 * عند الانتهاء: status يتحول لـ"expired" والـUI يخفي الشارة.
 * نُجري التنظيف عند فتح /admin/subscriptions (lazy cleanup).
 */

export type VerificationStatus = "active" | "expired" | "cancelled" | "granted";

export interface UserVerificationFields {
  verifiedUntil?: Timestamp | null;
  verificationPlan?: VerificationPlanKey | null;
  verificationStatus?: VerificationStatus | null;
  verifiedSince?: Timestamp | null;
}

/** هل المستخدم موثَّق فعلياً الآن؟ */
export function isVerifiedNow(user: UserVerificationFields): boolean {
  const status = user.verificationStatus;
  if (status !== "active" && status !== "granted") return false;
  const ms = user.verifiedUntil?.toMillis?.();
  if (!ms) return false;
  return ms > Date.now();
}

/** كم يوماً متبقياً (سالب لو منتهٍ، 0 لو ينتهي اليوم). */
export function daysUntilExpiry(user: UserVerificationFields): number | null {
  const ms = user.verifiedUntil?.toMillis?.();
  if (!ms) return null;
  const diff = ms - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/** هل ينتهي قريباً (≤ 7 أيام)؟ للتنبيهات. */
export function isExpiringSoon(user: UserVerificationFields): boolean {
  const days = daysUntilExpiry(user);
  if (days === null) return false;
  return days >= 0 && days <= 7;
}

/** البحث عن plan بـkey. */
export function findPlan(key: VerificationPlanKey) {
  return VERIFICATION_PLANS.find((p) => p.key === key) || null;
}

/** صياغة عربية لعدد الأيام المتبقية. */
export function formatRemainingDays(days: number | null): string {
  if (days === null) return "—";
  if (days < 0) return "منتهي";
  if (days === 0) return "ينتهي اليوم";
  if (days === 1) return "يوم واحد";
  if (days === 2) return "يومان";
  if (days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}
