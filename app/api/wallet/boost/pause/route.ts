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
 * POST /api/wallet/boost/pause
 * Auth: مالك الإعلان.
 * body: { listingId }
 *
 * يوقف الحملة الممولة مؤقتاً:
 *  - يحسب الوقت المتبقي ويجمّده في boostPausedRemainingMs.
 *  - يحذف boostedUntil → يتوقف الظهور الممول فوراً.
 *  - لا تُخصم أيام أثناء الإيقاف.
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

  try {
    await fs.runTransaction(async (tx) => {
      const snap = await tx.get(listingRef);
      if (!snap.exists) throw new Error("الإعلان غير موجود");
      const d = snap.data() || {};
      if (d.ownerId !== uid) throw new Error("هذا الإعلان لا يخصّك");
      if (d.boostPaused === true) throw new Error("الحملة متوقفة بالفعل");

      const untilMs = d.boostedUntil?.toMillis?.() || 0;
      const remaining = untilMs - Date.now();
      if (remaining <= 0) throw new Error("لا توجد حملة نشطة لإيقافها");

      tx.update(listingRef, {
        boostPaused: true,
        boostPausedRemainingMs: remaining,
        boostedUntil: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل الإيقاف", 400);
  }

  return NextResponse.json({ ok: true, status: "paused" });
}
