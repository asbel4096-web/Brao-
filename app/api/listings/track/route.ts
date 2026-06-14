import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";

/**
 * POST /api/listings/track
 *
 * Body: { listingId: string, event: EventType }
 *
 * يُسجّل حدثاً على الإعلان ويزيد العدّاد المناسب atomically.
 * كل الكتابة تتم عبر Admin SDK → لا يمكن التلاعب بالأرقام من الواجهة.
 *
 * الأحداث المدعومة وحقول العدّاد:
 *   view      → views
 *   favorite  → favoritesCount   (للحفظ؛ الإزالة لا تُنقص هنا)
 *   chat      → chatClicks
 *   phone     → phoneClicks
 *   whatsapp  → whatsappClicks
 *   share     → shareClicks
 *
 * منع التلاعب + الدقّة:
 *  - لا يُحتسب أي حدث من المالك على إعلانه (نتحقق من ownerId).
 *  - "view": مرّة واحدة لكل مستخدم/زائر عبر مستند dedup في
 *    listings/{id}/viewers/{viewerKey}. لو موجود، لا نزيد.
 *  - باقي الأحداث: تُحتسب (نقرة فعلية) لكن نمنع المالك.
 *  - viewerKey: uid للمسجّل، أو hash للزائر (يُمرَّر من العميل).
 */

const EVENT_FIELD: Record<string, string> = {
  view: "views",
  favorite: "favoritesCount",
  chat: "chatClicks",
  phone: "phoneClicks",
  whatsapp: "whatsappClicks",
  share: "shareClicks",
  sponsoredImpression: "sponsoredImpressions",
  sponsoredClick: "sponsoredClicks",
};

async function getUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(m[1]);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const listingId = String(body.listingId || "").trim();
    const event = String(body.event || "").trim();
    // مفتاح زائر مجهول (يُولَّد ويُخزَّن في localStorage على العميل)
    const guestKey = String(body.guestKey || "").trim().slice(0, 64);

    if (!listingId || !EVENT_FIELD[event]) {
      return jsonError("طلب غير صحيح", 400);
    }

    getAdminApp();
    const db = getAdminFirestore();

    // المستخدم الحالي (قد يكون null لزائر)
    const uid = await getUid(req);

    const listingRef = db.collection("listings").doc(listingId);
    const snap = await listingRef.get();
    if (!snap.exists) {
      return jsonError("الإعلان غير موجود", 404);
    }
    const listing = snap.data() || {};

    // منع احتساب نقرات المالك على إعلانه
    if (uid && listing.ownerId === uid) {
      return Response.json({ success: true, skipped: "owner" });
    }

    const field = EVENT_FIELD[event];
    const viewerKey = uid || (guestKey ? `g_${guestKey}` : null);

    // المشاهدة: dedup مرّة واحدة لكل viewer
    if (event === "view") {
      if (!viewerKey) {
        // بلا مفتاح، لا نزيد (نتجنّب تضخيم وهمي)
        return Response.json({ success: true, skipped: "no_key" });
      }
      const viewerRef = listingRef.collection("viewers").doc(viewerKey);
      const result = await db.runTransaction(async (tx) => {
        const v = await tx.get(viewerRef);
        if (v.exists) return { counted: false };
        tx.set(viewerRef, { at: FieldValue.serverTimestamp() });
        tx.update(listingRef, { views: FieldValue.increment(1) });
        return { counted: true };
      });
      return Response.json({ success: true, counted: result.counted });
    }

    // favorite / chat / phone / whatsapp / share → زيادة العدّاد
    await listingRef.update({
      [field]: FieldValue.increment(1),
    });

    return Response.json({ success: true, counted: true });
  } catch (err: any) {
    return jsonError(err?.message || "فشل التسجيل", 500);
  }
}
