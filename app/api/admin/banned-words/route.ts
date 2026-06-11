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
export const maxDuration = 10;

/**
 * POST /api/admin/banned-words
 * body: { word: string, severity?: "block" | "warn" }
 *
 * يضيف كلمة محظورة. severity الافتراضي "block".
 * الـword لازم 2+ أحرف، تُنظَّف (lowercase + trim).
 *
 * الصلاحية: content.edit (نفس صلاحية CMS)
 */

export async function POST(request: Request) {
  const result = await verifyAdminRequest(request, "content.edit");
  if (result instanceof NextResponse) return result;
  const caller = result;

  let body: { word?: string; severity?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const word = (body.word || "").trim();
  if (!word || word.length < 2) {
    return jsonError("الكلمة قصيرة جداً (حرفان على الأقل)", 400);
  }
  if (word.length > 80) {
    return jsonError("الكلمة طويلة جداً", 400);
  }

  const severity =
    body.severity === "warn" || body.severity === "block"
      ? body.severity
      : "block";

  const app = getAdminApp();
  const fs = getAdminFirestore(app);

  // فحص duplicate (case-insensitive)
  const existing = await fs
    .collection("bannedWords")
    .where("word", "==", word.toLowerCase())
    .limit(1)
    .get();
  if (!existing.empty) {
    return jsonError("الكلمة موجودة بالفعل", 409);
  }

  const docRef = await fs.collection("bannedWords").add({
    word: word.toLowerCase(),
    severity,
    addedBy: caller.uid,
    addedAt: FieldValue.serverTimestamp(),
  });

  await logAdminAction({
    adminUid: caller.uid,
    action: "banned_word_add",
    targetType: "banned_word",
    targetId: docRef.id,
    after: { word: word.toLowerCase(), severity },
  });

  return NextResponse.json({ ok: true, id: docRef.id, word, severity });
}
