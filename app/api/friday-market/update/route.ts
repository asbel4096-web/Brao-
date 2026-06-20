import { NextResponse } from "next/server";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
  jsonError,
} from "@/lib/admin/api-helpers";
import {
  FRIDAY_CATEGORY_KEYS,
  FRIDAY_TITLE_MAX,
} from "@/lib/friday-market/types";
import { matchBannedWords, type BannedWordLike } from "@/lib/moderation/match-banned";

/**
 * POST /api/friday-market/update
 *
 * يعدّل عرض سوق الجمعة (لصاحبه فقط). الحقول القابلة للتعديل:
 *   title, price, phone, whatsapp, category
 * (لا يُسمح بتغيير weekKey / status / featured / الصور هنا.)
 *
 * Body: { itemId, title, price, phone, whatsapp?, category }
 * Header: Authorization: Bearer <idToken>
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

  if (data.ownerId !== uid) {
    return jsonError("لا تملك صلاحية تعديل هذا العرض", 403);
  }

  // تنقية المدخلات
  const title = String(body.title || "").trim().slice(0, FRIDAY_TITLE_MAX);
  const price = Number(body.price);
  const phone = String(body.phone || "").trim().slice(0, 20);
  const whatsapp = body.whatsapp ? String(body.whatsapp).trim().slice(0, 20) : "";
  const category = String(body.category || "");

  if (title.length < 2) return jsonError("اكتب اسماً مختصراً للمنتج", 400);
  if (!isFinite(price) || price < 0) return jsonError("أدخل سعراً صحيحاً", 400);
  if (phone.length < 6) return jsonError("أدخل رقم هاتف صحيح", 400);
  if (!FRIDAY_CATEGORY_KEYS.includes(category as any)) {
    return jsonError("اختر القسم", 400);
  }

  // فحص الكلمات المحظورة على الاسم
  try {
    const bwSnap = await fs.collection("bannedWords").get();
    const words: BannedWordLike[] = bwSnap.docs.map((d) => {
      const w = d.data() || {};
      return { word: String(w.word || ""), severity: w.severity === "warn" ? "warn" : "block" };
    });
    const hit = matchBannedWords(title, words);
    if (hit && hit.severity === "block") {
      return jsonError(`الاسم يحوي كلمة غير مسموحة: "${hit.matchedWord}"`, 400);
    }
  } catch {
    /* تجاهل فشل القراءة */
  }

  try {
    await ref.set(
      {
        title,
        price,
        phone,
        whatsapp: whatsapp || null,
        category,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر حفظ التعديل", 500);
  }

  return NextResponse.json({ ok: true });
}
