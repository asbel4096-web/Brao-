import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/admin/engagement/reset
 * body: { type: "likes" | "followers", id: string }
 *
 * likes:     يحذف كل listings/{id}/likes/* + users/{u}/likedListings/{id}
 *            ويصفّر listings/{id}.likesCount
 * followers: يحذف كل users/{id}/followers/* + users/{f}/following/{id}
 *            ويصفّر users/{id}.followersCount وينقص followingCount لكل متابع
 */
export async function POST(request: Request) {
  let body: { type?: string; id?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const type = (body.type || "").trim();
  const id = (body.id || "").trim();
  if (!id || (type !== "likes" && type !== "followers")) {
    return jsonError("نوع أو معرّف غير صالح", 400);
  }

  // صلاحية: الإعجابات تتبع الإعلانات، المتابعون يتبعون المستخدمين.
  const perm = type === "likes" ? "listings.edit" : "users.edit";
  const result = await verifyAdminRequest(request, perm);
  if (result instanceof NextResponse) return result;
  const caller = result;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  let removed = 0;
  try {
    if (type === "likes") {
      const snap = await fs
        .collection("listings")
        .doc(id)
        .collection("likes")
        .get();
      removed = snap.size;
      let batch = fs.batch();
      let ops = 0;
      for (const d of snap.docs) {
        const uid = (d.data().userId as string) || d.id;
        batch.delete(d.ref);
        batch.delete(
          fs.collection("users").doc(uid).collection("likedListings").doc(id)
        );
        ops += 2;
        if (ops >= 450) {
          await batch.commit();
          batch = fs.batch();
          ops = 0;
        }
      }
      batch.update(fs.collection("listings").doc(id), { likesCount: 0 });
      await batch.commit();
    } else {
      const snap = await fs
        .collection("users")
        .doc(id)
        .collection("followers")
        .get();
      removed = snap.size;
      let batch = fs.batch();
      let ops = 0;
      for (const d of snap.docs) {
        const followerId = (d.data().followerId as string) || d.id;
        batch.delete(d.ref);
        batch.delete(
          fs.collection("users").doc(followerId).collection("following").doc(id)
        );
        batch.update(fs.collection("users").doc(followerId), {
          followingCount: FieldValue.increment(-1),
        });
        ops += 3;
        if (ops >= 450) {
          await batch.commit();
          batch = fs.batch();
          ops = 0;
        }
      }
      batch.update(fs.collection("users").doc(id), { followersCount: 0 });
      await batch.commit();
    }
  } catch (e: any) {
    return jsonError(`تعذّر التنفيذ: ${e?.message || e}`, 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: type === "likes" ? "likes_reset" : "followers_reset",
    targetType: type === "likes" ? "listing" : "user",
    targetId: id,
    after: { removed },
  });

  return NextResponse.json({ ok: true, removed });
}
