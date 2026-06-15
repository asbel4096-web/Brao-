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
 * POST /api/admin/users/[uid]/ban
 *
 * body: { reason?: string }
 *
 * تأثيرات:
 *  1. users/{uid}.banned = true
 *  2. users/{uid}.bannedAt/bannedBy/banReason
 *  3. كل إعلاناته approved → status="archived" + archivedReason="user_banned"
 *     (نُخفيها من الصفحات العامة دون حذف نهائي - يمكن استرجاعها عند الـunban)
 *  4. log في adminLogs
 *
 * الصلاحية المطلوبة: users.ban
 * الحماية الإضافية:
 *  - لا يستطيع admin حظر super_admin
 *  - لا يستطيع المستخدم حظر نفسه (تجنّب lockout)
 */
export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  // 1) Auth + permission
  const result = await verifyAdminRequest(request, "users.ban");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const targetUid = params.uid;
  if (!targetUid) return jsonError("Missing user id", 400);

  // 2) قراءة body
  let body: { reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* body فارغ - مسموح */
  }
  const reason = (body.reason || "").trim().slice(0, 500) || null;

  // 3) Self-ban guard
  if (caller.uid === targetUid) {
    return jsonError("لا يمكنك حظر نفسك", 400);
  }

  // 4) قراءة الـtarget
  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const targetRef = fs.collection("users").doc(targetUid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) {
    return jsonError("المستخدم غير موجود", 404);
  }
  const targetData = targetDoc.data() || {};

  // 5) حماية: لا حظر super_admin إلا من super_admin آخر
  if (targetData.role === "super_admin" && caller.role !== "super_admin") {
    return jsonError("لا يمكن حظر مدير عام", 403);
  }

  // إذا الـtarget محظور أصلاً، نتعامل كـidempotent (نُحدّث reason فقط)
  const wasAlreadyBanned = targetData.banned === true;

  // 6) تنفيذ التحديثات في batch
  const batch = fs.batch();

  batch.update(targetRef, {
    banned: true,
    bannedAt: FieldValue.serverTimestamp(),
    bannedBy: caller.uid,
    banReason: reason,
  });

  // 7) أرشفة إعلانات المستخدم المعتمدة (إخفاء من الصفحات العامة)
  // نحتفظ بـstatus الأصلي في originalStatus لاسترجاعه عند الـunban.
  const listingsSnap = await fs
    .collection("listings")
    .where("ownerId", "==", targetUid)
    .where("status", "==", "approved")
    .get();

  let archivedCount = 0;
  for (const doc of listingsSnap.docs) {
    // Firestore batch محدود بـ500 - عدد إعلانات شخص واحد عادة أقل بكثير،
    // لكن نحترس: لو تجاوزنا 400، نتوقّف ونُكمل في batch ثانٍ.
    if (archivedCount >= 400) break;
    batch.update(doc.ref, {
      status: "archived",
      archivedReason: "user_banned",
      archivedAt: FieldValue.serverTimestamp(),
      // نحفظ الـoriginal كي يمكن استعادته
      originalStatus: "approved",
    });
    archivedCount++;
  }

  try {
    await batch.commit();
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[ban] batch failed:", err?.message);
    return jsonError("فشل تنفيذ الحظر: " + (err?.message || ""), 500);
  }

  // 8) لو يوجد إعلانات أكثر من 400، نُكمل في batches إضافية
  // (نادر، لكن نحترس لحالات استثنائية)
  if (listingsSnap.size > 400) {
    const remaining = listingsSnap.docs.slice(400);
    for (let i = 0; i < remaining.length; i += 400) {
      const chunk = remaining.slice(i, i + 400);
      const extra = fs.batch();
      for (const doc of chunk) {
        extra.update(doc.ref, {
          status: "archived",
          archivedReason: "user_banned",
          archivedAt: FieldValue.serverTimestamp(),
          originalStatus: "approved",
        });
        archivedCount++;
      }
      try {
        await extra.commit();
      } catch {
        /* أخطاء جزئية - نُكمل */
      }
    }
  }

  // 9) Log
  await logAdminAction({
    adminUid: caller.uid,
    action: "user_ban",
    targetType: "user",
    targetId: targetUid,
    reason: reason || undefined,
    before: {
      banned: wasAlreadyBanned,
      name: targetData.name,
      email: targetData.email,
    },
    after: { banned: true, archivedListings: archivedCount },
  });

  return NextResponse.json({
    ok: true,
    bannedUid: targetUid,
    archivedListings: archivedCount,
  });
}
