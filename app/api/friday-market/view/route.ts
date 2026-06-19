import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";

/**
 * POST /api/friday-market/view
 *
 * Body: { itemId: string, guestKey?: string }
 *
 * يزيد عدّاد المشاهدات لإعلان سوق الجمعة مرّة واحدة لكل مستخدم/زائر
 * (dedup عبر مستند في fridayMarket/{id}/viewers/{viewerKey}). كل الكتابة
 * عبر Admin SDK → لا تلاعب من الواجهة. لا يُحتسب صاحب الإعلان.
 */

async function getUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(m[1]);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const itemId = String(body.itemId || "").trim();
    const guestKey = String(body.guestKey || "").trim().slice(0, 64);
    if (!itemId) return jsonError("طلب غير صحيح", 400);

    getAdminApp();
    const db = getAdminFirestore();

    const uid = await getUid(req);
    const itemRef = db.collection("fridayMarket").doc(itemId);
    const snap = await itemRef.get();
    if (!snap.exists) return jsonError("الإعلان غير موجود", 404);

    const item = snap.data() || {};
    if (uid && item.ownerId === uid) {
      return Response.json({ success: true, skipped: "owner" });
    }

    const viewerKey = uid || (guestKey ? `g_${guestKey}` : null);
    if (!viewerKey) {
      return Response.json({ success: true, skipped: "no_key" });
    }

    const viewerRef = itemRef.collection("viewers").doc(viewerKey);
    const result = await db.runTransaction(async (tx) => {
      const v = await tx.get(viewerRef);
      if (v.exists) return { counted: false };
      tx.set(viewerRef, { at: FieldValue.serverTimestamp() });
      tx.update(itemRef, { views: FieldValue.increment(1) });
      return { counted: true };
    });

    return Response.json({ success: true, counted: result.counted });
  } catch (err: any) {
    return jsonError(err?.message || "فشل التسجيل", 500);
  }
}
