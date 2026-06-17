import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
} from "@/lib/admin/api-helpers";

/**
 * GET /api/admin/duplicates  (أدمن فقط)
 *
 * يفحص أحدث الإعلانات ويكشف المتكرر منها: نفس رقم الهاتف + عنوان متطابق
 * (مؤشّر سبام/تكرار)، إضافةً لأرقام عالية النشاط (قد تكون معارض أو سبام).
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

const normPhone = (p: any) => String(p || "").replace(/\D/g, "").slice(-9);
const normTitle = (t: any) =>
  String(t || "").toLowerCase().replace(/\s+/g, " ").trim();

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return jsonError("غير مصرّح — للأدمن فقط", 403);

  try {
    const fs = getAdminFirestore(getAdminApp());
    const snap = await fs
      .collection("listings")
      .orderBy("createdAt", "desc")
      .limit(1000)
      .get();

    const all = snap.docs.map((d) => {
      const t = d.data() as any;
      return {
        id: d.id,
        title: t.title || "",
        phone: normPhone(t.phone || t.whatsapp),
        status: t.status || "",
        ownerId: t.ownerId || "",
        image: t.images?.[0] || null,
        at: t.createdAt?.toMillis?.() || 0,
      };
    });

    // مجموعات التكرار: نفس الهاتف + نفس العنوان.
    const groups = new Map<string, any[]>();
    const phoneCount = new Map<string, number>();
    for (const l of all) {
      if (l.phone) phoneCount.set(l.phone, (phoneCount.get(l.phone) || 0) + 1);
      if (!l.phone || !l.title) continue;
      const key = `${l.phone}|${normTitle(l.title)}`;
      const arr = groups.get(key) || [];
      arr.push(l);
      groups.set(key, arr);
    }

    const duplicateGroups = Array.from(groups.values())
      .filter((g) => g.length >= 2)
      .map((g) => ({
        title: g[0].title,
        phone: g[0].phone,
        count: g.length,
        listings: g.slice(0, 10),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const highVolume = Array.from(phoneCount.entries())
      .filter(([, c]) => c >= 8)
      .map(([phone, count]) => ({ phone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return NextResponse.json({
      ok: true,
      scanned: all.length,
      duplicateGroups,
      highVolume,
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الفحص", 500);
  }
}
