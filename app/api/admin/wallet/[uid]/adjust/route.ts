import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";
import {
  TRANSACTION_TYPES,
  type TransactionType,
} from "@/lib/wallet/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/admin/wallet/[uid]/adjust
 * body: {
 *   amount: number,      // الموجب=إيداع، السالب=خصم
 *   type: TransactionType,
 *   reason: string,      // مطلوب - لـaudit trail
 *   metadata?: object
 * }
 *
 * يُعدّل رصيد مستخدم + يُسجّل المعاملة. transactional لضمان atomicity.
 *
 * تدفقات:
 *  - أدمن يضيف هدية (100 BC): { amount: 100, type: "admin_adjust", reason: "هدية ترحيب" }
 *  - أدمن يخصم (تصحيح خطأ): { amount: -50, type: "admin_adjust", reason: "تصحيح" }
 *  - شراء خدمة (server-side): { amount: -150, type: "featured_listing", reason: "..." }
 *
 * الصلاحية: wallet.manage (نُضيفها لاحقاً) أو من إجراء داخلي
 *
 * حماية:
 *  - amount يجب أن يكون رقم صالح، ليس 0
 *  - المحفظة لن تذهب لرصيد سالب (يرفض الـAPI الخصم لو الرصيد غير كافٍ)
 *  - معاملة atomic (Firestore transaction) - لا race conditions
 *  - كل عملية تُسجّل في walletTransactions + adminLogs
 *  - حد أقصى للـadjust (100,000 BC) لمنع أخطاء الكتابة
 */

const MAX_SINGLE_ADJUST = 100_000;

export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  // 1) Auth: نستخدم نفس permission كـusers.ban (أدمن قوي)
  // يمكن تعديلها لاحقاً لـwallet.manage مخصصة
  const result = await verifyAdminRequest(request, "users.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const targetUid = params.uid;
  if (!targetUid) return jsonError("Missing user id", 400);

  let body: {
    amount?: number;
    type?: string;
    reason?: string;
    metadata?: Record<string, any>;
  } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  // 2) Validation
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount === 0) {
    return jsonError("amount يجب أن يكون رقماً غير صفر", 400);
  }
  if (Math.abs(amount) > MAX_SINGLE_ADJUST) {
    return jsonError(
      `الحد الأقصى للعملية الواحدة: ${MAX_SINGLE_ADJUST} BC`,
      400
    );
  }

  const type = body.type as TransactionType;
  if (!TRANSACTION_TYPES.includes(type)) {
    return jsonError(
      `نوع عملية غير صالح. المسموح: ${TRANSACTION_TYPES.join(", ")}`,
      400
    );
  }

  const reason = (body.reason || "").trim();
  if (!reason || reason.length < 3) {
    return jsonError("اكتب سبباً للعملية (3 أحرف على الأقل)", 400);
  }
  if (reason.length > 500) {
    return jsonError("السبب طويل جداً", 400);
  }

  const metadata = body.metadata && typeof body.metadata === "object"
    ? body.metadata
    : null;

  // 3) Transaction (atomic)
  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const userRef = fs.collection("users").doc(targetUid);
  const txRef = fs.collection("walletTransactions").doc();

  let resultData: {
    balanceBefore: number;
    balanceAfter: number;
    txId: string;
  };

  try {
    resultData = await fs.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new Error("المستخدم غير موجود");
      }
      const userData = userSnap.data() || {};
      const currentBalance = Number(userData.balance) || 0;
      const newBalance = currentBalance + amount;

      // فحص: لا رصيد سالب
      if (newBalance < 0) {
        throw new Error(
          `الرصيد غير كافٍ. الحالي: ${currentBalance} BC، المطلوب: ${Math.abs(amount)} BC`
        );
      }

      // كتابة المعاملة
      tx.set(txRef, {
        userId: targetUid,
        amount,
        type,
        reason,
        balanceAfter: newBalance,
        createdBy: caller.uid,
        createdByEmail: caller.email,
        metadata,
        createdAt: FieldValue.serverTimestamp(),
      });

      // تحديث الرصيد + counter
      tx.update(userRef, {
        balance: newBalance,
        walletUpdatedAt: FieldValue.serverTimestamp(),
      });

      return {
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        txId: txRef.id,
      };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل تعديل الرصيد", 400);
  }

  // 4) Log
  await logAdminAction({
    adminUid: caller.uid,
    action: "wallet_adjust",
    targetType: "user",
    targetId: targetUid,
    reason,
    before: { balance: resultData.balanceBefore },
    after: {
      balance: resultData.balanceAfter,
      amount,
      type,
      txId: resultData.txId,
    },
  });

  return NextResponse.json({
    ok: true,
    txId: resultData.txId,
    balanceBefore: resultData.balanceBefore,
    balanceAfter: resultData.balanceAfter,
  });
}
