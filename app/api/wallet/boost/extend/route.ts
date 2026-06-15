import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import { getExtension } from "@/lib/wallet/campaign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * POST /api/wallet/boost/extend
 * Auth: مالك الإعلان.
 * body: { listingId, days }   // days ∈ {3, 7, 15, 30}
 *
 * يشتري أيام إضافية للحملة الممولة (يخصم BC):
 *  - حملة نشطة   → تُضاف الأيام إلى boostedUntil.
 *  - حملة متوقفة → تُضاف إلى الوقت المتبقي المجمّد (تبقى متوقفة).
 *  - حملة منتهية → إعادة تفعيل: boostedUntil = الآن + الأيام.
 * يرسل إشعار نجاح التمديد.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonError("Unauthorized", 401);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  let uid: string;
  let email = "";
  try {
    const dec = await getAuth(app).verifyIdToken(authHeader.slice(7));
    uid = dec.uid;
    email = dec.email || "";
  } catch {
    return jsonError("Invalid token", 401);
  }

  let body: { listingId?: string; days?: number } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const listingId = (body.listingId || "").trim();
  if (!listingId) return jsonError("Missing listingId", 400);

  const ext = getExtension(Number(body.days));
  if (!ext) return jsonError("عدد أيام غير صالح (المتاح: 3، 7، 15، 30)", 400);

  const userRef = fs.collection("users").doc(uid);
  const listingRef = fs.collection("listings").doc(listingId);
  const txRef = fs.collection("walletTransactions").doc();

  let result: { balanceAfter: number; listingTitle: string; addedDays: number };

  try {
    result = await fs.runTransaction(async (tx) => {
      const [userSnap, listingSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(listingRef),
      ]);
      if (!userSnap.exists) throw new Error("الحساب غير موجود");
      if (!listingSnap.exists) throw new Error("الإعلان غير موجود");

      const u = userSnap.data() || {};
      const d = listingSnap.data() || {};

      if (u.banned === true || u.disabled === true) throw new Error("الحساب موقوف");
      if (d.ownerId !== uid) throw new Error("هذا الإعلان لا يخصّك");
      if (d.archived === true || d.deleted === true)
        throw new Error("الإعلان مؤرشف أو محذوف");

      const balance = Number(u.balance) || 0;
      if (balance < ext.price)
        throw new Error(
          `الرصيد غير كافٍ. الحالي: ${balance} BC، المطلوب: ${ext.price} BC`
        );
      const newBalance = balance - ext.price;

      // معاملة المحفظة
      tx.set(txRef, {
        userId: uid,
        amount: -ext.price,
        type: "boost",
        reason: `تمديد الحملة +${ext.days} يوم - ${d.title || listingId.slice(0, 8)}`,
        balanceAfter: newBalance,
        createdBy: uid,
        createdByEmail: email,
        metadata: { listingId, extendDays: ext.days },
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.update(userRef, {
        balance: newBalance,
        walletUpdatedAt: FieldValue.serverTimestamp(),
      });

      // إضافة الأيام حسب حالة الحملة
      const addMs = ext.days * DAY_MS;
      const now = Date.now();
      const updates: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
        // إعادة تفعيل أعلام الإشعارات لتُرسل من جديد للنهاية الجديدة
        boostNotif3d: FieldValue.delete(),
        boostNotif1d: FieldValue.delete(),
        boostNotifExpired: FieldValue.delete(),
      };

      if (d.boostPaused === true) {
        // متوقفة: تُضاف للوقت المجمّد (تبقى متوقفة)
        const rem = Number(d.boostPausedRemainingMs) || 0;
        updates.boostPausedRemainingMs = rem + addMs;
      } else {
        const untilMs = d.boostedUntil?.toMillis?.() || 0;
        if (untilMs > now) {
          // نشطة: تمديد النهاية
          updates.boostedUntil = new Date(untilMs + addMs);
        } else {
          // منتهية/جديدة: إعادة تفعيل
          updates.boostedUntil = new Date(now + addMs);
          updates.boostedAt = FieldValue.serverTimestamp();
        }
      }

      tx.update(listingRef, updates);

      return {
        balanceAfter: newBalance,
        listingTitle: d.title || "",
        addedDays: ext.days,
      };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل التمديد", 400);
  }

  // إشعار نجاح التمديد (best-effort)
  try {
    await fs.collection("notifications").add({
      userId: uid,
      type: "campaign_extended",
      title: "تم تمديد حملتك بنجاح",
      body: `أضفت ${result.addedDays} يوم لحملة "${result.listingTitle || "إعلانك"}".`,
      link: "/my-listings",
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch {
    /* تجاهل */
  }

  return NextResponse.json({
    ok: true,
    addedDays: result.addedDays,
    balanceAfter: result.balanceAfter,
  });
}
