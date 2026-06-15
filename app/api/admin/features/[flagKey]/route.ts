import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { ALL_FEATURE_FLAGS } from "@/lib/features/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * POST /api/admin/features/[flagKey]
 * body: { enabled: boolean, note?: string }
 *
 * يُفعّل/يوقف feature flag. الصلاحية: features.toggle
 *
 * تأثيرات:
 *  - يكتب/يُحدِّث featureFlags/{flagKey}
 *  - يُسجّل في adminLogs
 *  - النظام يلتقط التغيير realtime (subscription في useFeatureFlag)
 */
export async function POST(
  request: Request,
  { params }: { params: { flagKey: string } }
) {
  const result = await verifyAdminRequest(request, "features.toggle");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const flagKey = params.flagKey;
  if (!ALL_FEATURE_FLAGS.includes(flagKey as any)) {
    return jsonError(
      `Unknown flag. Allowed: ${ALL_FEATURE_FLAGS.join(", ")}`,
      400
    );
  }

  let body: { enabled?: boolean; note?: string } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  if (typeof body.enabled !== "boolean") {
    return jsonError("Missing 'enabled' (boolean) in body", 400);
  }

  const note = (body.note || "").trim().slice(0, 200) || null;

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const ref = fs.collection("featureFlags").doc(flagKey);

  const existing = await ref.get();
  const beforeEnabled = existing.exists ? existing.data()?.enabled === true : null;

  await ref.set(
    {
      key: flagKey,
      enabled: body.enabled,
      note,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: caller.uid,
      updatedByEmail: caller.email,
    },
    { merge: true }
  );

  await logAdminAction({
    adminUid: caller.uid,
    action: body.enabled ? "feature_flag_enable" : "feature_flag_disable",
    targetType: "feature_flag",
    targetId: flagKey,
    reason: note || undefined,
    before: { enabled: beforeEnabled },
    after: { enabled: body.enabled },
  });

  return NextResponse.json({
    ok: true,
    flag: flagKey,
    enabled: body.enabled,
  });
}
