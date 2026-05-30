import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/admin/subscriptions/[uid]/cancel
 * body: { reason?: string, refund?: boolean }
 *
 * يُلغي اشتراك توثيق فوراً (دون انتظار انتهاء المدة).
 *  - يضع verificationStatus = "cancelled"
 *  - verifiedUntil يصبح الآن (الشارة تختفي)
 *  - refund اختياري: يُعيد BC للمستخدم
 *    (مفيد لحالات مثل "خطأ شراء" - الأدمن يلغي ويسترد)
 *
 * مع refund=true:
 *  - نقرأ آخر معاملة verification للمستخدم
 *  - نُعيد الـamount (ما كان مخصوماً)
 *  - نكتب transaction جديدة type="refund"
 *
 * بدون refund: نُلغي فقط بدون لمس الرصيد.
 */

export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  const result = await verifyAdminRequest(request, "users.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const targetUid = params.uid;
  if (!targetUid) return jsonError("Missing user id", 400);

  let body: { reason?: string; refund?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason = (body.reason || "").trim().slice(0, 300) || "إلغاء من الأدمن";
  const wantRefund = body.refund === true;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const userRef = fs.collection("users").doc(targetUid);

  // لو refund: نبحث عن آخر معاملة verification (خارج transaction)
  let refundAmount = 0;
  let lastTxId: string | null = null;
  if (wantRefund) {
    const txSnap = await fs
      .collection("walletTransactions")
      .where("userId", "==", targetUid)
      .where("type", "==", "verification")
      .orderBy("createdAt", "desc")
      .limit(1)
      .get();
    if (!txSnap.empty) {
      const lastTx = txSnap.docs[0];
      const data = lastTx.data();
      // amount سالب أصلاً (خصم)، الـrefund يكون موجباً
      if (typeof data.amount === "number" && data.amount < 0) {
        refundAmount = -data.amount;
        lastTxId = lastTx.id;
      }
    }
  }

  const refundTxRef = fs.collection("walletTransactions").doc();

  let beforeStatus: string | null = null;
  let beforeUntil: number | null = null;
  let balanceAfter = 0;

  try {
    await fs.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");

      const userData = userSnap.data() || {};
      beforeStatus = userData.verificationStatus || null;
      beforeUntil = userData.verifiedUntil?.toMillis?.() || null;
      const currentBalance = Number(userData.balance) || 0;

      // لو refund: نُضيف للرصيد
      if (wantRefund && refundAmount > 0) {
        const newBalance = currentBalance + refundAmount;
        balanceAfter = newBalance;
        tx.set(refundTxRef, {
          userId: targetUid,
          amount: refundAmount,
          type: "refund",
          reason: `استرداد إلغاء توثيق - ${reason}`,
          balanceAfter: newBalance,
          createdBy: caller.uid,
          createdByEmail: caller.email,
          metadata: { refundFor: lastTxId },
          createdAt: FieldValue.serverTimestamp(),
        });
        tx.update(userRef, {
          balance: newBalance,
          walletUpdatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        balanceAfter = currentBalance;
      }

      // إلغاء الاشتراك
      tx.update(userRef, {
        verificationStatus: "cancelled",
        verifiedUntil: new Date(), // ينتهي الآن
      });
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الإلغاء", 400);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "verification_cancel",
    targetType: "user",
    targetId: targetUid,
    reason,
    before: { status: beforeStatus, verifiedUntilMs: beforeUntil },
    after: {
      status: "cancelled",
      refundIssued: wantRefund && refundAmount > 0,
      refundAmount: refundAmount,
    },
  });

  return NextResponse.json({
    ok: true,
    refunded: wantRefund && refundAmount > 0,
    refundAmount,
    balanceAfter,
  });
}
