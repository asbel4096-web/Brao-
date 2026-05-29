import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
} from "@/lib/admin/api-helpers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * DELETE /api/admin/banned-words/[wordId]
 *
 * يحذف كلمة محظورة. الصلاحية: content.edit
 */
export async function DELETE(
  request: Request,
  { params }: { params: { wordId: string } }
) {
  const result = await verifyAdminRequest(request, "content.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const wordId = params.wordId;
  if (!wordId) return jsonError("Missing word id", 400);

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const ref = fs.collection("bannedWords").doc(wordId);
  const snap = await ref.get();
  if (!snap.exists) return jsonError("الكلمة غير موجودة", 404);
  const before = snap.data();

  await ref.delete();

  await logAdminAction({
    adminUid: caller.uid,
    action: "banned_word_remove",
    targetType: "banned_word",
    targetId: wordId,
    before: before as any,
  });

  return NextResponse.json({ ok: true });
}
