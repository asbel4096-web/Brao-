import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
  jsonError,
  verifyAdminRequest,
  logAdminAction,
} from "@/lib/admin/api-helpers";

/**
 * PATCH  /api/admin/friday-market/[itemId]   → إجراء على إعلان
 *    Body: { action: "feature" | "unfeature" | "archive" | "restore" }
 * DELETE /api/admin/friday-market/[itemId]   → حذف نهائي
 *
 * كل العمليات تتطلّب صلاحية أدمن. تُسجَّل في adminLogs.
 */

const PERMISSION = "listings.feature";

export async function PATCH(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const res = await verifyAdminRequest(request, PERMISSION);
  if (res instanceof NextResponse) return res;
  const caller = res;

  const itemId = params.itemId;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة", 400);
  }
  const action = String(body.action || "");

  const fs = getAdminFirestore(getAdminApp());
  const ref = fs.collection("fridayMarket").doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) return jsonError("الإعلان غير موجود", 404);
  const before = snap.data() || {};

  const patch: Record<string, any> = {
    updatedAt: FieldValue.serverTimestamp(),
  };

  switch (action) {
    case "feature":
      patch.featured = true;
      patch.featuredAt = FieldValue.serverTimestamp();
      patch.featuredBy = caller.uid;
      break;
    case "unfeature":
      patch.featured = false;
      patch.featuredAt = null;
      break;
    case "archive":
      patch.status = "archived";
      break;
    case "restore":
      patch.status = "active";
      break;
    default:
      return jsonError("إجراء غير معروف", 400);
  }

  try {
    await ref.set(patch, { merge: true });
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر تنفيذ الإجراء", 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: `friday_market_${action}`,
    targetType: "fridayMarket",
    targetId: itemId,
    before,
    after: patch,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: { itemId: string } }
) {
  const res = await verifyAdminRequest(request, PERMISSION);
  if (res instanceof NextResponse) return res;
  const caller = res;

  const itemId = params.itemId;
  const fs = getAdminFirestore(getAdminApp());
  const ref = fs.collection("fridayMarket").doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) return jsonError("الإعلان غير موجود", 404);
  const before = snap.data() || {};

  try {
    await ref.delete();
    // إنقاص عدّاد الجلسة (لا ننزل تحت الصفر منطقياً، increment(-1) كافٍ)
    if (before.weekKey) {
      await fs
        .collection("fridayMarketWeeks")
        .doc(String(before.weekKey))
        .set({ count: FieldValue.increment(-1) }, { merge: true });
    }
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر الحذف", 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "friday_market_delete",
    targetType: "fridayMarket",
    targetId: itemId,
    before,
  });

  return NextResponse.json({ ok: true });
}
