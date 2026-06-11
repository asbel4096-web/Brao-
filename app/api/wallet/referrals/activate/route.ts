import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import { generateReferralCode } from "@/lib/wallet/referrals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/wallet/referrals/activate
 * Auth: المستخدم نفسه
 * (no body)
 *
 * يفعّل نظام الإحالات للمستخدم:
 *  1. يفحص feature flag "referrals" مفعَّل
 *  2. لو المستخدم لديه referralCode → لا شيء (idempotent)
 *  3. يُولّد كود فريد (يحاول 5 مرات في حال collision)
 *  4. يكتب users/{uid}.referralCode + referralActivatedAt
 *
 * الفرادة: نفحص بـquery أن لا يوجد مستخدم آخر بنفس الكود.
 */

const MAX_ATTEMPTS = 5;

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

  // Feature flag check
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

  // Idempotent
  if (userData.referralCode) {
    return NextResponse.json({
      ok: true,
      code: userData.referralCode,
      alreadyActivated: true,
    });
  }

  // فحص الحساب
  if (userData.banned === true || userData.disabled === true) {
    return jsonError("الحساب موقوف", 403);
  }

  // Generate unique code
  const displayName = userData.businessName || userData.name || userData.email;
  let code: string | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = generateReferralCode(displayName);
    // فحص الفرادة
    const existing = await fs
      .collection("users")
      .where("referralCode", "==", candidate)
      .limit(1)
      .get();
    if (existing.empty) {
      code = candidate;
      break;
    }
  }

  if (!code) {
    return jsonError("تعذّر توليد كود فريد، حاولي مجدداً", 500);
  }

  // كتابة الكود
  await userRef.update({
    referralCode: code,
    referralActivatedAt: FieldValue.serverTimestamp(),
    referralsCount: userData.referralsCount || 0,
  });

  return NextResponse.json({
    ok: true,
    code,
    alreadyActivated: false,
  });
}
