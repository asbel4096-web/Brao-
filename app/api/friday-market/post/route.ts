import { NextResponse } from "next/server";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
  jsonError,
} from "@/lib/admin/api-helpers";
import {
  DEFAULT_FRIDAY_SETTINGS,
  FRIDAY_CATEGORY_KEYS,
  FRIDAY_MAX_IMAGES,
  FRIDAY_TITLE_MAX,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";
import { computeMarketState } from "@/lib/friday-market/market-time";

/**
 * POST /api/friday-market/post
 *
 * نشر إعلان في سوق الجمعة. السيرفر هو مصدر الحقيقة لـ:
 *  - هل السوق مفتوح الآن (الجمعة فقط) — لا نثق بتوقيت العميل
 *  - weekKey + weekLabel الصحيحان للجلسة الحالية
 *  - وقت الإنشاء (serverTimestamp) والحالة (active)
 *
 * Body: { title, price, phone, whatsapp?, category, city?, images: string[] }
 * Header: Authorization: Bearer <idToken>
 */

const MAX_PER_SESSION = 20; // حدّ ناعم لكل مستخدم في جلسة الجمعة الواحدة

export async function POST(request: Request) {
  // 1) تحقّق المصادقة (مستخدم عادي)
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!idToken) return jsonError("يجب تسجيل الدخول للنشر", 401);

  let app;
  try {
    app = getAdminApp();
  } catch (e: any) {
    return jsonError(e?.message || "Admin SDK not configured", 500);
  }
  const fs = getAdminFirestore(app);

  let uid: string;
  let tokenName = "";
  try {
    const decoded = await getAdminAuth(app).verifyIdToken(idToken);
    uid = decoded.uid;
    tokenName = (decoded as any).name || "";
  } catch {
    return jsonError("جلسة غير صالحة، أعد تسجيل الدخول", 401);
  }

  // 2) المستخدم غير محظور
  const userSnap = await fs.collection("users").doc(uid).get();
  if (!userSnap.exists) return jsonError("المستخدم غير موجود", 404);
  const userData = userSnap.data() || {};
  if (userData.banned === true || userData.deleted === true) {
    return jsonError("لا يمكنك النشر حالياً", 403);
  }

  // 3) إعدادات السوق + التحقّق أنه مفتوح الآن (server time)
  const cfgSnap = await fs.collection("config").doc("fridayMarket").get();
  const settings: FridayMarketSettings = cfgSnap.exists
    ? { ...DEFAULT_FRIDAY_SETTINGS, ...(cfgSnap.data() as any) }
    : DEFAULT_FRIDAY_SETTINGS;

  if (settings.enabled === false) {
    return jsonError("سوق الجمعة غير مفعّل حالياً", 403);
  }

  const state = computeMarketState(settings, Date.now());
  if (!state.isOpen) {
    return jsonError(
      "السوق مغلق الآن — يفتح يوم الجمعة فقط. عُد عند فتح السوق.",
      403
    );
  }

  // 4) قراءة وتنقية المدخلات
  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonError("بيانات غير صالحة", 400);
  }

  const title = String(body.title || "").trim().slice(0, FRIDAY_TITLE_MAX);
  const price = Number(body.price);
  const phone = String(body.phone || "").trim().slice(0, 20);
  const whatsapp = body.whatsapp
    ? String(body.whatsapp).trim().slice(0, 20)
    : "";
  const city = body.city ? String(body.city).trim().slice(0, 40) : "";
  const category = String(body.category || "");
  const images: string[] = Array.isArray(body.images)
    ? body.images
        .filter((u: any) => typeof u === "string" && u.startsWith("http"))
        .slice(0, FRIDAY_MAX_IMAGES)
    : [];

  if (title.length < 2) return jsonError("اكتب اسماً مختصراً للمنتج", 400);
  if (!isFinite(price) || price < 0) return jsonError("أدخل سعراً صحيحاً", 400);
  if (phone.length < 6) return jsonError("أدخل رقم هاتف صحيح", 400);
  if (!FRIDAY_CATEGORY_KEYS.includes(category as any)) {
    return jsonError("اختر القسم", 400);
  }
  if (images.length < 1) return jsonError("أضف صورة واحدة على الأقل", 400);

  // 5) حدّ ناعم لكل مستخدم في الجلسة
  try {
    const mine = await fs
      .collection("fridayMarket")
      .where("ownerId", "==", uid)
      .where("weekKey", "==", state.weekKey)
      .where("status", "==", "active")
      .count()
      .get();
    if ((mine.data().count || 0) >= MAX_PER_SESSION) {
      return jsonError(
        `بلغت الحدّ الأقصى للنشر في سوق هذا الأسبوع (${MAX_PER_SESSION})`,
        429
      );
    }
  } catch {
    // count() قد يفشل لو الفهرس غير متاح — نتجاوز الحدّ الناعم بدل تعطيل النشر
  }

  // 6) الكتابة
  const ownerName =
    userData.businessName ||
    userData.dealerName ||
    userData.name ||
    tokenName ||
    "مستخدم";

  const docRef = fs.collection("fridayMarket").doc();
  const now = FieldValue.serverTimestamp();

  try {
    const batch = fs.batch();
    batch.set(docRef, {
      title,
      price,
      phone,
      whatsapp: whatsapp || null,
      city: city || null,
      category,
      images,
      ownerId: uid,
      ownerName,
      ownerPhotoURL: userData.photoURL || null,
      weekKey: state.weekKey,
      weekLabel: state.weekLabel,
      status: "active",
      featured: false,
      views: 0,
      createdAt: now,
      updatedAt: now,
    });

    // ملخّص الجلسة (للأرشيف + العدّاد)
    const weekRef = fs.collection("fridayMarketWeeks").doc(state.weekKey);
    batch.set(
      weekRef,
      {
        label: state.weekLabel,
        fridayISO: state.fridayISO,
        count: FieldValue.increment(1),
        updatedAt: now,
        createdAt: now,
      },
      { merge: true }
    );

    await batch.commit();
  } catch (e: any) {
    return jsonError(e?.message || "تعذّر النشر، حاول مجدداً", 500);
  }

  return NextResponse.json({ ok: true, id: docRef.id, weekKey: state.weekKey });
}
