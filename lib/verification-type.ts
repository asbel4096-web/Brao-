import { isVerifiedNow } from "@/lib/wallet/verification";

/**
 * نظام أنواع التوثيق في Bratsho Car.
 *
 * ثلاثة أنواع:
 *   account   ✓ حساب موثق  — للأفراد العاديين (تحقق الهوية)
 *   dealer    🏢 تاجر موثق  — للتجار وأصحاب السيارات
 *   showroom  🚗 معرض موثق  — لمعارض السيارات
 *
 * مصدر النوع (بالأولوية):
 *   1) user.verificationType (الحقل الصريح الجديد) إن وُجد
 *   2) استنتاج من البيانات الموجودة (توافق مع الحسابات القديمة):
 *      - isVerifiedDealer === true أو verifiedUntil نشط:
 *          → إن وُجد dealerName/dealerLogo (معرض)  → showroom
 *          → إن وُجد businessName                  → dealer
 *          → غير ذلك                               → account
 *   3) لو لا توثيق نشط → null (لا شارة)
 */

export type VerificationType = "account" | "dealer" | "showroom";

export interface VerifiableUser {
  verificationType?: string;
  isVerifiedDealer?: boolean;
  verifiedUntil?: any;
  businessName?: string;
  dealerName?: string;
  dealerLogo?: string;
  [key: string]: any;
}

/**
 * هل المستخدم موثَّق حالياً (بأي نوع)؟
 * يجمع النظامين: isVerifiedDealer (قديم) + verifiedUntil (جديد).
 */
export function isUserVerified(user?: VerifiableUser | null): boolean {
  if (!user) return false;
  if (user.isVerifiedDealer === true) return true;
  try {
    if (isVerifiedNow(user as any)) return true;
  } catch {
    /* تجاهل */
  }
  return false;
}

/**
 * يُحدّد نوع التوثيق، أو null لو غير موثَّق.
 */
export function getVerificationType(
  user?: VerifiableUser | null
): VerificationType | null {
  if (!user || !isUserVerified(user)) return null;

  // 1) الحقل الصريح
  const explicit = user.verificationType;
  if (explicit === "account" || explicit === "dealer" || explicit === "showroom") {
    return explicit;
  }

  // 2) استنتاج من البيانات (توافق مع القديم)
  if (user.dealerName || user.dealerLogo) return "showroom";
  if (user.businessName) return "dealer";
  return "account";
}

/**
 * أنماط كل نوع: اللون + الأيقونة (اسم من lucide) + النص.
 * الألوان من هوية Bratsho (أزرق أساسي + تدرّجات).
 */
export interface BadgeStyle {
  label: string;
  shortLabel: string;
  icon: "BadgeCheck" | "Store" | "Building2";
  /** classes للخلفية + النص */
  cls: string;
  /** لون الأيقونة عند العرض المنفصل */
  iconColor: string;
}

export const VERIFICATION_STYLES: Record<VerificationType, BadgeStyle> = {
  account: {
    label: "حساب موثق",
    shortLabel: "موثق",
    icon: "BadgeCheck",
    cls: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    iconColor: "text-blue-600",
  },
  dealer: {
    label: "تاجر موثق",
    shortLabel: "تاجر موثق",
    icon: "Store",
    cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    iconColor: "text-emerald-600",
  },
  showroom: {
    label: "معرض موثق",
    shortLabel: "معرض موثق",
    icon: "Building2",
    cls: "bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
    iconColor: "text-violet-600",
  },
};
