import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { VERIFICATION_PLANS } from "@/lib/wallet/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/admin/subscriptions/[uid]/grant
 * body: { plan: VerificationPlanKey, days?: number, reason?: string }
 *
 * يمنح أدمن توثيقاً مجاناً لمستخدم.
 *  - لا يخصم BC من الرصيد
 *  - verificationStatus = "granted" (نُفرّق عن "active" للإحصاءات)
 *  - يمدّد إذا كان مشتركاً
 *  - يكتب walletTransactions/{txId} بـamount=0 للـaudit
 *  - يُسجّل في adminLogs
 *
 * days اختياري: لو مرفق، يُستخدم بدل plan.durationDays.
 * مفيد لحالات مثل "أعطه شهرين" بـplan basic.
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

  let body: { plan?: string; days?: number; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const plan = VERIFICATION_PLANS.find((p) => p.key === body.plan);
  if (!plan) {
    return jsonError("Plan غير صالحة", 400);
  }

  const durationDays =
    typeof body.days === "number" && body.days > 0 && body.days <= 730
      ? Math.floor(body.days)
      : plan.durationDays;

  const reason = (body.reason || "").trim().slice(0, 300) || "توثيق مجاني من الأدمن";

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const userRef = fs.collection("users").doc(targetUid);
  const txRef = fs.collection("walletTransactions").doc();

  let res: {
    verifiedUntil: Date;
    balanceBefore: number;
    extended: boolean;
  };

  try {
    res = await fs.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");

      const userData = userSnap.data() || {};
      const currentBalance = Number(userData.balance) || 0;

      const existingUntilMs = userData.verifiedUntil?.toMillis?.();
      const now = Date.now();
      const baseMs = existingUntilMs && existingUntilMs > now ? existingUntilMs : now;
      const newUntilMs = baseMs + durationDays * 24 * 60 * 60 * 1000;
      const newUntil = new Date(newUntilMs);
      const extended = !!(existingUntilMs && existingUntilMs > now);

      // كتابة معاملة بـamount=0 (audit، لا أثر على الرصيد)
      tx.set(txRef, {
        userId: targetUid,
        amount: 0,
        type: "verification",
        reason: `توثيق مجاني (${plan.label}) - ${reason}`,
        balanceAfter: currentBalance,
        createdBy: caller.uid,
        createdByEmail: caller.email,
        metadata: {
          plan: plan.key,
          durationDays,
          granted: true,
          newVerifiedUntil: newUntilMs,
          extended,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      const updates: Record<string, any> = {
        verifiedUntil: newUntil,
        verificationPlan: plan.key,
        verificationStatus: "granted",
      };
      if (!extended) {
        updates.verifiedSince = FieldValue.serverTimestamp();
      }
      tx.update(userRef, updates);

      return {
        verifiedUntil: newUntil,
        balanceBefore: currentBalance,
        extended,
      };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل المنح", 400);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "verification_grant",
    targetType: "user",
    targetId: targetUid,
    reason,
    after: {
      plan: plan.key,
      durationDays,
      verifiedUntil: res.verifiedUntil.toISOString(),
      extended: res.extended,
    },
  });

  return NextResponse.json({
    ok: true,
    plan: plan.key,
    verifiedUntil: res.verifiedUntil.toISOString(),
    extended: res.extended,
  });
}
