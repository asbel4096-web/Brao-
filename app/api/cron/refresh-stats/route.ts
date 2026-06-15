import { NextResponse } from "next/server";
import { getAdminApp, getAdminFirestore } from "@/lib/admin/api-helpers";

/**
 * GET /api/cron/refresh-stats
 *
 * نقطة Cron لتحديث وثيقة الإحصائيات المُجمّعة (stats/platform).
 *
 * المصادقة: عبر CRON_SECRET (هيدر Authorization: Bearer <secret>).
 *
 * لماذا؟ بدل أن يُنفّذ كل زائر 5 استعلامات getCountFromServer من العميل
 * (قد تُرفض بـ403 على listings، وتستهلك reads)، نحسب الأعداد هنا
 * server-side بـAdmin SDK (يتجاوز قواعد العميل) ونخزّنها في وثيقة واحدة
 * يقرأها العميل بقراءة واحدة عامة سريعة.
 *
 * آمن: قراءة فقط من listings/users + كتابة وثيقة stats واحدة.
 */

export const dynamic = "force-dynamic";

const PARTS_CATEGORIES = [
  "قطع غيار سيارات",
  "قطع غيار شاحنات",
  "قطع غيار كهربائية",
  "قطع غيار مستعملة",
  "كماليات سيارات",
];

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const app = getAdminApp();
    const fs = getAdminFirestore(app);

    const listingsCol = fs.collection("listings");
    const usersCol = fs.collection("users");
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // عدّ متوازٍ عبر Admin SDK (يتجاوز قواعد العميل)
    const [
      carsAgg,
      partsAgg,
      dealersAgg,
      showroomsAgg,
      activeAgg,
    ] = await Promise.all([
      listingsCol
        .where("status", "==", "approved")
        .where("category", "==", "سيارات")
        .count()
        .get(),
      listingsCol
        .where("status", "==", "approved")
        .where("category", "in", PARTS_CATEGORIES)
        .count()
        .get(),
      usersCol.where("verificationType", "==", "dealer").count().get(),
      usersCol.where("verificationType", "==", "showroom").count().get(),
      usersCol.where("lastLoginAt", ">=", thirtyDaysAgo).count().get(),
    ]);

    const data = {
      cars: carsAgg.data().count,
      parts: partsAgg.data().count,
      dealers: dealersAgg.data().count + showroomsAgg.data().count,
      activeUsers: activeAgg.data().count,
      updatedAt: new Date().toISOString(),
    };

    await fs.collection("stats").doc("platform").set(data, { merge: true });

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "فشل تحديث الإحصائيات" },
      { status: 500 }
    );
  }
}
