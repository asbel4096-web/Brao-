import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
} from "@/lib/admin/api-helpers";

/**
 * GET /api/admin/search-insights  (أدمن فقط)
 *
 * يجمّع عمليات البحث بلا نتائج (zero == true) ويرتّبها حسب التكرار،
 * ليرى الأدمن ما يطلبه المستخدمون ولا يجدونه (فرص نمو للسوق).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function isAdmin(req: NextRequest): Promise<boolean> {
  const m = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!m) return false;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(m[1]);
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs.collection("users").doc(decoded.uid).get();
    return snap.exists && snap.data()?.isAdmin === true;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return jsonError("غير مصرّح — للأدمن فقط", 403);

  try {
    const fs = getAdminFirestore(getAdminApp());
    // نرتّب حسب createdAt فقط (فهرس تلقائي) ونفلتر zero في الكود —
    // لتفادي الحاجة لفهرس مركّب.
    const snap = await fs
      .collection("searchLogs")
      .orderBy("createdAt", "desc")
      .limit(2000)
      .get();

    const map = new Map<
      string,
      { query: string; count: number; lastAt: number; cities: Set<string> }
    >();

    let zeroCount = 0;
    snap.docs.forEach((d) => {
      const t = d.data() as any;
      if (t.zero === false) return; // نهتم بـ"بلا نتائج" فقط
      zeroCount++;
      const key = t.query as string;
      if (!key) return;
      const at = t.createdAt?.toMillis?.() || 0;
      const existing = map.get(key);
      if (existing) {
        existing.count++;
        if (at > existing.lastAt) existing.lastAt = at;
        if (t.city) existing.cities.add(t.city);
      } else {
        map.set(key, {
          query: t.queryRaw || key,
          count: 1,
          lastAt: at,
          cities: new Set(t.city ? [t.city] : []),
        });
      }
    });

    const items = Array.from(map.values())
      .map((v) => ({
        query: v.query,
        count: v.count,
        lastAt: v.lastAt,
        cities: Array.from(v.cities).slice(0, 3),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    return NextResponse.json({
      ok: true,
      items,
      totalZeroSearches: zeroCount,
      uniqueQueries: map.size,
    });
  } catch (err: any) {
    // قد يتطلب فهرساً (zero == true + createdAt). نُرجِع رسالة واضحة.
    return jsonError(err?.message || "فشل التجميع", 500);
  }
}
