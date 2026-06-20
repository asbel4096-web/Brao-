import { NextResponse } from "next/server";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import {
  getAdminApp,
  getAdminFirestore,
  FieldValue,
  jsonError,
  verifyAdminRequest,
  logAdminAction,
} from "@/lib/admin/api-helpers";
import {
  DEFAULT_FRIDAY_SETTINGS,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";
import { computeMarketState } from "@/lib/friday-market/market-time";

/**
 * POST /api/admin/friday-market/notify
 *
 * يرسل إشعار "فُتح سوق الجمعة" لكل المستخدمين (in-app + FCM push)، ويفتح
 * على /friday-market. للأدمن فقط.
 *
 * Body: { title?, body?, force?: boolean }
 *
 * حماية التكرار: يتذكّر آخر جمعة أُرسل لها (lastNotifiedWeek). لو طُلب
 * الإرسال لنفس الجمعة مرّة أخرى يرفض ما لم يكن force=true (تأكيد إضافي
 * من الواجهة) — حتى لا يصل إشعاران لكل المستخدمين بالخطأ.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const FIRESTORE_BATCH_SIZE = 500;
const FCM_BATCH_SIZE = 500;
const MAX_RECIPIENTS = 5000;
const PERMISSION = "settings.edit";

export async function POST(request: Request) {
  const res = await verifyAdminRequest(request, PERMISSION);
  if (res instanceof NextResponse) return res;
  const caller = res;

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const force = body.force === true;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  // الإعدادات + الجلسة الحالية
  const cfgSnap = await fs.collection("config").doc("fridayMarket").get();
  const settings: FridayMarketSettings = cfgSnap.exists
    ? { ...DEFAULT_FRIDAY_SETTINGS, ...(cfgSnap.data() as any) }
    : DEFAULT_FRIDAY_SETTINGS;

  const state = computeMarketState(settings, Date.now());
  const weekKey = state.weekKey;
  const lastNotifiedWeek = (cfgSnap.data() || {}).lastNotifiedWeek || "";

  // حماية التكرار
  if (!force && lastNotifiedWeek === weekKey) {
    return NextResponse.json({
      ok: false,
      already: true,
      weekKey,
      message: "سبق إرسال إشعار لجمعة هذا الأسبوع.",
    });
  }

  // نص الإشعار
  const title =
    String(body.title || "").trim() || "🛒 سوق الجمعة فُتح الآن!";
  const text =
    String(body.body || "").trim() ||
    "عروض الجمعة متاحة لوقت محدود — تصفّح وانشر عرضك السريع الآن 🔥";
  const link = "/friday-market";

  if (title.length > 100 || text.length > 500) {
    return jsonError("النص طويل جداً", 400);
  }

  // قراءة المستخدمين (IDs فقط)
  const usersSnap = await fs
    .collection("users")
    .select()
    .limit(MAX_RECIPIENTS)
    .get();
  const allUids = usersSnap.docs.map((d) => d.id);

  // كتابة إشعارات in-app على دفعات
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
        meta: { source: "friday_market_open", weekKey, actorId: caller.uid },
      });
    }
    try {
      await batch.commit();
      writtenCount += chunk.length;
    } catch {
      /* نُكمل */
    }
  }

  // FCM push (best-effort)
  let pushSent = 0;
  let pushFailed = 0;
  let tokensConsidered = 0;
  let invalidCleaned = 0;

  try {
    const tokensSnap = await fs
      .collectionGroup("fcmTokens")
      .limit(FCM_BATCH_SIZE)
      .get();
    tokensConsidered = tokensSnap.size;

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
          invalidCleaned += chunk.length;
        } catch {
          /* ignore */
        }
      }
    }
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[friday-market/notify] push failed:", err?.message);
  }

  // تسجيل آخر جمعة أُرسل لها
  try {
    await fs
      .collection("config")
      .doc("fridayMarket")
      .set(
        { lastNotifiedWeek: weekKey, lastNotifiedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
  } catch {
    /* ignore */
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "friday_market_notify",
    targetType: "fridayMarketWeek",
    targetId: weekKey,
    after: { recipientCount: writtenCount, pushSent, pushFailed },
  });

  return NextResponse.json({
    ok: true,
    weekKey,
    recipientCount: writtenCount,
    pushSent,
    pushFailed,
    tokensConsidered,
    invalidCleaned,
  });
}
