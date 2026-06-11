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
 * POST /api/admin/users/[uid]/delete
 *
 * Soft delete:
 *  - users/{uid}.deleted = true
 *  - users/{uid}.deletedAt/deletedBy
 *  - users/{uid}.banned = true (يمنع تسجيل الدخول/أي تفاعل)
 *  - أرشفة كل إعلانات المستخدم (إخفاء)
 *
 * المستخدم لا يُحذف من Firebase Auth ولا من Firestore - يمكن استرجاعه
 * يدوياً من Firebase Console عند الحاجة.
 *
 * الصلاحية: users.delete (admin + super_admin)
 * حماية:
 *  - لا يحذف نفسه
 *  - لا يحذف super_admin (إلا من super_admin)
 */

export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  const result = await verifyAdminRequest(request, "users.delete");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const targetUid = params.uid;
  if (!targetUid) return jsonError("Missing user id", 400);

  if (caller.uid === targetUid) {
    return jsonError("لا يمكنك حذف نفسك", 400);
  }

  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* optional */
  }
  const reason = (body.reason || "").trim().slice(0, 500) || null;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const targetRef = fs.collection("users").doc(targetUid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) {
    return jsonError("المستخدم غير موجود", 404);
  }
  const targetData = targetDoc.data() || {};

  if (targetData.role === "super_admin" && caller.role !== "super_admin") {
    return jsonError("لا يمكن حذف مدير عام", 403);
  }

  const batch = fs.batch();

  batch.update(targetRef, {
    deleted: true,
    deletedAt: FieldValue.serverTimestamp(),
    deletedBy: caller.uid,
    deleteReason: reason,
    // نُفعّل الحظر أيضاً كي لا يستطيع الدخول أو التفاعل
    banned: true,
    bannedAt: FieldValue.serverTimestamp(),
    bannedBy: caller.uid,
    banReason: reason || "تم حذف الحساب",
  });

  // أرشفة كل إعلاناته المنشورة
  const listingsSnap = await fs
    .collection("listings")
    .where("ownerId", "==", targetUid)
    .get();

  let archivedCount = 0;
  for (const doc of listingsSnap.docs) {
    if (archivedCount >= 400) break;
    const data = doc.data();
    if (data.status === "approved" || data.status === "pending") {
      batch.update(doc.ref, {
        status: "archived",
        archivedReason: "user_deleted",
        archivedAt: FieldValue.serverTimestamp(),
        originalStatus: data.status,
      });
      archivedCount++;
    }
  }

  try {
    await batch.commit();
  } catch (err: any) {
    return jsonError("فشل الحذف: " + (err?.message || ""), 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "user_delete",
    targetType: "user",
    targetId: targetUid,
    reason: reason || undefined,
    before: {
      name: targetData.name,
      email: targetData.email,
      role: targetData.role,
      deleted: targetData.deleted === true,
    },
    after: { deleted: true, archivedListings: archivedCount },
  });

  return NextResponse.json({
    ok: true,
    deletedUid: targetUid,
    archivedListings: archivedCount,
  });
}
