import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import {
  MAX_REFERRALS_PER_DAY,
  REFERRAL_REWARD_BC,
} from "@/lib/wallet/referrals";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/wallet/referrals/claim
 * Auth: المستخدم نفسه
 * body: { listingId: string }
 *
 * يُستدعى تلقائياً من client بعد نشر إعلان (أو من admin بعد الاعتماد).
 *
 * المنطق:
 *  1. فحوص feature flag + المستخدم لديه referredBy
 *  2. فحص الإعلان: مُعتمد + ownerId == المستخدم
 *  3. فحص: هذا أول إعلان معتمد له (referralRewardEarned !== true)
 *  4. فحص الـreferral doc موجود وstatus = "pending"
 *  5. Rate limit: المُحيل لم يستلم أكثر من 5 مكافآت اليوم
 *  6. Transaction:
 *     - يضيف 10 BC للطرفين
 *     - يكتب walletTransactions × 2
 *     - يُحدّث referral status = "completed"
 *     - يُحدّث referrer.referralsCount +1
 *     - يُحدّث المُحال referralRewardEarned = true
 *
 * Idempotent: لو استُدعي مرتين، الاستدعاء الثاني يُرجِع alreadyClaimed.
 */

export async function POST(request: Request) {
  // Auth: قد يكون المستخدم نفسه أو الأدمن (عند الاعتماد)
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
  const callerUid = decoded.uid;

  // Body
  let body: { listingId?: string; uid?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const listingId = (body.listingId || "").trim();
  if (!listingId) {
    return jsonError("Missing listingId", 400);
  }

  // المستخدم المُستهدَف: لو uid مُمرَّر، نتحقّق أن المُتصِل أدمن
  let targetUid = callerUid;
  if (body.uid && body.uid !== callerUid) {
    // Admin call - فحص الصلاحيات
    const callerSnap = await fs.collection("users").doc(callerUid).get();
    const callerData = callerSnap.data() || {};
    const isAdmin =
      callerData.role === "super_admin" ||
      callerData.role === "admin" ||
      callerData.isAdmin === true;
    if (!isAdmin) {
      return jsonError("غير مصرَّح", 403);
    }
    targetUid = body.uid;
  }

  const uid = targetUid;

  // Feature flag
  const flagSnap = await fs.collection("featureFlags").doc("referrals").get();
  if (!flagSnap.exists || flagSnap.data()?.enabled !== true) {
    // الـflag مغلق → نُرجع ok بدون مكافأة (لا نُفشل النشر)
    return NextResponse.json({ ok: true, rewarded: false, reason: "disabled" });
  }

  // Get user
  const userRef = fs.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return jsonError("الحساب غير موجود", 404);
  }
  const userData = userSnap.data() || {};

  // Idempotent: قبض المكافأة سابقاً
  if (userData.referralRewardEarned === true) {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "already_claimed",
    });
  }

  // لا مُحيل
  if (!userData.referredBy || !userData.referredByUid) {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "no_referrer",
    });
  }

  // فحص الإعلان
  const listingRef = fs.collection("listings").doc(listingId);
  const listingSnap = await listingRef.get();
  if (!listingSnap.exists) {
    return jsonError("الإعلان غير موجود", 404);
  }
  const listingData = listingSnap.data() || {};

  if (listingData.ownerId !== uid) {
    return jsonError("الإعلان لا يخصّك", 403);
  }
  if (listingData.status !== "approved") {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "listing_not_approved",
    });
  }

  const referrerUid = userData.referredByUid as string;

  // فحص: المُحيل ≠ المستخدم (احتياطي)
  if (referrerUid === uid) {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "self_referral",
    });
  }

  // Rate limit: كم مكافأة استلم المُحيل اليوم؟
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayClaims = await fs
    .collection("referrals")
    .where("referrerUid", "==", referrerUid)
    .where("status", "==", "completed")
    .where("rewardedAt", ">=", todayStart)
    .limit(MAX_REFERRALS_PER_DAY + 1)
    .get();

  if (todayClaims.size >= MAX_REFERRALS_PER_DAY) {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "rate_limit",
      maxPerDay: MAX_REFERRALS_PER_DAY,
    });
  }

  // البحث عن referral doc
  const referralSnap = await fs
    .collection("referrals")
    .where("referredUid", "==", uid)
    .where("referrerUid", "==", referrerUid)
    .limit(1)
    .get();

  if (referralSnap.empty) {
    return jsonError("سجلّ الإحالة غير موجود", 404);
  }

  const referralRef = referralSnap.docs[0].ref;
  const referralData = referralSnap.docs[0].data();

  if (referralData.status !== "pending") {
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "not_pending",
      status: referralData.status,
    });
  }

  // فحص المُحيل ليس محظوراً
  const referrerRef = fs.collection("users").doc(referrerUid);
  const referrerSnap2 = await referrerRef.get();
  if (!referrerSnap2.exists) {
    await referralRef.update({ status: "blocked" });
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "referrer_missing",
    });
  }
  const referrerData = referrerSnap2.data() || {};
  if (referrerData.banned === true || referrerData.disabled === true) {
    await referralRef.update({ status: "blocked" });
    return NextResponse.json({
      ok: true,
      rewarded: false,
      reason: "referrer_banned",
    });
  }

  // ALL CHECKS PASSED — صرف المكافأة
  const txRefForReferrer = fs.collection("walletTransactions").doc();
  const txRefForReferred = fs.collection("walletTransactions").doc();

  try {
    await fs.runTransaction(async (tx) => {
      // إعادة قراءة كل شيء
      const [u1, u2, ref] = await Promise.all([
        tx.get(userRef),         // المُحال
        tx.get(referrerRef),     // المُحيل
        tx.get(referralRef),
      ]);

      if (u1.data()?.referralRewardEarned === true) {
        throw new Error("already_claimed");
      }
      if (ref.data()?.status !== "pending") {
        throw new Error("not_pending");
      }

      const balReferred = Number(u1.data()?.balance) || 0;
      const balReferrer = Number(u2.data()?.balance) || 0;
      const newBalReferred = balReferred + REFERRAL_REWARD_BC;
      const newBalReferrer = balReferrer + REFERRAL_REWARD_BC;

      // كتابة المعاملتين
      tx.set(txRefForReferred, {
        userId: uid,
        amount: REFERRAL_REWARD_BC,
        type: "referral_bonus",
        reason: "مكافأة قبول دعوة صديق",
        balanceAfter: newBalReferred,
        createdBy: uid,
        createdByEmail: u1.data()?.email || "",
        metadata: {
          referrerUid,
          referralId: referralRef.id,
          triggerListingId: listingId,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(txRefForReferrer, {
        userId: referrerUid,
        amount: REFERRAL_REWARD_BC,
        type: "referral_bonus",
        reason: "مكافأة دعوة صديق",
        balanceAfter: newBalReferrer,
        createdBy: uid,
        createdByEmail: u1.data()?.email || "",
        metadata: {
          referredUid: uid,
          referralId: referralRef.id,
          triggerListingId: listingId,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      // تحديث المستخدمين
      tx.update(userRef, {
        balance: newBalReferred,
        walletUpdatedAt: FieldValue.serverTimestamp(),
        referralRewardEarned: true,
      });

      tx.update(referrerRef, {
        balance: newBalReferrer,
        walletUpdatedAt: FieldValue.serverTimestamp(),
        referralsCount: (Number(u2.data()?.referralsCount) || 0) + 1,
      });

      // تحديث referral doc
      tx.update(referralRef, {
        status: "completed",
        rewardedAt: FieldValue.serverTimestamp(),
        triggerListingId: listingId,
      });
    });
  } catch (err: any) {
    if (err?.message === "already_claimed") {
      return NextResponse.json({ ok: true, rewarded: false, reason: "already_claimed" });
    }
    if (err?.message === "not_pending") {
      return NextResponse.json({ ok: true, rewarded: false, reason: "not_pending" });
    }
    return jsonError(err?.message || "فشل صرف المكافأة", 500);
  }

  return NextResponse.json({
    ok: true,
    rewarded: true,
    rewardBC: REFERRAL_REWARD_BC,
    referrerUid,
  });
}
