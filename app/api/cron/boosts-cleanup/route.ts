import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
} from "@/lib/admin/api-helpers";

/**
 * GET /api/cron/boosts-cleanup
 *
 * نقطة Cron لتنظيف الترقيات المنتهية تلقائياً (Vercel Cron).
 *
 * المصادقة: عبر CRON_SECRET (هيدر Authorization: Bearer <secret>).
 * Vercel يرسل هذا الهيدر تلقائياً للـcron jobs المُعرّفة في vercel.json.
 *
 * ما يفعله:
 *  - يجد الإعلانات featured=true التي انتهى featuredUntil → featured=false
 *  - ينظّف vipUntil/boostedUntil المنتهية (تجميلي - الـUI يفحص الوقت أصلاً)
 *
 * آمن: لا يحذف بيانات، فقط يطفئ أعلام الترقية المنتهية.
 */

export const dynamic = "force-dynamic";

const MAX_PER_RUN = 400;

export async function GET(request: Request) {
  // التحقق من سرّ الـcron
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const app = getAdminApp();
    const fs = getAdminFirestore(app);
    const now = Date.now();

    // الإعلانات المميزة/VIP المنتهية (featured=true لكن featuredUntil مضى)
    const snap = await fs
      .collection("listings")
      .where("featured", "==", true)
      .limit(500)
      .get();

    const expired = snap.docs.filter((d) => {
      const ms = d.data().featuredUntil?.toMillis?.();
      return !ms || ms <= now;
    });

    let updated = 0;
    if (expired.length > 0) {
      const batch = fs.batch();
      for (const d of expired.slice(0, MAX_PER_RUN)) {
        const data = d.data();
        const patch: any = { featured: false };
        // تنظيف vipUntil المنتهي (تجميلي)
        const vipMs = data.vipUntil?.toMillis?.();
        if (vipMs && vipMs <= now) patch.vipUntil = FieldValue.delete();
        batch.update(d.ref, patch);
      }
      await batch.commit();
      updated = Math.min(expired.length, MAX_PER_RUN);
    }

    // تنظيف وسم "عاجل" المنتهي (urgentUntil <= now).
    // استعلام single-field (مفهرس تلقائياً) — لا يحتاج composite index.
    let urgentCleaned = 0;
    const urgentSnap = await fs
      .collection("listings")
      .where("urgentUntil", "<=", new Date(now))
      .limit(MAX_PER_RUN)
      .get();
    if (!urgentSnap.empty) {
      const ubatch = fs.batch();
      urgentSnap.docs.forEach((d) => {
        ubatch.update(d.ref, { urgentUntil: FieldValue.delete() });
      });
      await ubatch.commit();
      urgentCleaned = urgentSnap.size;
    }

    // ============================================================
    // إشعارات الحملات الممولة: 3 أيام / يوم واحد / انتهاء
    // نافذة: من قبل يومين إلى بعد 3 أيام (single-field range — مفهرس).
    // dedup عبر أعلام boostNotif3d/1d/Expired على الإعلان.
    // ============================================================
    const DAY_MS = 24 * 60 * 60 * 1000;
    let campaignNotifs = 0;
    const winSnap = await fs
      .collection("listings")
      .where("boostedUntil", "<=", new Date(now + 3 * DAY_MS))
      .where("boostedUntil", ">=", new Date(now - 2 * DAY_MS))
      .limit(MAX_PER_RUN)
      .get();

    if (!winSnap.empty) {
      const nbatch = fs.batch();
      for (const d of winSnap.docs) {
        const data = d.data();
        if (data.boostPaused === true || !data.ownerId) continue;
        const untilMs = data.boostedUntil?.toMillis?.();
        if (!untilMs) continue;

        const remMs = untilMs - now;
        const title = data.title || "إعلانك";
        let notif: { type: string; title: string; body: string } | null = null;
        let flag: string | null = null;

        if (remMs <= 0) {
          if (!data.boostNotifExpired) {
            notif = {
              type: "campaign_expired",
              title: "انتهت حملتك الممولة",
              body: `انتهت حملة "${title}". إعلانك ما زال موجوداً كإعلان عادي — يمكنك إعادة التفعيل.`,
            };
            flag = "boostNotifExpired";
          }
        } else {
          const daysLeft = Math.ceil(remMs / DAY_MS);
          if (daysLeft <= 1 && !data.boostNotif1d) {
            notif = {
              type: "campaign_1day",
              title: "يوم واحد متبقٍ على حملتك",
              body: `يتبقى يوم واحد على انتهاء حملة "${title}". مدّدها للحفاظ على الظهور.`,
            };
            flag = "boostNotif1d";
          } else if (daysLeft <= 3 && !data.boostNotif3d) {
            notif = {
              type: "campaign_3days",
              title: "3 أيام متبقية على حملتك",
              body: `يتبقى ${daysLeft} أيام على انتهاء حملة "${title}".`,
            };
            flag = "boostNotif3d";
          }
        }

        if (notif && flag) {
          const nref = fs.collection("notifications").doc();
          nbatch.set(nref, {
            userId: data.ownerId,
            type: notif.type,
            title: notif.title,
            body: notif.body,
            link: "/my-listings",
            read: false,
            createdAt: FieldValue.serverTimestamp(),
          });
          nbatch.update(d.ref, { [flag]: true });
          campaignNotifs++;
        }
      }
      if (campaignNotifs > 0) await nbatch.commit();
    }

    return NextResponse.json({
      ok: true,
      scanned: snap.size,
      expiredFound: expired.length,
      updated,
      urgentCleaned,
      campaignNotifs,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "فشل التنظيف" },
      { status: 500 }
    );
  }
}
