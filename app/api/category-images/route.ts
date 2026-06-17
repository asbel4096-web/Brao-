import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/admin/api-helpers";

/**
 * GET /api/category-images  (عام)
 * يُرجِع خريطة صور الأقسام (slug → url) التي يضبطها الأدمن، لعرضها في
 * قسم "استكشف جميع الأقسام". القراءة عبر Admin SDK — بلا قواعد إضافية.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs.collection("config").doc("app").get();
    const images =
      snap.exists && snap.data()?.categoryImages
        ? (snap.data()!.categoryImages as Record<string, string>)
        : {};
    return NextResponse.json(
      { ok: true, images },
      { headers: { "Cache-Control": "public, max-age=60" } }
    );
  } catch {
    return NextResponse.json({ ok: true, images: {} });
  }
}
