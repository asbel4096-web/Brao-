import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import {
  sanitizePromoPricing,
  PROMO_KEYS,
  PROMO_PRICE_MIN,
  PROMO_PRICE_MAX,
} from "@/lib/wallet/promo-pricing";

/**
 * أسعار باقات الترقية — للأدمن فقط.
 *
 *  GET  /api/admin/pricing            → الأسعار الحالية الفعّالة.
 *  POST /api/admin/pricing            → تحديث الأسعار.
 *       body: { featured, boost, vip, urgent }  (أرقام BC)
 *
 * تُحفظ في config/app.promoPricing (merge). يقرؤها purchase route عند
 * الشراء، و/api/pricing لعرضها للمستخدمين.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function getAdminUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(match[1]);
    if (!decoded?.uid) return null;
    const fs = getAdminFirestore(getAdminApp());
    const userSnap = await fs.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists || userSnap.data()?.isAdmin !== true) return null;
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const adminUid = await getAdminUid(req);
  if (!adminUid) return jsonError("غير مصرّح — للأدمن فقط", 403);
  try {
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs.collection("config").doc("app").get();
    const pricing = sanitizePromoPricing(
      snap.exists ? snap.data()?.promoPricing : null
    );
    return NextResponse.json({ ok: true, pricing });
  } catch (err: any) {
    return jsonError(err?.message || "فشل القراءة", 500);
  }
}

export async function POST(req: NextRequest) {
  const adminUid = await getAdminUid(req);
  if (!adminUid) return jsonError("غير مصرّح — للأدمن فقط", 403);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError("طلب غير صالح", 400);
  }

  // تحقّق صارم: كل قيمة رقم صحيح ضمن الحدود.
  for (const k of PROMO_KEYS) {
    const n = Number(body?.[k]);
    if (!Number.isFinite(n) || n < PROMO_PRICE_MIN || n > PROMO_PRICE_MAX) {
      return jsonError(
        `سعر "${k}" غير صالح. يجب أن يكون بين ${PROMO_PRICE_MIN} و ${PROMO_PRICE_MAX} BC.`,
        400
      );
    }
  }

  const promoPricing = sanitizePromoPricing(body);

  try {
    const fs = getAdminFirestore(getAdminApp());
    await fs.collection("config").doc("app").set(
      {
        promoPricing,
        promoPricingUpdatedAt: FieldValue.serverTimestamp(),
        promoPricingUpdatedBy: adminUid,
      },
      { merge: true }
    );
    try {
      await fs.collection("adminLogs").add({
        action: "promo_pricing_update",
        adminUid,
        details: promoPricing,
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {
      /* تجاهل فشل السجل */
    }
    return NextResponse.json({ ok: true, pricing: promoPricing });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الحفظ", 500);
  }
}
