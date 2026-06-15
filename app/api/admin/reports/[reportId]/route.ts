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
 * POST /api/admin/reports/[reportId]
 *
 * body: {
 *   resolution: "dismiss" | "warn" | "delete_target" | "ban_target_owner",
 *   note?: string
 * }
 *
 * تأثيرات حسب resolution:
 *  - dismiss: status="dismissed"، لا إجراء على الـtarget
 *  - warn: status="resolved"، نُسجّل تحذير (لا تنفيذ تلقائي - مرحلة قادمة)
 *  - delete_target: حذف/إخفاء الـtarget (إعلان→archived، تعليق→deleted)
 *  - ban_target_owner: حظر مالك المحتوى (يعيد توجيه لـban API منطقياً)
 *
 * كل الإجراءات تُكتب في adminLogs.
 *
 * الصلاحية: reports.handle
 */

type Resolution = "dismiss" | "warn" | "delete_target" | "ban_target_owner";
const VALID_RESOLUTIONS: Resolution[] = [
  "dismiss",
  "warn",
  "delete_target",
  "ban_target_owner",
];

export async function POST(
  request: Request,
  { params }: { params: { reportId: string } }
) {
  const result = await verifyAdminRequest(request, "reports.handle");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const reportId = params.reportId;
  if (!reportId) return jsonError("Missing report id", 400);

  let body: { resolution?: string; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const resolution = body.resolution as Resolution;
  if (!VALID_RESOLUTIONS.includes(resolution)) {
    return jsonError(
      `Invalid resolution. Allowed: ${VALID_RESOLUTIONS.join(", ")}`,
      400
    );
  }
  const note = (body.note || "").trim().slice(0, 500) || null;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  // 1) قراءة البلاغ
  const reportRef = fs.collection("reports").doc(reportId);
  const reportSnap = await reportRef.get();
  if (!reportSnap.exists) return jsonError("البلاغ غير موجود", 404);
  const report = reportSnap.data() as any;

  if (report.status !== "pending" && report.status !== "reviewing") {
    return jsonError("هذا البلاغ تمت معالجته مسبقاً", 400);
  }

  // 2) تنفيذ الـresolution
  let actionLog = "";
  try {
    if (resolution === "delete_target") {
      await deleteTarget(fs, report);
      actionLog = "تم حذف/إخفاء المحتوى";
    } else if (resolution === "ban_target_owner") {
      const ownerId = await getTargetOwner(fs, report);
      if (!ownerId) {
        return jsonError("تعذّر تحديد صاحب المحتوى", 404);
      }
      // حماية: لا حظر self
      if (ownerId === caller.uid) {
        return jsonError("لا يمكنك حظر نفسك", 400);
      }
      await banUser(fs, ownerId, caller.uid, note || "تم تنفيذه من البلاغ");
      actionLog = `تم حظر المستخدم ${ownerId}`;
    } else if (resolution === "warn") {
      // مرحلة لاحقة: notification للمستخدم. الآن نُسجّل فقط.
      actionLog = "تم تسجيل تحذير (لا تنفيذ تلقائي)";
    }
    // dismiss: لا إجراء
  } catch (err: any) {
    return jsonError(
      "فشل تنفيذ الإجراء: " + (err?.message || ""),
      500
    );
  }

  // 3) تحديث البلاغ
  const newStatus = resolution === "dismiss" ? "dismissed" : "resolved";
  await reportRef.update({
    status: newStatus,
    resolution,
    resolutionNote: note,
    handledBy: caller.uid,
    handledByEmail: caller.email,
    handledAt: FieldValue.serverTimestamp(),
  });

  // 4) Log
  await logAdminAction({
    adminUid: caller.uid,
    action: "report_handle",
    targetType: "report",
    targetId: reportId,
    reason: note || undefined,
    before: { status: report.status },
    after: {
      status: newStatus,
      resolution,
      actionLog,
      reportTargetType: report.targetType,
      reportTargetId: report.targetId,
    },
  });

  return NextResponse.json({
    ok: true,
    reportId,
    status: newStatus,
    resolution,
  });
}

/**
 * حذف/إخفاء الـtarget حسب النوع.
 * - listing: status="archived" + archivedReason="reported"
 * - comment: نضع deleted=true (إذا الـcomment له deleted field) أو نحذف نهائياً
 * - user: لا حذف هنا — استخدم ban_target_owner أو user delete API منفصل
 */
async function deleteTarget(fs: any, report: any) {
  if (report.targetType === "listing") {
    const ref = fs.collection("listings").doc(report.targetId);
    const snap = await ref.get();
    if (!snap.exists) return;
    await ref.update({
      status: "archived",
      archivedReason: "reported",
      archivedAt: FieldValue.serverTimestamp(),
      originalStatus: snap.data()?.status || "approved",
    });
  } else if (report.targetType === "comment") {
    // التعليقات في subcollection: listings/{listingId}/comments/{commentId}
    const parentListingId = report.targetMeta?.parentListingId;
    if (!parentListingId) {
      throw new Error("Missing parentListingId for comment");
    }
    const commentRef = fs
      .collection("listings")
      .doc(parentListingId)
      .collection("comments")
      .doc(report.targetId);
    // نحذف التعليق نهائياً (التعليقات صغيرة، لا نحتاج soft delete)
    await commentRef.delete();
  } else if (report.targetType === "user") {
    // للمستخدمين، نستخدم ban (احفظ كـsoft delete منفصل)
    throw new Error(
      "لاتخاذ إجراء على مستخدم، استخدم ban_target_owner أو حذف مباشرة"
    );
  }
}

async function getTargetOwner(fs: any, report: any): Promise<string | null> {
  // 1) من الـmeta لو موجود
  if (report.targetMeta?.ownerId) return report.targetMeta.ownerId;

  // 2) إذا الـtarget user، الـowner = هو نفسه
  if (report.targetType === "user") return report.targetId;

  // 3) جلب من الـdoc
  if (report.targetType === "listing") {
    const snap = await fs.collection("listings").doc(report.targetId).get();
    return snap.exists ? (snap.data()?.ownerId || null) : null;
  }
  if (report.targetType === "comment") {
    const parentId = report.targetMeta?.parentListingId;
    if (!parentId) return null;
    const snap = await fs
      .collection("listings")
      .doc(parentId)
      .collection("comments")
      .doc(report.targetId)
      .get();
    return snap.exists ? (snap.data()?.userId || snap.data()?.authorId || null) : null;
  }
  return null;
}

async function banUser(
  fs: any,
  uid: string,
  bannedByUid: string,
  reason: string
) {
  const ref = fs.collection("users").doc(uid);
  await ref.update({
    banned: true,
    bannedAt: FieldValue.serverTimestamp(),
    bannedBy: bannedByUid,
    banReason: reason,
  });

  // أرشفة الإعلانات
  const listingsSnap = await fs
    .collection("listings")
    .where("ownerId", "==", uid)
    .where("status", "==", "approved")
    .get();

  if (listingsSnap.size === 0) return;
  const batch = fs.batch();
  let count = 0;
  for (const doc of listingsSnap.docs) {
    if (count >= 400) break;
    batch.update(doc.ref, {
      status: "archived",
      archivedReason: "user_banned",
      archivedAt: FieldValue.serverTimestamp(),
      originalStatus: "approved",
    });
    count++;
  }
  await batch.commit();
}
