import { NextResponse } from "next/server";
import {
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { FieldValue } from "firebase-admin/firestore";
import { verifyActiveUserToken } from "@/lib/server/active-user";
import { safeRedirect } from "@/lib/safe-redirect";

/**
 * API route: POST /api/notifications/send
 *
 * يُستدعى من client-code بعد إنشاء notification document في Firestore.
 * يقرأ FCM tokens للمستخدم المستهدف، ويرسل push عبر Firebase Admin SDK.
 *
 * Auth:
 *   نطلب من الـclient أن يُمرّر idToken المستخدم (المُرسِل) في header.
 *   نتحقّق من صحته عبر Admin SDK، ونتأكد أن المستخدم الذي يُرسل = نفسه
 *   الذي كتب الإشعار. هذا يمنع spam من users عشوائيين.
 *
 *   حالة استثنائية: الأدمن يمكنه إرسال لأي uid (للإشعارات الجماعية).
 *
 * Environment variables المطلوبة على Vercel:
 *   - FIREBASE_ADMIN_PROJECT_ID
 *   - FIREBASE_ADMIN_CLIENT_EMAIL
 *   - FIREBASE_ADMIN_PRIVATE_KEY  (احرصي على \n الصحيحة - راجعي SETUP.md)
 *
 * Request body:
 *   {
 *     userId: string;         // مستلم الإشعار
 *     title: string;
 *     body: string;
 *     link?: string;          // اختياري - مسار يفتح عند الضغط
 *     tag?: string;           // اختياري - لتجميع إشعارات مشابهة
 *   }
 *
 * Response:
 *   { ok: true, sent: number }  أو
 *   { ok: false, error: string }
 */

// نمنع caching هذه الـroute (تستخدم Admin SDK + auth verification).
export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Admin SDK لا يعمل على edge runtime

// ============================================================
// Lazy admin app init (مرة واحدة per cold start)
// ============================================================
function getAdminApp(): AdminApp {
  const existing = getAdminApps();
  if (existing.length > 0) return existing[0]!;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // الـprivate key على Vercel يُحفظ بـ\n حرفية (literal). نحوّلها لـnewlines.
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env vars are missing. Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }

  return initializeAdminApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

// ============================================================
// POST handler
// ============================================================
export async function POST(request: Request) {
  try {
    // -- 1) parse body
    let payload: {
      userId?: string;
      title?: string;
      body?: string;
      link?: string;
      tag?: string;
      notificationId?: string;
    };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { userId, title, body, link, tag, notificationId } = payload;
    if (!userId || !title || !body) {
      return NextResponse.json(
        { ok: false, error: "userId, title, body are required" },
        { status: 400 }
      );
    }

    // -- 2) verify caller via Bearer idToken
    const authHeader = request.headers.get("authorization") || "";
    const idToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";
    if (!idToken) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization Bearer token" },
        { status: 401 }
      );
    }

    const adminApp = getAdminApp();
    const { getAuth: getAdminAuth } = await import("firebase-admin/auth");
    const auth = getAdminAuth(adminApp);

    let callerUid: string;
    let callerIsAdmin = false;
    try {
      // W0: ban-aware (revoked tokens and banned accounts are refused)
      const decoded = await verifyActiveUserToken(idToken);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid auth token" },
        { status: 401 }
      );
    }

    // فحص is admin من Firestore (لا نعتمد على custom claims لتقليل التعقيد)
    const adminFs = getAdminFirestore(adminApp);
    try {
      const callerDoc = await adminFs.collection("users").doc(callerUid).get();
      callerIsAdmin = callerDoc.exists && callerDoc.data()?.isAdmin === true;
    } catch {
      // فشل قراءة - نعامله كمستخدم عادي.
    }

    // قيد بسيط: المستخدم العادي يستطيع إرسال لـuser آخر فقط (وليس لنفسه
    // بشكل اعتيادي - لكن نسمح للسهولة). لا قيد إذا كان أدمن.
    // مهم: لا نتحقّق من علاقة بين المرسل والمستلم - الـclient يكتب إشعارات
    // طبيعية (تعليق، رد، رسالة) وهذه نقاط مشروعة.
    // الحماية الفعلية ضد abuse: rate limiting (مؤجَّل) + Firestore rules
    // على notifications collection.
    // ------------------------------------------------------------------
    // W0 security (2026-11-19): a push is sent only for a real event.
    //  - admin: free text (link still same-site);
    //  - website notifications: the caller passes the notificationId it just
    //    created; title/body/link come from that document, once (pushed=true);
    //  - chat (mobile app): link /chat/{id} and BOTH caller and recipient must be
    //    participants of that chat.
    // Anything else is refused, links are same-site paths only, and a caller can
    // send at most PUSH_PER_MINUTE pushes per minute.
    // ------------------------------------------------------------------
    const cap = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
    let finalTitle = cap(title, 80);
    let finalBody = cap(body, 240);
    let finalLink = safeRedirect(link, "/notifications");

    if (!callerIsAdmin) {
      const PUSH_PER_MINUTE = 30;
      const rlRef = adminFs.collection("rateLimits").doc(`push_${callerUid}`);
      const allowed = await adminFs.runTransaction(async (tx) => {
        const now = Date.now();
        const d = (await tx.get(rlRef)).data() || {};
        const fresh = !d.windowStart || now - Number(d.windowStart) > 60_000;
        const count = fresh ? 0 : Number(d.count) || 0;
        if (count >= PUSH_PER_MINUTE) return false;
        tx.set(rlRef, { windowStart: fresh ? now : d.windowStart, count: count + 1 });
        return true;
      });
      if (!allowed) {
        return NextResponse.json({ ok: false, error: "Too many notifications" }, { status: 429 });
      }

      if (typeof notificationId === "string" && notificationId) {
        const nRef = adminFs.collection("notifications").doc(notificationId);
        const doc = await adminFs.runTransaction(async (tx) => {
          const snap = await tx.get(nRef);
          const n = snap.data();
          if (!snap.exists || !n || n.userId !== userId || n.pushedAt) return null;
          const created = n.createdAt?.toMillis?.() ?? 0;
          if (!created || Date.now() - created > 5 * 60_000) return null;
          tx.update(nRef, { pushedAt: FieldValue.serverTimestamp(), pushedBy: callerUid });
          return n;
        });
        if (!doc) {
          return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }
        finalTitle = cap(doc.title, 80);
        finalBody = cap(doc.body, 240);
        finalLink = safeRedirect(doc.link, "/notifications");
      } else {
        const m = /^\/chat\/([A-Za-z0-9_-]{1,200})$/.exec(String(link || ""));
        const chat = m ? await adminFs.collection("chats").doc(m[1]).get() : null;
        const parts: unknown = chat?.exists ? chat.data()?.participants : null;
        const ok = Array.isArray(parts) && parts.includes(callerUid) && parts.includes(userId) && callerUid !== userId;
        if (!m || !ok) {
          return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }
        finalLink = `/chat/${m[1]}`;
      }
    }
    if (!finalTitle || !finalBody) {
      return NextResponse.json({ ok: false, error: "Empty notification" }, { status: 400 });
    }

    // -- 3) fetch tokens for target user
    const tokensSnap = await adminFs
      .collection("users")
      .doc(userId)
      .collection("fcmTokens")
      .get();

    if (tokensSnap.empty) {
      // لا tokens - المستخدم لم يفعّل الإشعارات. ليس خطأ.
      return NextResponse.json({ ok: true, sent: 0, reason: "no-tokens" });
    }

    const tokenDocs = tokensSnap.docs.map((d) => ({
      id: d.id,
      token: d.data().token as string,
    }));

    // -- 4) send via Admin Messaging
    const messaging = getAdminMessaging(adminApp);

    // نستخدم sendEachForMulticast: يُرسل لكل token ويُرجع نتائج فردية.
    // أفضل من sendMulticast (deprecated) في النسخ الحديثة.
    const response = await messaging.sendEachForMulticast({
      tokens: tokenDocs.map((t) => t.token),
      // notification field يجعل المتصفح يعرض الـnotif تلقائياً حتى لو
      // الـSW لم يستلم الـevent. data field يصل لـonBackgroundMessage.
      notification: { title: finalTitle, body: finalBody },
      data: {
        title: finalTitle,
        body: finalBody,
        link: finalLink,
        tag: tag || "bratsho",
      },
      webpush: {
        fcmOptions: {
          link: finalLink,
        },
        notification: {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          dir: "rtl",
          lang: "ar",
          tag: tag || "bratsho",
        },
      },
    });

    // -- 5) ننظّف tokens فشل إرسالها بـ"unregistered" (مستخدم أزال
    //       الإذن أو غيّر جهازه)
    const invalidIds: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code || "";
        if (
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/invalid-registration-token"
        ) {
          invalidIds.push(tokenDocs[idx].id);
        }
      }
    });
    if (invalidIds.length > 0) {
      const batch = adminFs.batch();
      for (const id of invalidIds) {
        batch.delete(
          adminFs.collection("users").doc(userId).collection("fcmTokens").doc(id)
        );
      }
      try {
        await batch.commit();
      } catch {
        /* لا نُفشل الـrequest كاملاً بسبب فشل تنظيف */
      }
    }

    return NextResponse.json({
      ok: true,
      sent: response.successCount,
      failed: response.failureCount,
      cleaned: invalidIds.length,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/notifications/send] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
