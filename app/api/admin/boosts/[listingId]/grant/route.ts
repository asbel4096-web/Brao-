import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { BOOST_SERVICES, type BoostServiceKey } from "@/lib/wallet/boost";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/admin/boosts/[listingId]/grant
 * body: { service: BoostServiceKey, days?: number, reason?: string }
 *
 * يمنح أدمن boost/featured مجاناً لإعلان.
 *  - لا يخصم BC
 *  - يكتب walletTransactions بـamount=0 للـaudit
 *  - يُسجّل في adminLogs
 */

export async function POST(
  request: Request,
  { params }: { params: { listingId: string } }
) {
  const result = await verifyAdminRequest(request, "users.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const listingId = params.listingId;
  if (!listingId) return jsonError("Missing listingId", 400);

  let body: { service?: string; days?: number; reason?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON", 400);
  }

  const serviceKey = body.service as BoostServiceKey;
  const service = BOOST_SERVICES[serviceKey];
  if (!service) return jsonError("Service غير صالحة", 400);

  const durationDays =
    typeof body.days === "number" && body.days > 0 && body.days <= 365
      ? Math.floor(body.days)
      : service.durationDays || 7;

  const reason = (body.reason || "").trim().slice(0, 300) || "منح من الأدمن";

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const listingRef = fs.collection("listings").doc(listingId);
  const txRef = fs.collection("walletTransactions").doc();

  let res: { ownerId: string; title: string; expiresAt?: Date };

  try {
    res = await fs.runTransaction(async (tx) => {
      const listingSnap = await tx.get(listingRef);
      if (!listingSnap.exists) throw new Error("الإعلان غير موجود");
      const listingData = listingSnap.data() || {};
      const ownerId = listingData.ownerId as string;
      const title = listingData.title || "";

      const now = Date.now();
      let expiresAt: Date | undefined;
      const updates: Record<string, any> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (serviceKey === "vip") {
        // VIP: أعلى أولوية + ظهور في الصفحة الرئيسية
        const existingMs = listingData.vipUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        expiresAt = new Date(baseMs + durationDays * 24 * 60 * 60 * 1000);
        updates.vipUntil = expiresAt;
        updates.vipAt = FieldValue.serverTimestamp();
        updates.featured = true;
        updates.featuredUntil = expiresAt;
        updates.featuredBy = "admin_grant_vip";
      } else if (serviceKey === "boost") {
        const existingMs = listingData.boostedUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        expiresAt = new Date(baseMs + durationDays * 24 * 60 * 60 * 1000);
        updates.boostedUntil = expiresAt;
        updates.boostedAt = FieldValue.serverTimestamp();
      } else if (serviceKey === "featured") {
        const existingMs = listingData.featuredUntil?.toMillis?.() || 0;
        const baseMs = existingMs > now ? existingMs : now;
        expiresAt = new Date(baseMs + durationDays * 24 * 60 * 60 * 1000);
        updates.featured = true;
        updates.featuredUntil = expiresAt;
        updates.featuredAt = FieldValue.serverTimestamp();
        updates.featuredBy = "admin_grant";
      }

      tx.update(listingRef, updates);

      // معاملة بـamount=0 (audit)
      tx.set(txRef, {
        userId: ownerId,
        amount: 0,
        type: serviceKey === "featured" ? "featured_listing" : "boost",
        reason: `${service.label} مجاني (أدمن) - ${reason}`,
        balanceAfter: 0, // ليس صحيحاً تماماً لكن amount=0 يدلّ على عدم تأثير
        createdBy: caller.uid,
        createdByEmail: caller.email,
        metadata: {
          listingId,
          service: serviceKey,
          durationDays,
          granted: true,
          adminReason: reason,
        },
        createdAt: FieldValue.serverTimestamp(),
      });

      return { ownerId, title, expiresAt };
    });
  } catch (err: any) {
    return jsonError(err?.message || "فشل المنح", 400);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "boost_grant",
    targetType: "listing",
    targetId: listingId,
    reason,
    after: {
      service: serviceKey,
      durationDays,
      ownerId: res.ownerId,
      expiresAt: res.expiresAt?.toISOString(),
    },
  });

  return NextResponse.json({
    ok: true,
    service: serviceKey,
    expiresAt: res.expiresAt?.toISOString() || null,
  });
}
