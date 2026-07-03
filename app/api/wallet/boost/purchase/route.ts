import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";
import { BOOST_SERVICES, type BoostServiceKey } from "@/lib/wallet/boost";
import {
  sanitizePromoPricing,
  type PromoServiceKey,
} from "@/lib/wallet/promo-pricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/wallet/boost/purchase
 * Auth: المستخدم نفسه (مالك الإعلان)
 * body: { listingId: string, service: "featured" | "boost" | "vip" | "urgent" }
 *
 * يشتري المستخدم باقة ترقية لإعلانه (مميز/ممول/VIP):
 *  1. فحوص:
 *     - feature flag wallet (للمميز/VIP) أو boosts (للممول)
 *     - الإعلان موجود + ownerId == المستخدم
 *     - الإعلان status == "approved"
 *     - الإعلان ليس محذوفاً/مؤرشفاً
 *     - الرصيد كافٍ
 *  2. transactional:
 *     - يخصم رصيد (د.ل)
 *     - يكتب walletTransactions
 *     - يُحدّث الإعلان حسب الباقة:
 *        featured (مميز): featured=true, featuredUntil = +3 أيام
 *        boost (ممول): boostedUntil = +3 أيام
 *        vip (VIP): vipUntil = +3 أيام + featured للصفحة الرئيسية
 *
 * تراكم: لو الإعلان مُرقّى حالياً، تُضاف المدة للوقت المتبقي
 *        (المستخدم لا يخسر الأيام المتبقية).
 */

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
  let body: { listingId?: string; service?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const listingId = (body.listingId || "").trim();
  if (!listingId) return jsonError("Missing listingId", 400);

  const serviceKey = body.service as BoostServiceKey;
  const service = BOOST_SERVICES[serviceKey];
  if (!service) {
    return jsonError(
      `Service غير صالحة. المتاح: ${Object.keys(BOOST_SERVICES).join(", ")}`,
      400
    );
  }

  // Feature flag check
  // featured (مميز) + vip + urgent (عاجل) → flag "wallet"؛ boost (ممول) → flag "boosts"
  const requiredFlag =
    serviceKey === "boost" ? "boosts" : "wallet";
  const flagSnap = await fs.collection("featureFlags").doc(requiredFlag).get();
  if (!flagSnap.exists || flagSnap.data()?.enabled !== true) {
    return jsonError(
      `خدمة "${service.label}" غير مفعَّلة حالياً`,
      403
    );
  }

  // السعر الفعّال (قابل للتعديل من لوحة الأدمن) — السيرفر مصدر الحقيقة.
  // العميل لا يُرسل السعر مطلقاً؛ نقرؤه من config/app.promoPricing مع
  // التحقّق والرجوع للقيمة الافتراضية عند أي قيمة غير سليمة.
  let chargePrice = service.price;
  try {
    const cfgSnap = await fs.collection("config").doc("app").get();
    const effective = sanitizePromoPricing(
      cfgSnap.exists ? cfgSnap.data()?.promoPricing : null
    );
    chargePrice = effective[serviceKey as PromoServiceKey] ?? service.price;
  } catch {
    chargePrice = service.price;
  }

  // Transaction
  const userRef = fs.collection("users").doc(uid);
  const listingRef = fs.collection("listings").doc(listingId);
  const txRef = fs.collection("walletTransactions").doc();

  let result: {
    balanceBefore: number;
    balanceAfter: number;
    listingTitle: string;
    expiresAt?: Date;
  };

  try {
    result = await fs.runTransaction(async (tx) => {
      const [userSnap, listingSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(listingRef),
      ]);

      if (!userSnap.exists) throw new Error("الحساب غير موجود");
      if (!listingSnap.exists) throw new Error("الإعلان غير موجود");

      const userData = userSnap.data() || {};
      const listingData = listingSnap.data() || {};

      // فحوص الحساب
      if (userData.banned === true || userData.disabled === true) {
        throw new Error("الحساب موقوف");
      }

      // فحوص الإعلان
      if (listingData.ownerId !== uid) {
        throw new Error("هذا الإعلان لا يخصّك");
      }
      if (listingData.status !== "approved") {
        throw new Error("يجب اعتماد الإعلان قبل تعزيزه");
      }
      if (listingData.archived === true || listingData.deleted === true) {
        throw new Error("الإعلان مؤرشف أو محذوف");
      }

      // فحص الرصيد
      const currentBalance = Number(userData.balance) || 0;
      if (currentBalance < chargePrice) {
        throw new Error(
          `الرصيد غير كافٍ. الحالي: ${currentBalance} د.ل، المطلوب: ${chargePrice} د.ل`
        );
      }

      const newBalance = currentBalance - chargePrice;

      // كتابة المعاملة
      tx.set(txRef, {
        userId: uid,
        amount: -chargePrice,
        type:
          serviceKey === "featured"
            ? "featured_listing"
            : "boost",
        reason: `${service.label} - ${listingData.title || listingId.slice(0, 8)}`,
        balanceAfter: newBalance,
        createdBy: uid,
        createdByEmail: userData.email || "",
        metadata: {
          listingId,
          service: serviceKey,
          durationDays: service.durationDays || 0,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      // تحديث الرصيد
      tx.update(userRef, {
        balance: newBalance,
        walletUpdatedAt: FieldValue.serverTimestamp(),
      });

      // تحديث الإعلان حسب نوع الخدمة
      const now = Date.now();
      let expiresAt: Date | undefined;
      const listingUpdates: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (serviceKey === "boost") {
        const existingMs = listingData.boostedUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        const newUntilMs = baseMs + service.durationDays! * 24 * 60 * 60 * 1000;
        expiresAt = new Date(newUntilMs);
        listingUpdates.boostedUntil = expiresAt;
        listingUpdates.boostedAt = FieldValue.serverTimestamp();
      } else if (serviceKey === "featured") {
        const existingMs = listingData.featuredUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        const newUntilMs = baseMs + service.durationDays! * 24 * 60 * 60 * 1000;
        expiresAt = new Date(newUntilMs);
        listingUpdates.featured = true;
        listingUpdates.featuredUntil = expiresAt;
        listingUpdates.featuredAt = FieldValue.serverTimestamp();
        listingUpdates.featuredBy = "purchase";
      } else if (serviceKey === "vip") {
        // VIP: أعلى أولوية + ظهور في الصفحة الرئيسية (featured)
        const existingMs = listingData.vipUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        const newUntilMs = baseMs + service.durationDays! * 24 * 60 * 60 * 1000;
        expiresAt = new Date(newUntilMs);
        listingUpdates.vipUntil = expiresAt;
        listingUpdates.vipAt = FieldValue.serverTimestamp();
        // VIP يظهر أيضاً في قسم المميَّزة بالصفحة الرئيسية
        listingUpdates.featured = true;
        listingUpdates.featuredUntil = expiresAt;
        listingUpdates.featuredBy = "vip";
      } else if (serviceKey === "urgent") {
        // عاجل: إضافة مستقلة - شارة فقط، لا تلمس featured/boost/vip.
        const existingMs = listingData.urgentUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        const newUntilMs = baseMs + service.durationDays! * 24 * 60 * 60 * 1000;
        expiresAt = new Date(newUntilMs);
        listingUpdates.urgentUntil = expiresAt;
        listingUpdates.urgentAt = FieldValue.serverTimestamp();
      }

      tx.update(listingRef, listingUpdates);

      return {
        balanceBefore: currentBalance,
        balanceAfter: newBalance,
        listingTitle: listingData.title || "",
        expiresAt,
      };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الشراء", 400);
  }

  return NextResponse.json({
    ok: true,
    service: serviceKey,
    balanceBefore: result.balanceBefore,
    balanceAfter: result.balanceAfter,
    expiresAt: result.expiresAt?.toISOString() || null,
    listingTitle: result.listingTitle,
  });
}
