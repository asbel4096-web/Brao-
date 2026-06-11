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
 * POST /api/admin/users/[uid]/verify
 * DELETE /api/admin/users/[uid]/verify  (لإلغاء التوثيق)
 *
 * توثيق المستخدم كـ"تاجر/معرض موثَّق".
 * يضع isVerifiedDealer=true + verifiedAt + verifiedBy.
 *
 * الصلاحية: users.verify
 */
export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  return setVerified(request, params.uid, true);
}

export async function DELETE(
  request: Request,
  { params }: { params: { uid: string } }
) {
  return setVerified(request, params.uid, false);
}

async function setVerified(
  request: Request,
  targetUid: string,
  verified: boolean
) {
  const result = await verifyAdminRequest(request, "users.verify");
  if (result instanceof NextResponse) return result;
  const caller = result;

  if (!targetUid) return jsonError("Missing user id", 400);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const targetRef = fs.collection("users").doc(targetUid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) {
    return jsonError("المستخدم غير موجود", 404);
  }
  const targetData = targetDoc.data() || {};

  try {
    if (verified) {
      await targetRef.update({
        isVerifiedDealer: true,
        verifiedAt: FieldValue.serverTimestamp(),
        verifiedBy: caller.uid,
      });
    } else {
      await targetRef.update({
        isVerifiedDealer: false,
        verifiedAt: FieldValue.delete(),
        verifiedBy: FieldValue.delete(),
      });
    }
  } catch (err: any) {
    return jsonError(err?.message || "فشل التحديث", 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: verified ? "user_verify" : "user_unverify",
    targetType: "user",
    targetId: targetUid,
    before: { isVerifiedDealer: targetData.isVerifiedDealer === true },
    after: { isVerifiedDealer: verified },
  });

  return NextResponse.json({ ok: true, verified });
}
