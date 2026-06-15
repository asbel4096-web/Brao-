import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/admin/boosts/cleanup
 *
 * تنظيف Lazy للإعلانات المنتهية:
 *  - الإعلانات featured=true لكن featuredUntil < now → featured=false
 *  - boostedUntil < now → نتركها كما هي (الـUI يفحص isBoostedNow)
 *    لكن لو أحببنا، نُصفّرها لتجنّب reads لاحقاً
 *
 * يُستدعى تلقائياً عند فتح /admin/boosts (debounce 60s).
 * بدون Cloud Scheduler (يعمل على Spark plan).
 *
 * يقتصر على 200 وثيقة لكل استدعاء.
 */

const MAX_UPDATES_PER_RUN = 200;

export async function POST(request: Request) {
  const result = await verifyAdminRequest(request, "users.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  const now = Date.now();

  // البحث عن الإعلانات featured المنتهية
  const featuredSnap = await fs
    .collection("listings")
    .where("featured", "==", true)
    .limit(500)
    .get();

  const expiredFeatured = featuredSnap.docs.filter((d) => {
    const ms = d.data().featuredUntil?.toMillis?.();
    return !ms || ms <= now;
  });

  let updated = 0;
  if (expiredFeatured.length > 0) {
    const toUpdate = expiredFeatured.slice(0, MAX_UPDATES_PER_RUN);
    const batch = fs.batch();
    for (const d of toUpdate) {
      batch.update(d.ref, {
        featured: false,
      });
    }
    await batch.commit();
    updated = toUpdate.length;
  }

  // تنظيف وسم "عاجل" المنتهي (urgentUntil <= now) — single-field index تلقائي.
  let urgentCleaned = 0;
  const urgentSnap = await fs
    .collection("listings")
    .where("urgentUntil", "<=", new Date(now))
    .limit(MAX_UPDATES_PER_RUN)
    .get();
  if (!urgentSnap.empty) {
    const ubatch = fs.batch();
    urgentSnap.docs.forEach((d) => {
      ubatch.update(d.ref, { urgentUntil: FieldValue.delete() });
    });
    await ubatch.commit();
    urgentCleaned = urgentSnap.size;
  }

  // Log
  if (updated > 0 || urgentCleaned > 0) {
    await fs.collection("adminLogs").add({
      adminUid: caller.uid,
      adminEmail: caller.email,
      action: "boosts_cleanup",
      targetType: "system",
      targetId: "boosts_cleanup",
      after: {
        scanned: featuredSnap.size,
        expiredFound: expiredFeatured.length,
        updated,
        urgentCleaned,
      },
      createdAt: new Date(),
    });
  }

  return NextResponse.json({
    ok: true,
    scanned: featuredSnap.size,
    expiredFound: expiredFeatured.length,
    updated,
    urgentCleaned,
    hasMore: expiredFeatured.length > MAX_UPDATES_PER_RUN,
  });
}
