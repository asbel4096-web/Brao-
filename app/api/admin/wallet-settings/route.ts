import { NextRequest } from "next/server";
import { getAuth } from "firebase-admin/auth";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { verifyAdminRequest } from "@/lib/admin/api-helpers";
import { NextResponse } from "next/server";

/**
 * POST /api/admin/wallet-settings
 *
 * Body: { walletEnabled: boolean }
 *
 * يُحدّث config/app.walletEnabled.
 * متاح للأدمن فقط (يتحقق من isAdmin في وثيقة المستخدم).
 */

async function getAdminUid(req: NextRequest): Promise<string | null> {
  // W0: one authorization path — "finance.manage" (money settings), banned/revoked rejected.
  const gate = await verifyAdminRequest(req, "finance.manage");
  return gate instanceof NextResponse ? null : gate.uid;
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
