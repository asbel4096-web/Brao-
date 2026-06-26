import { NextResponse } from "next/server";
import {
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import { getMessaging as getAdminMessaging } from "firebase-admin/messaging";
import {
  getFirestore as getAdminFirestore,
  FieldValue,
} from "firebase-admin/firestore";

/**
 * POST /api/notifications/broadcast
 *
 * يُرسل إشعاراً جماعياً لكل مستخدمي المنصة. للأدمن فقط.
 *
 * Body:
 *   {
 *     title: string;       // 3-100 char
 *     body:  string;       // 5-500 char
 *     type:  "broadcast_featured" | "broadcast_service"
 *          | "broadcast_campaign" | "broadcast_general";
 *     link?: string;       // المسار الذي يُفتح عند الضغط
 *   }
 *
 * Headers:
 *   Authorization: Bearer <firebase-id-token>
 *
 * الـflow:
 *   1) parse + validate body
 *   2) verify idToken + isAdmin (Firestore: users/{uid}.isAdmin === true)
 *   3) إنشاء وثيقة broadcast سجلّ (status=processing)
 *   4) قراءة كل users → كتابة notification doc لكل واحد (in-app history)
 *   5) قراءة أول 500 fcmTokens (collectionGroup) → multicast push
 *   6) تنظيف tokens منتهية
 *   7) تحديث broadcast doc بالنتائج (status=completed)
 *
 * قيود مقصودة:
 *   - 500 token كحد أقصى للـpush في طلب واحد (Vercel timeout + FCM cap).
 *   - 5000 user كحد أقصى لكتابة in-app notifications (Vercel timeout).
 *   - أبعد من ذلك يحتاج background job (مؤجَّل).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = new Set([
  "broadcast_featured",
  "broadcast_service",
  "broadcast_campaign",
  "broadcast_general",
]);

const FIRESTORE_BATCH_SIZE = 500;
const FCM_BATCH_SIZE = 500;
const MAX_RECIPIENTS = 5000;

function getAdminApp(): AdminApp {
  const existing = getAdminApps();
  if (existing.length > 0) return existing[0]!;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env vars missing. Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }

  return initializeAdminApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export async function POST(request: Request) {
  try {
    // ============================================================
    // 1) parse + validate body
    // ============================================================
    let payload: {
      title?: string;
      body?: string;
      type?: string;
      link?: string;
      segment?: string;
      targetUserId?: string;
      imageUrl?: string;
    };
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const title = String(payload.title || "").trim();
    const body = String(payload.body || "").trim();
    const type = String(payload.type || "").trim();
    const link = payload.link ? String(payload.link).trim() : "";
    // الشريحة المستهدفة (افتراضي: الكل)
    const segment = String(payload.segment || "all").trim();
    const targetUserId = String(payload.targetUserId || "").trim();
    // صورة اختيارية (يجب أن تكون رابط https)
    const imageUrl = payload.imageUrl ? String(payload.imageUrl).trim() : "";

    const ALLOWED_SEGMENTS = new Set([
      "all",
      "verified",
      "dealers",
      "showrooms",
      "user",
    ]);
    if (!ALLOWED_SEGMENTS.has(segment)) {
      return NextResponse.json(
        { ok: false, error: "شريحة غير صالحة." },
        { status: 400 }
      );
    }
    if (segment === "user" && !targetUserId) {
      return NextResponse.json(
        { ok: false, error: "حدّد معرّف المستخدم المستهدف." },
        { status: 400 }
      );
    }
    if (imageUrl && !imageUrl.startsWith("https://")) {
      return NextResponse.json(
        { ok: false, error: "رابط الصورة يجب أن يبدأ بـ https://" },
        { status: 400 }
      );
    }

    if (!title || title.length < 3) {
      return NextResponse.json(
        { ok: false, error: "العنوان قصير جداً (3 أحرف على الأقل)." },
        { status: 400 }
      );
    }
    if (title.length > 100) {
      return NextResponse.json(
        { ok: false, error: "العنوان طويل (الحد الأقصى 100 حرف)." },
        { status: 400 }
      );
    }
    if (!body || body.length < 5) {
      return NextResponse.json(
        { ok: false, error: "النص قصير جداً (5 أحرف على الأقل)." },
        { status: 400 }
      );
    }
    if (body.length > 500) {
      return NextResponse.json(
        { ok: false, error: "النص طويل (الحد الأقصى 500 حرف)." },
        { status: 400 }
      );
    }
    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { ok: false, error: "نوع broadcast غير صالح." },
        { status: 400 }
      );
    }

    // ============================================================
    // 2) auth: idToken + isAdmin
    // ============================================================
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
    try {
      const decoded = await auth.verifyIdToken(idToken);
      callerUid = decoded.uid;
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid auth token" },
        { status: 401 }
      );
    }

    const adminFs = getAdminFirestore(adminApp);
    const callerDoc = await adminFs.collection("users").doc(callerUid).get();
    const callerIsAdmin =
      callerDoc.exists && callerDoc.data()?.isAdmin === true;

    if (!callerIsAdmin) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: admin only" },
        { status: 403 }
      );
    }

    // ============================================================
    // 3) إنشاء وثيقة broadcast سجلّ
    // ============================================================
    const broadcastRef = adminFs.collection("broadcasts").doc();
    const broadcastId = broadcastRef.id;
    await broadcastRef.set({
      id: broadcastId,
      title,
      body,
      type,
      link,
      segment,
      targetUserId: segment === "user" ? targetUserId : null,
      image: imageUrl || null,
      createdBy: callerUid,
      createdByEmail: callerDoc.data()?.email || "",
      createdAt: FieldValue.serverTimestamp(),
      status: "processing",
      recipientCount: 0,
      pushSentCount: 0,
      pushFailedCount: 0,
    });

    // ============================================================
    // 4) قراءة كل المستخدمين (IDs فقط، خفيف)
    // ============================================================
    // ============================================================
    // 4) تحديد المستلمين حسب الشريحة
    // ============================================================
    let allUids: string[] = [];
    if (segment === "user") {
      // مستخدم محدّد — نتأكّد من وجوده
      const targetDoc = await adminFs
        .collection("users")
        .doc(targetUserId)
        .get();
      if (targetDoc.exists) allUids = [targetUserId];
    } else if (segment === "all") {
      // select() بدون args يجلب وثائق بدون أي حقل = أخفّ قراءة ممكنة.
      const usersSnap = await adminFs
        .collection("users")
        .select()
        .limit(MAX_RECIPIENTS)
        .get();
      allUids = usersSnap.docs.map((d) => d.id);
    } else {
      // verified / dealers / showrooms → نبدأ من الموثّقين ثم نفلتر النوع.
      const usersSnap = await adminFs
        .collection("users")
        .where("isVerifiedDealer", "==", true)
        .select("verificationType", "businessName", "dealerName", "dealerLogo")
        .limit(MAX_RECIPIENTS)
        .get();
      allUids = usersSnap.docs
        .filter((d) => {
          if (segment === "verified") return true;
          const data = d.data() as any;
          const vt = data.verificationType as string | undefined;
          if (segment === "dealers") {
            return (
              vt === "dealer" ||
              (!vt && !!data.businessName && !data.dealerName)
            );
          }
          if (segment === "showrooms") {
            return (
              vt === "showroom" ||
              (!vt && (!!data.dealerName || !!data.dealerLogo))
            );
          }
          return false;
        })
        .map((d) => d.id);
    }

    if (allUids.length === 0) {
      await broadcastRef.update({
        status: "completed",
        completedAt: FieldValue.serverTimestamp(),
        recipientCount: 0,
      });
      return NextResponse.json({
        ok: true,
        broadcastId,
        recipientCount: 0,
        pushSent: 0,
        pushFailed: 0,
        reason: "no-users",
      });
    }

    // ============================================================
    // 5) كتابة notification doc لكل user في batches
    // ============================================================
    const notificationsCol = adminFs.collection("notifications");
    let writtenCount = 0;

    for (let i = 0; i < allUids.length; i += FIRESTORE_BATCH_SIZE) {
      const chunk = allUids.slice(i, i + FIRESTORE_BATCH_SIZE);
      const batch = adminFs.batch();
      for (const uid of chunk) {
        const docRef = notificationsCol.doc();
        batch.set(docRef, {
          userId: uid,
          type,
          title,
          body,
          image: imageUrl || null,
          link: link || "/notifications",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          meta: {
            broadcastId,
            broadcastType: type,
            actorId: callerUid,
          },
        });
      }
      try {
        await batch.commit();
        writtenCount += chunk.length;
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[broadcast] batch commit failed:", err?.message);
        // نُكمل - فقدان batch واحد أفضل من فقدان الكل.
      }
    }

    // ============================================================
    // 6) جمع FCM tokens + إرسال push (best-effort)
    // ============================================================
    let pushSent = 0;
    let pushFailed = 0;
    let tokensConsidered = 0;
    let invalidCleaned = 0;

    try {
      // جمع توكنات FCM حسب الشريحة.
      type TokDoc = {
        ref: FirebaseFirestore.DocumentReference;
        token: string;
      };
      let _tokenDocs: TokDoc[] = [];
      if (segment === "all") {
        // collectionGroup يجلب كل users/*/fcmTokens/* في query واحد - أسرع.
        const tokensSnap = await adminFs
          .collectionGroup("fcmTokens")
          .limit(FCM_BATCH_SIZE)
          .get();
        _tokenDocs = tokensSnap.docs
          .map((d) => ({
            ref: d.ref,
            token: (d.data().token as string) || "",
          }))
          .filter((t) => t.token);
      } else {
        // توكنات المستلمين المحدّدين فقط (شريحة محدّدة).
        for (const uid of allUids) {
          if (_tokenDocs.length >= FCM_BATCH_SIZE) break;
          const snap = await adminFs
            .collection("users")
            .doc(uid)
            .collection("fcmTokens")
            .get();
          for (const d of snap.docs) {
            const token = (d.data().token as string) || "";
            if (token) _tokenDocs.push({ ref: d.ref, token });
          }
        }
      }

      tokensConsidered = _tokenDocs.length;

      if (tokensConsidered > 0) {
        const tokenDocs = _tokenDocs;

        if (tokenDocs.length > 0) {
          const messaging = getAdminMessaging(adminApp);
          const response = await messaging.sendEachForMulticast({
            tokens: tokenDocs.map((t) => t.token),
            notification: {
              title,
              body,
              ...(imageUrl ? { imageUrl } : {}),
            },
            data: {
              title,
              body,
              link: link || "/notifications",
              tag: type,
              broadcastId,
              ...(imageUrl ? { image: imageUrl } : {}),
            },
            webpush: {
              fcmOptions: { link: link || "/notifications" },
              notification: {
                icon: "/icons/icon-192.png",
                badge: "/icons/icon-192.png",
                ...(imageUrl ? { image: imageUrl } : {}),
                dir: "rtl",
                lang: "ar",
                tag: type,
              },
            },
          });

          pushSent = response.successCount;
          pushFailed = response.failureCount;

          // تنظيف tokens غير صالحة
          const invalidRefs: FirebaseFirestore.DocumentReference[] = [];
          response.responses.forEach((res, idx) => {
            if (!res.success) {
              const code = res.error?.code || "";
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
            const batch = adminFs.batch();
            for (const ref of chunk) batch.delete(ref);
            try {
              await batch.commit();
              invalidCleaned += chunk.length;
            } catch {
              /* ignore */
            }
          }
        }
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[broadcast] push send failed:", err?.message);
    }

    // ============================================================
    // 7) تحديث broadcast doc بالنتائج النهائية
    // ============================================================
    await broadcastRef.update({
      status: "completed",
      completedAt: FieldValue.serverTimestamp(),
      recipientCount: writtenCount,
      pushSentCount: pushSent,
      pushFailedCount: pushFailed,
      tokensConsidered,
      invalidTokensCleaned: invalidCleaned,
    });

    return NextResponse.json({
      ok: true,
      broadcastId,
      recipientCount: writtenCount,
      pushSent,
      pushFailed,
      tokensConsidered,
      capped:
        allUids.length >= MAX_RECIPIENTS
          ? `Sent to first ${MAX_RECIPIENTS} users.`
          : undefined,
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[/api/notifications/broadcast] error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Internal error" },
      { status: 500 }
    );
  }
}
