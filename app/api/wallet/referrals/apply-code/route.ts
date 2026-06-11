import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import { isValidCodeFormat } from "@/lib/wallet/referrals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/wallet/referrals/apply-code
 * Auth: المستخدم نفسه
 * body: { code: string }
 *
 * يربط مستخدماً جديداً بكود إحالة:
 *  1. فحوص:
 *     - feature flag مفعَّل
 *     - شكل الكود valid
 *     - المستخدم ليس مربوطاً بـreferredBy سابقاً (idempotent)
 *     - الكود موجود في users/* (نبحث referralCode)
 *     - المستخدم ≠ المُحيل (self-referral)
 *     - الحساب جديد (createdAt > now - 7 أيام) — anti-abuse
 *  2. كتابة:
 *     - users/{uid}.referredBy = code, referredByUid = referrerUid
 *     - referrals/{newDoc} بحالة "pending"
 *
 * المكافأة لا تُصرف هنا - تُصرف في /claim عند نشر إعلان معتمد.
 */

const NEW_ACCOUNT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 أيام

export async function POST(request: Request) {
  // Auth
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonError("Unauthorized", 401);
  }
  const idToken = authHeader.slice(7);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  let decoded;
  try {
    decoded = await getAuth(app).verifyIdToken(idToken);
  } catch {
    return jsonError("Invalid token", 401);
  }
  const uid = decoded.uid;

  // Body
  let body: { code?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const code = (body.code || "").trim().toUpperCase();
  if (!isValidCodeFormat(code)) {
    return jsonError("شكل الكود غير صالح", 400);
  }

  // Feature flag
  const flagSnap = await fs.collection("featureFlags").doc("referrals").get();
  if (!flagSnap.exists || flagSnap.data()?.enabled !== true) {
    return jsonError("نظام الإحالات غير مفعَّل حالياً", 403);
  }

  // Get user
  const userRef = fs.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return jsonError("الحساب غير موجود", 404);
  }

  const userData = userSnap.data() || {};

  // Idempotent: لو مربوط بكود سابقاً
  if (userData.referredBy) {
    return NextResponse.json({
      ok: true,
      alreadyApplied: true,
      referredBy: userData.referredBy,
    });
  }

  // فحص: حساب جديد فقط (anti-abuse)
  const createdMs = userData.createdAt?.toMillis?.() || 0;
  if (createdMs > 0 && Date.now() - createdMs > NEW_ACCOUNT_WINDOW_MS) {
    return jsonError("كود الإحالة يُطبَّق فقط على الحسابات الجديدة (أقل من 7 أيام)", 400);
  }

  // البحث عن المُحيل
  const referrerSnap = await fs
    .collection("users")
    .where("referralCode", "==", code)
    .limit(1)
    .get();

  if (referrerSnap.empty) {
    return jsonError("كود الإحالة غير صالح", 404);
  }

  const referrerDoc = referrerSnap.docs[0];
  const referrerUid = referrerDoc.id;
  const referrerData = referrerDoc.data();

  // Self-referral
  if (referrerUid === uid) {
    return jsonError("لا يمكنك دعوة نفسك", 400);
  }

  // المُحيل محظور؟
  if (referrerData.banned === true || referrerData.disabled === true) {
    return jsonError("المُحيل غير متاح", 400);
  }

  // كتابة: ربط + إنشاء referral doc
  const referralRef = fs.collection("referrals").doc();

  await fs.runTransaction(async (tx) => {
    // إعادة قراءة لضمان atomicity
    const fresh = await tx.get(userRef);
    if (fresh.data()?.referredBy) {
      // race: مستخدم آخر طبّق الكود في نفس الوقت
      throw new Error("already_applied");
    }

    tx.update(userRef, {
      referredBy: code,
      referredByUid: referrerUid,
    });

    tx.set(referralRef, {
      referrerUid,
      referrerEmail: referrerData.email || "",
      referredUid: uid,
      referredEmail: userData.email || "",
      code,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  return NextResponse.json({
    ok: true,
    referralId: referralRef.id,
    referrerUid,
  });
}
