import type { Timestamp } from "firebase/firestore";

/**
 * أنواع البلاغات وأسبابها.
 *
 * هذا الملف هو **المصدر الوحيد للحقيقة** لأنواع البلاغ والأسباب.
 * يستخدمه:
 *  - UI الإبلاغ في الموقع العام (ReportDialog)
 *  - صفحة الأدمن لعرض البلاغات
 *  - API routes للتحقق من المدخلات
 */

// ============================================================
// Target types
// ============================================================
export const REPORT_TARGET_TYPES = ["listing", "comment", "user", "fridayMarket"] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const TARGET_TYPE_LABELS: Record<ReportTargetType, string> = {
  listing: "إعلان",
  comment: "تعليق",
  user: "مستخدم",
  fridayMarket: "عرض سوق الجمعة",
};

// ============================================================
// Report reasons - مختلفة حسب نوع الـtarget
// ============================================================
export interface ReportReason {
  key: string;
  label: string;
  description?: string;
}

export const LISTING_REASONS: ReportReason[] = [
  { key: "fake", label: "إعلان مزيف", description: "محتوى غير حقيقي أو نصب" },
  { key: "duplicate", label: "إعلان مكرّر", description: "نفس الإعلان موجود بالفعل" },
  { key: "spam", label: "إعلان سبام" },
  { key: "offensive", label: "محتوى مسيء أو غير لائق" },
  { key: "wrong_category", label: "تصنيف خاطئ" },
  { key: "fraud", label: "احتيال أو خداع", description: "السعر مضلل أو معلومات خاطئة" },
  { key: "stolen", label: "مركبة مسروقة" },
  { key: "other", label: "سبب آخر" },
];

export const COMMENT_REASONS: ReportReason[] = [
  { key: "offensive", label: "محتوى مسيء" },
  { key: "spam", label: "سبام" },
  { key: "harassment", label: "تحرّش أو تنمّر" },
  { key: "hate", label: "كراهية أو تمييز" },
  { key: "off_topic", label: "خارج الموضوع" },
  { key: "other", label: "سبب آخر" },
];

export const USER_REASONS: ReportReason[] = [
  { key: "impersonation", label: "انتحال شخصية" },
  { key: "spam", label: "حساب سبام" },
  { key: "fraud", label: "احتيال متكرّر" },
  { key: "harassment", label: "تحرّش بمستخدمين آخرين" },
  { key: "fake_account", label: "حساب وهمي" },
  { key: "other", label: "سبب آخر" },
];

export const FRIDAY_MARKET_REASONS: ReportReason[] = [
  { key: "fake", label: "عرض مزيف", description: "محتوى غير حقيقي أو نصب" },
  { key: "spam", label: "عرض سبام" },
  { key: "offensive", label: "محتوى مسيء أو غير لائق" },
  { key: "wrong_category", label: "قسم خاطئ" },
  { key: "fraud", label: "احتيال أو سعر مضلّل" },
  { key: "prohibited", label: "سلعة ممنوعة" },
  { key: "other", label: "سبب آخر" },
];

export function getReasonsFor(type: ReportTargetType): ReportReason[] {
  switch (type) {
    case "listing":
      return LISTING_REASONS;
    case "comment":
      return COMMENT_REASONS;
    case "user":
      return USER_REASONS;
    case "fridayMarket":
      return FRIDAY_MARKET_REASONS;
  }
}

export function getReasonLabel(type: ReportTargetType, key: string): string {
  const found = getReasonsFor(type).find((r) => r.key === key);
  return found?.label || key;
}

// ============================================================
// Report status
// ============================================================
export type ReportStatus =
  | "pending"      // جديد، لم يُراجع بعد
  | "reviewing"    // الأدمن يراجعه الآن
  | "resolved"     // تم اتخاذ إجراء (حذف/حظر/...)
  | "dismissed";   // البلاغ رُفض (لا مشكلة)

export const STATUS_LABELS: Record<ReportStatus, string> = {
  pending: "معلَّق",
  reviewing: "قيد المراجعة",
  resolved: "تم الإجراء",
  dismissed: "مرفوض",
};

// ============================================================
// Report document shape
// ============================================================
export interface ReportDoc {
  id: string;
  reporterId: string;
  reporterEmail?: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  /** بيانات إضافية للوصول السريع للـtarget (مثلاً ownerId لتعليق). */
  targetMeta?: {
    title?: string;
    ownerId?: string;
    /** للتعليقات: listingId الأب */
    parentListingId?: string;
    /** snapshot من نص التعليق - لو حُذف يبقى مرئياً للأدمن */
    snapshot?: string;
  };
  reason: string; // key من LISTING/COMMENT/USER_REASONS
  description?: string;
  status: ReportStatus;
  /** المستخدم الذي عالج البلاغ (admin uid). */
  handledBy?: string;
  handledByEmail?: string;
  /** الإجراء المتخذ ("delete_target", "ban_target", "warn", "dismiss"). */
  resolution?: string;
  resolutionNote?: string;
  handledAt?: Timestamp | null;
  createdAt?: Timestamp | null;
}

// ============================================================
// Resolutions (الإجراء المتخذ على البلاغ)
// ============================================================
export const RESOLUTIONS = [
  { key: "dismiss", label: "رفض البلاغ", tone: "slate" },
  { key: "warn", label: "تحذير المستخدم", tone: "amber" },
  { key: "delete_target", label: "حذف المحتوى", tone: "rose" },
  { key: "ban_target_owner", label: "حظر صاحب المحتوى", tone: "rose" },
] as const;

export type ResolutionKey = (typeof RESOLUTIONS)[number]["key"];
