import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
} from "@/lib/admin/api-helpers";

/**
 * GET /api/admin/revenue  (أدمن فقط)
 *
 * يجمع اقتصاد BC من walletTransactions عبر Admin SDK (قواعد القراءة
 * تمنع العميل من قراءة معاملات كل المستخدمين، لذا نجمع على السيرفر).
 *
 * يُرجِع:
 *  - totalRevenue: إيراد المنصّة (إنفاق المستخدمين على الخدمات).
 *  - totalTopups: إجمالي الشحن (BC المُحمّل).
 *  - byService: تفصيل الإيراد حسب الخدمة.
 *  - daily: إيراد آخر 30 يوماً (لرسم بياني).
 *  - txCount: عدد المعاملات المفحوصة.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// الخدمات التي تُمثّل إيراداً فعلياً للمنصّة (خصم من رصيد المستخدم).
const REVENUE_TYPES = new Set([
  "boost",
  "featured_listing",
  "vip",
  "urgent",
  "verification",
]);
const TOPUP_TYPES = new Set(["credit", "topup"]);

const SERVICE_LABEL: Record<string, string> = {
  boost: "ترقية (مموّل)",
  featured_listing: "تمييز (مميّز)",
  vip: "VIP",
  urgent: "عاجل",
  verification: "توثيق المعارض",
};

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
    // نقرأ آخر 5000 معاملة (حدّ آمن للقراءات).
    const snap = await fs
      .collection("walletTransactions")
      .orderBy("createdAt", "desc")
      .limit(5000)
      .get();

    let totalRevenue = 0;
    let totalTopups = 0;
    const byService: Record<string, number> = {};

    // آخر 30 يوماً
    const days: { key: string; label: string; value: number }[] = [];
    const dayIndex: Record<string, number> = {};
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      dayIndex[key] = days.length;
      days.push({ key, label, value: 0 });
    }

    snap.docs.forEach((doc) => {
      const t = doc.data() as any;
      const type = t.type as string;
      const amount = Number(t.amount) || 0;
      const abs = Math.abs(amount);

      if (TOPUP_TYPES.has(type) && amount > 0) {
        totalTopups += abs;
      }
      if (REVENUE_TYPES.has(type)) {
        totalRevenue += abs;
        byService[type] = (byService[type] || 0) + abs;
        // توزيع يومي
        const dt = t.createdAt?.toDate?.();
        if (dt) {
          const key = dt.toISOString().slice(0, 10);
          const idx = dayIndex[key];
          if (idx != null) days[idx].value += abs;
        }
      }
    });

    const byServiceArr = Object.entries(byService)
      .map(([type, amount]) => ({
        type,
        label: SERVICE_LABEL[type] || type,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);

    const daily = days.map((d) => ({ date: d.label, count: d.value }));

    return NextResponse.json({
      ok: true,
      totalRevenue,
      totalTopups,
      byService: byServiceArr,
      daily,
      txCount: snap.size,
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل التجميع", 500);
  }
}
