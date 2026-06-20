import { NextResponse } from "next/server";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
  jsonError,
} from "@/lib/admin/api-helpers";

/**
 * POST /api/friday-market/delete
 *
 * يحذف عرض سوق الجمعة. مسموح لصاحب العرض أو للأدمن. يُنقص عدّاد الجلسة.
 * Body: { itemId: string }   |   Header: Authorization: Bearer <idToken>
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!idToken) return jsonError("يجب تسجيل الدخول", 401);

  let app;
  try {
    app = getAdminApp();
  } catch (e: any) {
    return jsonError(e?.message || "Admin SDK not configured", 500);
  }
  const fs = getAdminFirestore(app);

  let uid: string;
  try {
    const decoded = await getAdminAuth(app).verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return jsonError("جلسة غير صالحة", 401);
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة", 400);
  }
  const itemId = String(body.itemId || "").trim();
  if (!itemId) return jsonError("معرّف العرض مفقود", 400);

  const ref = fs.collection("fridayMarket").doc(itemId);
  const snap = await ref.get();
  if (!snap.exists) return jsonError("العرض غير موجود", 404);
  const data = snap.data() || {};

  // تحقّق الملكية أو صلاحية الأدمن
  const isOwner = data.ownerId === uid;
  let isAdmin = false;
  if (!isOwner) {
    const userSnap = await fs.collection("users").doc(uid).get();
    isAdmin = userSnap.exists && userSnap.data()?.isAdmin === true;
  }
  if (!isOwner && !isAdmin) {
    return jsonError("لا تملك صلاحية حذف هذا العرض", 403);
  }

  try {
    await ref.delete();
    if (data.weekKey) {
      await fs
        .collection("fridayMarketWeeks")
        .doc(String(data.weekKey))
        .set({ count: FieldValue.increment(-1) }, { merge: true });
    }
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر الحذف", 500);
  }

  return NextResponse.json({ ok: true });
}
