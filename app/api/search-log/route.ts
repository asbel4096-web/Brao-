import { NextRequest, NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { createHash } from "crypto";

/**
 * POST /api/search-log  (عام)
 *
 * يسجّل عمليات البحث بلا نتائج لتحليلها في لوحة الأدمن (ماذا يبحث عنه
 * الناس ولا يجدونه). الكتابة عبر Admin SDK فلا حاجة لقواعد على searchLogs.
 * يتجاهل المدخلات القصيرة/غير الصالحة بصمت.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const raw = String(body?.query || "").trim();
    if (raw.length < 2 || raw.length > 80) {
      return NextResponse.json({ ok: true, skipped: true });
    }
    const normalized = raw.toLowerCase().replace(/\s+/g, " ");
    const city = String(body?.city || "").trim().slice(0, 40);
    const resultCount = Number(body?.resultCount) || 0;

    const fs = getAdminFirestore(getAdminApp());
    // W0: one log per network address, query and hour (no flooding the admin insights).
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const hour = Math.floor(Date.now() / 3_600_000);
    const key = createHash("sha256").update(`${ip}|${normalized}|${hour}`).digest("hex").slice(0, 32);
    try {
      await fs.collection("searchLogDedup").doc(key).create({ at: FieldValue.serverTimestamp() });
    } catch {
      return NextResponse.json({ ok: true, skipped: true });
    }
    await fs.collection("searchLogs").add({
      query: normalized,
      queryRaw: raw.slice(0, 80),
      city: city || null,
      resultCount,
      zero: resultCount === 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true });
  } catch {
    // التسجيل اختياري — لا نُفشل تجربة المستخدم أبداً.
    return NextResponse.json({ ok: true, error: true });
  }
}
