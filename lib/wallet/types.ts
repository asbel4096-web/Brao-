import type { Timestamp } from "firebase/firestore";

/**
 * Wallet System Types
 *
 * البنية في Firestore:
 *   users/{uid} = {
 *     ...existing fields,
 *     balance: number,           // الرصيد الحالي (BC)
 *     referralCode: string,      // كود الإحالة الفريد
 *     referredBy?: string,       // كود من دعا هذا المستخدم
 *     referralsCount: number,    // عدد من دعاهم
 *     vipLevel?: number,         // 0=عادي، 1=Silver، 2=Gold، 3=VIP
 *     walletEnabled?: boolean,   // override فردي (نادر)
 *     verifiedUntil?: Timestamp, // تاريخ انتهاء التوثيق
 *     verificationPlan?: string, // basic/gold/vip/business/annual
 *     verificationStatus?: string,
 *   }
 *
 *   walletTransactions/{txId} = {
 *     userId, amount, type, reason, balanceAfter,
 *     createdAt, createdBy, metadata
 *   }
 */

// ============================================================
// Transaction types
// ============================================================
export const TRANSACTION_TYPES = [
  "credit",            // إيداع رصيد
  "debit",             // خصم رصيد
  "reward",            // مكافأة من النظام
  "purchase",          // شراء خدمة
  "boost",             // تعزيز إعلان
  "verification",      // اشتراك توثيق
  "featured_listing",  // إعلان مميز
  "referral_bonus",    // مكافأة إحالة
  "admin_adjust",      // تعديل يدوي من الأدمن
  "refund",            // استرداد
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  credit: "إيداع",
  debit: "خصم",
  reward: "مكافأة",
  purchase: "شراء",
  boost: "تعزيز",
  verification: "اشتراك توثيق",
  featured_listing: "إعلان مميز",
  referral_bonus: "مكافأة دعوة",
  admin_adjust: "تعديل إداري",
  refund: "استرداد",
};

/**
 * هل النوع credit أم debit؟ يُحدّد لون العرض (أخضر/أحمر).
 * بعض الأنواع credit دائماً (reward, refund, credit, referral_bonus)،
 * بعضها debit دائماً (purchase, boost, verification, featured_listing).
 * admin_adjust + debit يمكن أن يكون أي اتجاه (نحدّد من sign(amount)).
 */
export function isCreditType(type: TransactionType, amount: number): boolean {
  if (amount > 0) return true;
  if (amount < 0) return false;
  // amount === 0 (نادر) → نعتمد على النوع
  const creditTypes: TransactionType[] = [
    "credit",
    "reward",
    "referral_bonus",
    "refund",
  ];
  return creditTypes.includes(type);
}

// ============================================================
// Transaction document
// ============================================================
export interface WalletTransaction {
  id: string;
  userId: string;
  /** الموجب = إضافة، السالب = خصم. نخزّن الإشارة لتسهيل الـqueries. */
  amount: number;
  type: TransactionType;
  /** سبب نصي قصير ("شراء إعلان مميز - هوندي 2020"). */
  reason: string;
  /** الرصيد بعد العملية (audit + عرض). */
  balanceAfter: number;
  /** uid من نفّذ العملية (الـuser نفسه للـauto، الأدمن للـmanual). */
  createdBy: string;
  createdByEmail?: string;
  /** بيانات إضافية (listingId، planType، إلخ). */
  metadata?: Record<string, any>;
  createdAt?: Timestamp | null;
}

// ============================================================
// Pricing
// ============================================================
/**
 * أسعار الخدمات بـBC.
 * مركزية هنا لتسهيل التحديث (نقطة واحدة).
 */
export const PRICING = {
  VERIFICATION_BASIC_MONTHLY: 200,
  VERIFICATION_GOLD_MONTHLY: 500,
  VERIFICATION_VIP_MONTHLY: 800,
  VERIFICATION_BUSINESS_MONTHLY: 1500,
  VERIFICATION_ANNUAL: 2000,
  FEATURED_LISTING_7DAYS: 150,
  BOOST_TO_TOP: 25,
  BOOST_STRONG: 80,
  VIP_ACCOUNT: 300,
  REFERRAL_REWARD: 10,
  // باقات الترقية الهرمية (مميز < ممول < VIP)
  PROMO_FEATURED: 50, // مميز - 3 أيام
  PROMO_BOOST: 120, // ممول - 7 أيام
  PROMO_VIP: 200, // VIP - 14 يوم
} as const;

// ============================================================
// Verification plans
// ============================================================
export const VERIFICATION_PLANS = [
  {
    key: "basic",
    label: "توثيق أساسي",
    durationDays: 30,
    price: PRICING.VERIFICATION_BASIC_MONTHLY,
    color: "brand",
  },
  {
    key: "gold",
    label: "توثيق ذهبي",
    durationDays: 30,
    price: PRICING.VERIFICATION_GOLD_MONTHLY,
    color: "amber",
  },
  {
    key: "vip",
    label: "توثيق VIP",
    durationDays: 30,
    price: PRICING.VERIFICATION_VIP_MONTHLY,
    color: "purple",
  },
  {
    key: "business",
    label: "خطة الشركات",
    durationDays: 30,
    price: PRICING.VERIFICATION_BUSINESS_MONTHLY,
    color: "emerald",
  },
  {
    key: "annual",
    label: "خطة سنوية",
    durationDays: 365,
    price: PRICING.VERIFICATION_ANNUAL,
    color: "rose",
  },
] as const;

export type VerificationPlanKey = (typeof VERIFICATION_PLANS)[number]["key"];

// ============================================================
// Helpers
// ============================================================

/** صياغة رقم العملة بإضافة "BC". */
export function formatBC(amount: number): string {
  return `${amount.toLocaleString("ar-LY")} BC`;
}

/** صياغة مع علامة + أو - حسب الاتجاه. */
export function formatBCSigned(amount: number): string {
  const sign = amount > 0 ? "+" : "";
  return `${sign}${amount.toLocaleString("ar-LY")} BC`;
}
