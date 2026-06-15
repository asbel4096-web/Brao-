import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/wallet/boost/resume
 * Auth: مالك الإعلان.
 * body: { listingId }
 *
 * يستأنف الحملة الممولة من الوقت المتبقي المجمّد:
 *  - boostedUntil = الآن + boostPausedRemainingMs.
 *  - يُلغي boostPaused + boostPausedRemainingMs.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonError("Unauthorized", 401);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  let uid: string;
  try {
    uid = (await getAuth(app).verifyIdToken(authHeader.slice(7))).uid;
  } catch {
    return jsonError("Invalid token", 401);
  }

  let body: { listingId?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }
  const listingId = (body.listingId || "").trim();
  if (!listingId) return jsonError("Missing listingId", 400);

  const listingRef = fs.collection("listings").doc(listingId);
  let newUntil: Date | undefined;

  try {
    await fs.runTransaction(async (tx) => {
      const snap = await tx.get(listingRef);
      if (!snap.exists) throw new Error("الإعلان غير موجود");
      const d = snap.data() || {};
      if (d.ownerId !== uid) throw new Error("هذا الإعلان لا يخصّك");
      if (d.boostPaused !== true) throw new Error("الحملة ليست متوقفة");

      const remaining = Number(d.boostPausedRemainingMs) || 0;
      if (remaining <= 0) throw new Error("لا يوجد وقت متبقٍ للاستئناف");

      newUntil = new Date(Date.now() + remaining);
      tx.update(listingRef, {
        boostedUntil: newUntil,
        boostPaused: false,
        boostPausedRemainingMs: FieldValue.delete(),
        boostNotif3d: FieldValue.delete(),
        boostNotif1d: FieldValue.delete(),
        boostNotifExpired: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الاستئناف", 400);
  }

  return NextResponse.json({
    ok: true,
    status: "active",
    boostedUntil: newUntil?.toISOString() || null,
  });
}
