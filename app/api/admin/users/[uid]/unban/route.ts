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
export const maxDuration = 30;

/**
 * POST /api/admin/users/[uid]/unban
 *
 * يلغي الحظر + يستعيد إعلانات المستخدم المؤرشفة بسبب الحظر.
 * idempotent: يعمل حتى لو لم يكن المستخدم محظوراً.
 *
 * الصلاحية: users.ban
 */
export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  const result = await verifyAdminRequest(request, "users.ban");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const targetUid = params.uid;
  if (!targetUid) return jsonError("Missing user id", 400);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const targetRef = fs.collection("users").doc(targetUid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) {
    return jsonError("المستخدم غير موجود", 404);
  }
  const targetData = targetDoc.data() || {};

  // إلغاء الحظر
  const batch = fs.batch();
  batch.update(targetRef, {
    banned: false,
    bannedAt: FieldValue.delete(),
    bannedBy: FieldValue.delete(),
    banReason: FieldValue.delete(),
  });

  // استعادة الإعلانات المؤرشفة بسبب الحظر
  const archivedSnap = await fs
    .collection("listings")
    .where("ownerId", "==", targetUid)
    .where("status", "==", "archived")
    .where("archivedReason", "==", "user_banned")
    .get();

  let restoredCount = 0;
  for (const doc of archivedSnap.docs) {
    if (restoredCount >= 400) break;
    const data = doc.data();
    // نستعيد للـstatus الأصلي (عادة "approved")
    batch.update(doc.ref, {
      status: data.originalStatus || "approved",
      archivedReason: FieldValue.delete(),
      archivedAt: FieldValue.delete(),
      originalStatus: FieldValue.delete(),
    });
    restoredCount++;
  }

  try {
    await batch.commit();
  } catch (err: any) {
    return jsonError("فشل إلغاء الحظر: " + (err?.message || ""), 500);
  }

  // باقي الـlistings لو > 400
  if (archivedSnap.size > 400) {
    const remaining = archivedSnap.docs.slice(400);
    for (let i = 0; i < remaining.length; i += 400) {
      const chunk = remaining.slice(i, i + 400);
      const extra = fs.batch();
      for (const doc of chunk) {
        const data = doc.data();
        extra.update(doc.ref, {
          status: data.originalStatus || "approved",
          archivedReason: FieldValue.delete(),
          archivedAt: FieldValue.delete(),
          originalStatus: FieldValue.delete(),
        });
        restoredCount++;
      }
      try {
        await extra.commit();
      } catch {
        /* ignore */
      }
    }
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "user_unban",
    targetType: "user",
    targetId: targetUid,
    before: {
      banned: targetData.banned === true,
      banReason: targetData.banReason,
    },
    after: { banned: false, restoredListings: restoredCount },
  });

  return NextResponse.json({
    ok: true,
    unbannedUid: targetUid,
    restoredListings: restoredCount,
  });
}
