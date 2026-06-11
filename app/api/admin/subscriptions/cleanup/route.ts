import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  verifyAdminRequest,
} from "@/lib/admin/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/admin/subscriptions/cleanup
 * (لا body)
 *
 * تنظيف Lazy: يبحث عن مستخدمين status=active/granted
 * لكن verifiedUntil < now → يُحدّث status إلى "expired".
 *
 * يُستدعى تلقائياً عند فتح /admin/subscriptions (debounce 60s).
 *
 * يعمل بدون Cloud Scheduler (Blaze plan). الـtradeoff: لو لم يفتح
 * أدمن الصفحة، الاشتراكات المنتهية تبقى status=active في DB لكن
 * الـUI (isVerifiedNow) يتعامل معها بصورة صحيحة (يفحص verifiedUntil > now).
 *
 * فقط يحدّث الحقل لتنظيف الإحصاءات والـqueries.
 *
 * يقتصر على 200 وثيقة لكل استدعاء لتجنّب timeout.
 */

const MAX_UPDATES_PER_RUN = 200;

export async function POST(request: Request) {
  const result = await verifyAdminRequest(request, "users.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  // نبحث في المستخدمين status=active/granted ونفحص verifiedUntil
  const snap = await fs
    .collection("users")
    .where("verificationStatus", "in", ["active", "granted"])
    .limit(500) // نقرأ 500، نفلتر، نحدّث 200 كحد
    .get();

  const now = Date.now();
  const expiredDocs = snap.docs.filter((d) => {
    const ms = d.data().verifiedUntil?.toMillis?.();
    return ms && ms <= now;
  });

  if (expiredDocs.length === 0) {
    return NextResponse.json({
      ok: true,
      scanned: snap.size,
      updated: 0,
    });
  }

  const toUpdate = expiredDocs.slice(0, MAX_UPDATES_PER_RUN);

  // batch writes (Firestore batch محدود بـ500 ops، نحن آمنون ضمن 200)
  const batch = fs.batch();
  for (const d of toUpdate) {
    batch.update(d.ref, {
      verificationStatus: "expired",
    });
  }
  await batch.commit();

  // log واحد للعملية كلها (لا نُسجّل كل user منفصلاً للأداء)
  await fs.collection("adminLogs").add({
    adminUid: caller.uid,
    adminEmail: caller.email,
    action: "verification_cleanup",
    targetType: "system",
    targetId: "subscriptions_cleanup",
    after: {
      scanned: snap.size,
      expiredFound: expiredDocs.length,
      updated: toUpdate.length,
    },
    createdAt: new Date(),
  });

  return NextResponse.json({
    ok: true,
    scanned: snap.size,
    expiredFound: expiredDocs.length,
    updated: toUpdate.length,
    /** هل يحتاج استدعاء آخر (لو > 200)؟ */
    hasMore: expiredDocs.length > MAX_UPDATES_PER_RUN,
  });
}
