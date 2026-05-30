import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import { VERIFICATION_PLANS } from "@/lib/wallet/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/wallet/verification/purchase
 * Auth: المستخدم نفسه (بـidToken)
 * body: { plan: "basic" | "gold" | "vip" | "business" | "annual" }
 *
 * يشتري المستخدم اشتراك توثيق:
 *  1. يفحص feature flag verification_paid مفعَّل
 *  2. يفحص الرصيد كافٍ
 *  3. transactional:
 *     - يخصم BC من الرصيد
 *     - يكتب walletTransactions/{txId}
 *     - يُحدّث user: verifiedUntil, verificationPlan, verificationStatus
 *  4. لو المستخدم لديه اشتراك نشط: يمدّد (إضافة المدة لـverifiedUntil)
 *     غير ذلك: يبدأ من الآن
 *
 * بدون admin permission - المستخدم يدفع من رصيده.
 *
 * حماية:
 *  - rate limit ضمنياً (المستخدم لن يشتري أكثر من مرة بسرعة عملياً)
 *  - رصيد سالب مستحيل (transaction يفحص)
 *  - feature flag يمنع إذا الميزة مغلقة
 */

export async function POST(request: Request) {
  // 1) Auth - المستخدم نفسه
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

  // 2) Validate body
  let body: { plan?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const plan = VERIFICATION_PLANS.find((p) => p.key === body.plan);
  if (!plan) {
    return jsonError(
      `Plan غير صالحة. المتاح: ${VERIFICATION_PLANS.map((p) => p.key).join(", ")}`,
      400
    );
  }

  // 3) Feature flag check
  const flagSnap = await fs.collection("featureFlags").doc("verification_paid").get();
  if (!flagSnap.exists || flagSnap.data()?.enabled !== true) {
    return jsonError("نظام اشتراكات التوثيق غير مفعَّل حالياً", 403);
  }

  // 4) Transaction: خصم + تحديث + إنشاء transaction record
  const userRef = fs.collection("users").doc(uid);
  const txRef = fs.collection("walletTransactions").doc();

  let result: {
    balanceBefore: number;
    balanceAfter: number;
    verifiedUntil: Date;
    extended: boolean;
  };

  try {
    result = await fs.runTransaction(async (tx) => {
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new Error("الحساب غير موجود");
      }

      const userData = userSnap.data() || {};

      // فحص الحساب غير محظور
      if (userData.banned === true || userData.disabled === true) {
        throw new Error("الحساب موقوف، لا يمكن إجراء العملية");
      }

      const currentBalance = Number(userData.balance) || 0;
      if (currentBalance < plan.price) {
        throw new Error(
          `الرصيد غير كافٍ. الحالي: ${currentBalance} BC، المطلوب: ${plan.price} BC`
        );
      }

      // حساب verifiedUntil:
      //  - إن كان مشترك حالياً وله verifiedUntil في المستقبل → نمدّد
      //  - غير ذلك → من الآن
      const existingUntilMs = userData.verifiedUntil?.toMillis?.();
      const now = Date.now();
      const baseMs = existingUntilMs && existingUntilMs > now ? existingUntilMs : now;
      const newUntilMs = baseMs + plan.durationDays * 24 * 60 * 60 * 1000;
      const newUntil = new Date(newUntilMs);
      const extended = existingUntilMs ? existingUntilMs > now : false;

      const newBalance = currentBalance - plan.price;

      // كتابة المعاملة
      tx.set(txRef, {
        userId: uid,
        amount: -plan.price,
        type: "verification",
        reason: extended
          ? `تمديد اشتراك توثيق (${plan.label})`
          : `شراء اشتراك توثيق (${plan.label})`,
        balanceAfter: newBalance,
        createdBy: uid,
        createdByEmail: userData.email || "",
        metadata: {
          plan: plan.key,
          durationDays: plan.durationDays,
          newVerifiedUntil: newUntilMs,
          extended,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      // تحديث المستخدم
      const updates: Record<string, any> = {
        balance: newBalance,
        walletUpdatedAt: FieldValue.serverTimestamp(),
        verifiedUntil: newUntil,
        verificationPlan: plan.key,
        verificationStatus: "active",
      };
      if (!extended) {
        updates.verifiedSince = FieldValue.serverTimestamp();
      }
      tx.update(userRef, updates);

      return {
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        verifiedUntil: newUntil,
        extended,
      };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الشراء", 400);
  }

  return NextResponse.json({
    ok: true,
    plan: plan.key,
    balanceBefore: result.balanceBefore,
    balanceAfter: result.balanceAfter,
    verifiedUntil: result.verifiedUntil.toISOString(),
    extended: result.extended,
  });
}
