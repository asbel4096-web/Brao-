import type { Timestamp } from "firebase/firestore";

/**
 * BC Transfer System - تحويل الرصيد بين المستخدمين.
 *
 * القواعد:
 *  - البحث عن المستلم برقم الهاتف
 *  - بدون رسوم (المبلغ المُرسَل = المبلغ المُستلَم)
 *  - حد أدنى 10 BC، أقصى 1000 BC لكل تحويلة
 *  - أقصى 5 تحويلات في اليوم لكل مرسِل
 *
 * البنية في Firestore:
 *   walletTransfers/{transferId}:
 *     senderUid, senderName, senderPhone
 *     recipientUid, recipientName, recipientPhone
 *     amount: number
 *     note?: string
 *     status: "completed"
 *     createdAt: Timestamp
 *
 * كل تحويلة تُنشئ معاملتين في walletTransactions:
 *   - خصم من المرسِل (type: transfer_out)
 *   - إضافة للمستلم (type: transfer_in)
 *
 * كل العمليات atomic عبر Admin SDK (API route).
 */

export const TRANSFER_MIN_BC = 10;
export const TRANSFER_MAX_BC = 1000;
export const MAX_TRANSFERS_PER_DAY = 5;

export interface WalletTransfer {
  id: string;
  senderUid: string;
  senderName?: string;
  senderPhone?: string;
  recipientUid: string;
  recipientName?: string;
  recipientPhone?: string;
  amount: number;
  note?: string;
  status: "completed";
  createdAt?: Timestamp | null;
}

export interface TransferValidation {
  ok: boolean;
  error?: string;
}

/**
 * فحص المبلغ قبل الإرسال (client-side - يُعاد فحصه server-side).
 */
export function validateTransferAmount(
  amount: number,
  senderBalance: number
): TransferValidation {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "أدخل مبلغاً صحيحاً" };
  }
  if (!Number.isInteger(amount)) {
    return { ok: false, error: "المبلغ يجب أن يكون رقماً صحيحاً" };
  }
  if (amount < TRANSFER_MIN_BC) {
    return { ok: false, error: `الحد الأدنى للتحويل ${TRANSFER_MIN_BC} BC` };
  }
  if (amount > TRANSFER_MAX_BC) {
    return { ok: false, error: `الحد الأقصى للتحويل ${TRANSFER_MAX_BC} BC` };
  }
  if (amount > senderBalance) {
    return { ok: false, error: "رصيدك غير كافٍ" };
  }
  return { ok: true };
}

/**
 * تطبيع رقم الهاتف الليبي للبحث.
 * يُحوّل كل الصيغ إلى صيغة موحَّدة: 09XXXXXXXX
 *
 * أمثلة:
 *   +218 91 234 5678  → 0912345678
 *   218912345678      → 0912345678
 *   0912345678        → 0912345678
 *   912345678         → 0912345678
 */
export function normalizePhoneForSearch(phone: string): string {
  let p = (phone || "").replace(/[\s\-()]/g, "");
  // إزالة +
  p = p.replace(/^\+/, "");
  // 218... → 0...
  if (p.startsWith("218")) {
    p = "0" + p.slice(3);
  }
  // 9XXXXXXXX (9 أرقام) → 0XXXXXXXXX
  if (p.length === 9 && p.startsWith("9")) {
    p = "0" + p;
  }
  return p;
}

/**
 * فحص صيغة رقم الهاتف الليبي.
 * صالح: 09XXXXXXXX (10 أرقام، يبدأ بـ09)
 */
export function isValidLibyanPhone(phone: string): boolean {
  const p = normalizePhoneForSearch(phone);
  return /^09[1-9]\d{7}$/.test(p);
}
