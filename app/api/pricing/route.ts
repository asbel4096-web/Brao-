import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/admin/api-helpers";
import {
  sanitizePromoPricing,
  DEFAULT_PROMO_PRICING,
} from "@/lib/wallet/promo-pricing";

/**
 * GET /api/pricing  (عام — بلا مصادقة)
 *
 * يُرجِع أسعار باقات الترقية الفعّالة (القابلة للتعديل من لوحة الأدمن)
 * ليعرضها العميل. القراءة من config/app.promoPricing عبر Admin SDK، فلا
 * حاجة لأي قاعدة قراءة عامة على config. السعر للعرض فقط؛ الشحن الفعلي
 * يتحقّق منه السيرفر مجدداً.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs.collection("config").doc("app").get();
    const pricing = sanitizePromoPricing(
      snap.exists ? snap.data()?.promoPricing : null
    );
    return NextResponse.json(
      { ok: true, pricing },
      { headers: { "Cache-Control": "public, max-age=30" } }
    );
  } catch {
    // fail-open للقيم الافتراضية (العرض لا يتعطّل أبداً).
    return NextResponse.json({ ok: true, pricing: DEFAULT_PROMO_PRICING });
  }
}
