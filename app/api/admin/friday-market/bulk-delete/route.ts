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
 * POST /api/admin/friday-market/bulk-delete
 *
 * وضعان:
 *  1) { ids: string[] }                      → حذف إعلانات محدّدة
 *  2) { weekKey, status?, all: true }        → حذف كل إعلانات جلسة (بحالة معيّنة)
 *
 * يحذف على دفعات (batch) ويُنقص عدّاد الجلسة المقابل. يتطلّب صلاحية أدمن.
 */

const PERMISSION = "listings.feature";
const CHUNK = 400;

export async function POST(request: Request) {
  const res = await verifyAdminRequest(request, PERMISSION);
  if (res instanceof NextResponse) return res;
  const caller = res;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة", 400);
  }

  const fs = getAdminFirestore(getAdminApp());

  // ====== الوضع 2: حذف كل إعلانات جلسة ======
  if (body.all === true && body.weekKey) {
    const weekKey = String(body.weekKey);
    const status = body.status ? String(body.status) : "active";
    let deleted = 0;

    try {
      // نحذف على دفعات حتى تفرغ
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const snap = await fs
          .collection("fridayMarket")
          .where("weekKey", "==", weekKey)
          .where("status", "==", status)
          .limit(CHUNK)
          .get();
        if (snap.empty) break;

        const batch = fs.batch();
        snap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
        deleted += snap.size;
        if (snap.size < CHUNK) break;
      }

      // تحديث عدّاد الجلسة
      if (deleted > 0) {
        await fs
          .collection("fridayMarketWeeks")
          .doc(weekKey)
          .set({ count: FieldValue.increment(-deleted) }, { merge: true });
      }
    } catch (e: any) {
      return jsonError(e?.message || "تعذّر الحذف", 500);
    }

    await logAdminAction({
      adminUid: caller.uid,
      action: "friday_market_bulk_delete_all",
      targetType: "fridayMarketWeek",
      targetId: weekKey,
      after: { status, deleted },
    });

    return NextResponse.json({ ok: true, deleted });
  }

  // ====== الوضع 1: حذف معرّفات محدّدة ======
  const ids: string[] = Array.isArray(body.ids)
    ? body.ids.filter((x: any) => typeof x === "string").slice(0, 1000)
    : [];
  if (ids.length === 0) return jsonError("لم تُحدَّد أي إعلانات", 400);

  // نقرأ الوثائق لمعرفة weekKey لكل إعلان (لضبط العدّادات)
  const perWeek: Record<string, number> = {};
  let deleted = 0;

  try {
    for (let i = 0; i < ids.length; i += CHUNK) {
      const chunk = ids.slice(i, i + CHUNK);
      const refs = chunk.map((id) => fs.collection("fridayMarket").doc(id));
      const snaps = await fs.getAll(...refs);

      const batch = fs.batch();
      snaps.forEach((s) => {
        if (!s.exists) return;
        const wk = (s.data() || {}).weekKey;
        if (wk) perWeek[wk] = (perWeek[wk] || 0) + 1;
        batch.delete(s.ref);
        deleted++;
      });
      await batch.commit();
    }

    // إنقاص عدّادات الجلسات
    const weekBatch = fs.batch();
    for (const [wk, n] of Object.entries(perWeek)) {
      weekBatch.set(
        fs.collection("fridayMarketWeeks").doc(wk),
        { count: FieldValue.increment(-n) },
        { merge: true }
      );
    }
    await weekBatch.commit();
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر الحذف", 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "friday_market_bulk_delete",
    targetType: "fridayMarket",
    targetId: `${deleted} items`,
    after: { ids: ids.slice(0, 50), deleted },
  });

  return NextResponse.json({ ok: true, deleted });
}
