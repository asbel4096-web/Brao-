import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";

/**
 * POST /api/admin/wallet-settings
 *
 * Body: { walletEnabled: boolean }
 *
 * يُحدّث config/app.walletEnabled.
 * متاح للأدمن فقط (يتحقق من isAdmin في وثيقة المستخدم).
 */

async function getAdminUid(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  try {
    getAdminApp();
    const decoded = await getAuth().verifyIdToken(match[1]);
    if (!decoded?.uid) return null;

    // تحقق من isAdmin في Firestore
    const db = getAdminFirestore();
    const userSnap = await db.collection("users").doc(decoded.uid).get();
    if (!userSnap.exists) return null;
    const data = userSnap.data() || {};
    if (data.isAdmin !== true) return null;

    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const adminUid = await getAdminUid(req);
    if (!adminUid) {
      return jsonError("غير مصرّح - للأدمن فقط", 403);
    }

    const body = await req.json().catch(() => ({}));
    const walletEnabled = body.walletEnabled === true;

    const db = getAdminFirestore();

    // حفظ في config/app (merge لتجنّب مسح حقول أخرى)
    await db.collection("config").doc("app").set(
      {
        walletEnabled,
        walletUpdatedAt: FieldValue.serverTimestamp(),
        walletUpdatedBy: adminUid,
      },
      { merge: true }
    );

    // سجل إداري (best-effort)
    try {
      await db.collection("adminLogs").add({
        action: "wallet_toggle",
        adminUid,
        details: { walletEnabled },
        createdAt: FieldValue.serverTimestamp(),
      });
    } catch {
      /* تجاهل لو فشل السجل */
    }

    return Response.json({ success: true, walletEnabled });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الحفظ", 500);
  }
}

/**
 * GET /api/admin/wallet-settings
 * يُرجع الحالة الحالية (للأدمن).
 */
export async function GET(req: NextRequest) {
  try {
    const adminUid = await getAdminUid(req);
    if (!adminUid) {
      return jsonError("غير مصرّح", 403);
    }

    const db = getAdminFirestore();
    const snap = await db.collection("config").doc("app").get();
    const walletEnabled = snap.exists
      ? snap.data()?.walletEnabled !== false
      : true;

    return Response.json({ walletEnabled });
  } catch (err: any) {
    return jsonError(err?.message || "فشل القراءة", 500);
  }
}
