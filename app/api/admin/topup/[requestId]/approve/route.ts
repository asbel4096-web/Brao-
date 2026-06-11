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
export const maxDuration = 15;

/**
 * POST /api/admin/topup/[requestId]/approve
 * body: { note?: string }
 *
 * يقبل طلب شحن:
 *  - يقرأ الطلب + يفحص status=pending
 *  - transactional:
 *      - يكتب walletTransactions/{txId} بـtype=credit
 *      - يُحدّث users/{uid}.balance += amount
 *      - يُحدّث topupRequests/{id}.status=approved, reviewedBy, txId
 *  - يُنشئ notifications/{} للمستخدم بقبول الطلب
 *  - يُسجّل في adminLogs
 */

export async function POST(
  request: Request,
  { params }: { params: { requestId: string } }
) {
  const result = await verifyAdminRequest(request, "users.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const requestId = params.requestId;
  if (!requestId) return jsonError("Missing requestId", 400);

  let body: { note?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const note = (body.note || "").trim().slice(0, 300) || null;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  const reqRef = fs.collection("topupRequests").doc(requestId);

  let txData: {
    userId: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    txId: string;
  };

  try {
    txData = await fs.runTransaction(async (tx) => {
      const reqSnap = await tx.get(reqRef);
      if (!reqSnap.exists) throw new Error("الطلب غير موجود");

      const reqData = reqSnap.data() || {};
      if (reqData.status !== "pending") {
        throw new Error(`الطلب ليس قيد المراجعة (الحالة: ${reqData.status})`);
      }

      const userId = reqData.userId as string;
      const amount = Number(reqData.amount) || 0;
      if (amount <= 0) throw new Error("مبلغ غير صالح");

      const userRef = fs.collection("users").doc(userId);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");

      const userData = userSnap.data() || {};
      const balanceBefore = Number(userData.balance) || 0;
      const balanceAfter = balanceBefore + amount;

      // walletTransactions
      const walletTxRef = fs.collection("walletTransactions").doc();
      tx.set(walletTxRef, {
        userId,
        amount,
        type: "credit",
        reason: `شحن رصيد - ${reqData.paymentMethodLabel || reqData.paymentMethod}`,
        balanceAfter,
        createdBy: caller.uid,
        createdByEmail: caller.email,
        metadata: {
          topupRequestId: requestId,
          paymentMethod: reqData.paymentMethod,
          contactNumber: reqData.contactNumber,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      // users update
      tx.update(userRef, {
        balance: balanceAfter,
        walletUpdatedAt: FieldValue.serverTimestamp(),
      });

      // request update
      tx.update(reqRef, {
        status: "approved",
        reviewedBy: caller.uid,
        reviewedByEmail: caller.email,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewNote: note,
        txId: walletTxRef.id,
      });

      return {
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        txId: walletTxRef.id,
      };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشلت الموافقة", 400);
  }

  // Notification (خارج الـtransaction، best-effort)
  try {
    await fs.collection("notifications").add({
      userId: txData.userId,
      type: "wallet_topup_approved",
      title: "تمت الموافقة على طلب الشحن",
      body: `تم إضافة ${txData.amount} BC إلى رصيدك`,
      link: "/profile",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    /* تجاهل - فشل الإشعار لا يُفشل الموافقة */
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "topup_approve",
    targetType: "user",
    targetId: txData.userId,
    reason: note || undefined,
    after: {
      requestId,
      amount: txData.amount,
      balanceBefore: txData.balanceBefore,
      balanceAfter: txData.balanceAfter,
      txId: txData.txId,
    },
  });

  return NextResponse.json({
    ok: true,
    requestId,
    amount: txData.amount,
    balanceAfter: txData.balanceAfter,
  });
}
