import type { Timestamp } from "firebase/firestore";

/**
 * Top-up Requests System
 *
 * المستخدم يطلب شحناً → الأدمن يراجع → موافقة أو رفض.
 *
 * البنية في Firestore:
 *   topupRequests/{requestId}:
 *     userId, userEmail, userName,
 *     amount, paymentMethod, contactNumber, note,
 *     status: "pending" | "approved" | "rejected",
 *     reviewedBy, reviewedAt, reviewNote,
 *     txId? (لو approved، الـwallet tx الذي أنشئ),
 *     createdAt
 */

export type TopupStatus = "pending" | "approved" | "rejected";

export const PAYMENT_METHODS = [
  {
    key: "bank_transfer",
    label: "تحويل بنكي",
    description: "حساب البنك التجاري الوطني",
    icon: "🏦",
  },
  {
    key: "edfaali",
    label: "إدفعلي",
    description: "تطبيق الدفع الإلكتروني",
    icon: "💳",
  },
  {
    key: "tadawul",
    label: "تداول",
    description: "خدمة الدفع الإلكتروني",
    icon: "📱",
  },
  {
    key: "cash",
    label: "كاش (يداً بيد)",
    description: "تسليم مباشر للإدارة",
    icon: "💵",
  },
  {
    key: "other",
    label: "طريقة أخرى",
    description: "اذكر التفاصيل في الملاحظات",
    icon: "📝",
  },
] as const;

export type PaymentMethodKey = (typeof PAYMENT_METHODS)[number]["key"];

/** الحد الأدنى للشحنة الواحدة. */
export const TOPUP_MIN_AMOUNT = 50;
/** الحد الأقصى للشحنة الواحدة. */
export const TOPUP_MAX_AMOUNT = 10000;
/** الحد الأقصى للطلبات المعلّقة في نفس الوقت (anti-spam). */
export const MAX_PENDING_PER_USER = 3;

export interface TopupRequest {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
  amount: number;
  paymentMethod: PaymentMethodKey;
  paymentMethodLabel?: string;
  contactNumber: string;
  note?: string;
  status: TopupStatus;
  reviewedBy?: string;
  reviewedByEmail?: string;
  reviewedAt?: Timestamp | null;
  reviewNote?: string;
  txId?: string;
  createdAt?: Timestamp | null;
}

export const TOPUP_STATUS_META: Record<
  TopupStatus,
  { label: string; tone: string }
> = {
  pending: { label: "قيد المراجعة", tone: "amber" },
  approved: { label: "تمت الموافقة", tone: "emerald" },
  rejected: { label: "مرفوض", tone: "rose" },
};

export function findPaymentMethod(key: PaymentMethodKey | string) {
  return PAYMENT_METHODS.find((m) => m.key === key) || null;
}
