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
 * POST /api/admin/topup/[requestId]/reject
 * body: { reason: string }
 *
 * يرفض طلب شحن:
 *  - يُحدّث status=rejected + reviewNote
 *  - لا يُغيّر الرصيد
 *  - يُرسل إشعاراً للمستخدم بالرفض + السبب
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

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const reason = (body.reason || "").trim();
  if (!reason || reason.length < 3) {
    return jsonError("اكتب سبب الرفض", 400);
  }
  if (reason.length > 300) {
    return jsonError("السبب طويل جداً", 400);
  }

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  const reqRef = fs.collection("topupRequests").doc(requestId);
  const reqSnap = await reqRef.get();
  if (!reqSnap.exists) return jsonError("الطلب غير موجود", 404);

  const reqData = reqSnap.data() || {};
  if (reqData.status !== "pending") {
    return jsonError(`الطلب ليس قيد المراجعة (الحالة: ${reqData.status})`, 400);
  }

  await reqRef.update({
    status: "rejected",
    reviewedBy: caller.uid,
    reviewedByEmail: caller.email,
    reviewedAt: FieldValue.serverTimestamp(),
    reviewNote: reason,
  });

  // Notification
  try {
    await fs.collection("notifications").add({
      userId: reqData.userId,
      type: "wallet_topup_rejected",
      title: "تم رفض طلب الشحن",
      body: `سبب الرفض: ${reason}`,
      link: "/profile",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    /* تجاهل */
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "topup_reject",
    targetType: "user",
    targetId: reqData.userId,
    reason,
    after: { requestId, amount: reqData.amount },
  });

  return NextResponse.json({ ok: true });
}
