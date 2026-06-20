import { NextResponse } from "next/server";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
} from "@/lib/admin/api-helpers";
import {
  DEFAULT_FRIDAY_SETTINGS,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";
import { computeMarketState } from "@/lib/friday-market/market-time";

/**
 * GET /api/cron/friday-market-open
 *
 * نقطة Cron تُرسل إشعار "فُتح سوق الجمعة" تلقائياً (Vercel Cron).
 *
 * المصادقة: CRON_SECRET (هيدر Authorization: Bearer <secret>).
 *
 * المنطق (يُشغَّل يومياً صباحاً، لكنه يُرسل فقط عند تحقّق الشروط):
 *  - السوق مفعّل (settings.enabled)
 *  - السوق مفتوح الآن (داخل نافذة الجمعة)
 *  - لم يُرسل إشعار لجمعة هذا الأسبوع (lastNotifiedWeek !== weekKey)
 * فيتكيّف تلقائياً مع يوم/ساعة الفتح التي يضبطها الأدمن، ويرسل مرّة واحدة
 * في الأسبوع فقط.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FIRESTORE_BATCH_SIZE = 500;
const FCM_BATCH_SIZE = 500;
const MAX_RECIPIENTS = 5000;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization") || "";
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "غير مصرّح" }, { status: 401 });
  }

  try {
    const app = getAdminApp();
    const fs = getAdminFirestore(app);

    const cfgSnap = await fs.collection("config").doc("fridayMarket").get();
    const settings: FridayMarketSettings = cfgSnap.exists
      ? { ...DEFAULT_FRIDAY_SETTINGS, ...(cfgSnap.data() as any) }
      : DEFAULT_FRIDAY_SETTINGS;

    // السوق موقوف؟ لا نرسل
    if (settings.enabled === false) {
      return NextResponse.json({ ok: true, skipped: "disabled" });
    }

    const state = computeMarketState(settings, Date.now());
    const weekKey = state.weekKey;
    const lastNotifiedWeek = (cfgSnap.data() || {}).lastNotifiedWeek || "";

    // ليس مفتوحاً الآن، أو سبق الإرسال لهذه الجمعة → تخطٍّ
    if (!state.isOpen) {
      return NextResponse.json({ ok: true, skipped: "closed", weekKey });
    }
    if (lastNotifiedWeek === weekKey) {
      return NextResponse.json({ ok: true, skipped: "already-sent", weekKey });
    }

    const title = "🛒 سوق الجمعة فُتح الآن!";
    const text =
      "عروض الجمعة متاحة لوقت محدود — تصفّح وانشر عرضك السريع الآن 🔥";
    const link = "/friday-market";

    // إشعارات in-app لكل المستخدمين (دفعات)
    const usersSnap = await fs
      .collection("users")
      .select()
      .limit(MAX_RECIPIENTS)
      .get();
    const allUids = usersSnap.docs.map((d) => d.id);

    const notificationsCol = fs.collection("notifications");
    let writtenCount = 0;
    for (let i = 0; i < allUids.length; i += FIRESTORE_BATCH_SIZE) {
      const chunk = allUids.slice(i, i + FIRESTORE_BATCH_SIZE);
      const batch = fs.batch();
      for (const uid of chunk) {
        batch.set(notificationsCol.doc(), {
          userId: uid,
          type: "broadcast_general",
          title,
          body: text,
          link,
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          meta: { source: "friday_market_open_cron", weekKey },
        });
      }
      try {
        await batch.commit();
        writtenCount += chunk.length;
      } catch {
        /* نُكمل */
      }
    }

    // FCM push
    let pushSent = 0;
    let pushFailed = 0;
    try {
      const tokensSnap = await fs
        .collectionGroup("fcmTokens")
        .limit(FCM_BATCH_SIZE)
        .get();
      const tokenDocs = tokensSnap.docs
        .map((d) => ({ ref: d.ref, token: (d.data().token as string) || "" }))
        .filter((t) => t.token);

      if (tokenDocs.length > 0) {
        const messaging = getAdminMessaging(app);
        const response = await messaging.sendEachForMulticast({
          tokens: tokenDocs.map((t) => t.token),
          notification: { title, body: text },
          data: { title, body: text, link, tag: "friday_market_open" },
          webpush: {
            fcmOptions: { link },
            notification: {
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              dir: "rtl",
              lang: "ar",
              tag: "friday_market_open",
            },
          },
        });
        pushSent = response.successCount;
        pushFailed = response.failureCount;

        const invalidRefs: FirebaseFirestore.DocumentReference[] = [];
        response.responses.forEach((r, idx) => {
          if (!r.success) {
            const code = r.error?.code || "";
            if (
              code === "messaging/registration-token-not-registered" ||
              code === "messaging/invalid-registration-token"
            ) {
              invalidRefs.push(tokenDocs[idx].ref);
            }
          }
        });
        for (let i = 0; i < invalidRefs.length; i += FIRESTORE_BATCH_SIZE) {
          const chunk = invalidRefs.slice(i, i + FIRESTORE_BATCH_SIZE);
          const batch = fs.batch();
          for (const ref of chunk) batch.delete(ref);
          try {
            await batch.commit();
          } catch {
            /* ignore */
          }
        }
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[cron/friday-market-open] push failed:", err?.message);
    }

    // تسجيل أنه أُرسل لهذه الجمعة
    await fs
      .collection("config")
      .doc("fridayMarket")
      .set(
        {
          lastNotifiedWeek: weekKey,
          lastNotifiedAt: FieldValue.serverTimestamp(),
          lastNotifiedBy: "cron",
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      sent: true,
      weekKey,
      recipientCount: writtenCount,
      pushSent,
      pushFailed,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[cron/friday-market-open] error:", err?.message);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
