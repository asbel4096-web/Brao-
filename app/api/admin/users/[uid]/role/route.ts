import { NextResponse } from "next/server";
import {
  getAdminApp,
  getAdminFirestore,
  jsonError,
  logAdminAction,
  verifyAdminRequest,
  FieldValue,
} from "@/lib/admin/api-helpers";
import { ALL_ROLES, type AdminRole } from "@/lib/admin/roles";
import { getAuth } from "firebase-admin/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

/**
 * POST /api/admin/users/[uid]/role
 * body: { role: AdminRole | null }
 *
 * يعيّن دور أدمن لمستخدم، أو يزيله (null = إزالة كل الصلاحيات).
 *
 * الصلاحية: users.role_assign (Super Admin فقط)
 *
 * تأثيرات:
 *  - users/{uid}.role = الدور الجديد
 *  - users/{uid}.isAdmin = role !== null (للتوافق مع isAdmin القديم)
 *  - log في adminLogs
 *
 * حماية:
 *  - لا يستطيع super_admin إزالة دوره عن نفسه (تجنّب lockout النهائي)
 *    إلا لو يوجد super_admin آخر في النظام.
 */

const ALLOWED_ROLES = new Set<string>(ALL_ROLES);

export async function POST(
  request: Request,
  { params }: { params: { uid: string } }
) {
  const result = await verifyAdminRequest(request, "users.role_assign");
  if (result instanceof NextResponse) return result;
  const caller = result;

  const targetUid = params.uid;
  if (!targetUid) return jsonError("Missing user id", 400);

  let body: { role?: string | null } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  // التحقق من قيمة role
  let newRole: AdminRole | null;
  if (body.role === null) {
    newRole = null;
  } else if (typeof body.role === "string" && ALLOWED_ROLES.has(body.role)) {
    newRole = body.role as AdminRole;
  } else {
    return jsonError(
      `Invalid role. Allowed: ${ALL_ROLES.join(", ")} or null`,
      400
    );
  }

  const app = getAdminApp();
  const fs = getAdminFirestore(app);
  const targetRef = fs.collection("users").doc(targetUid);
  const targetDoc = await targetRef.get();
  if (!targetDoc.exists) {
    return jsonError("المستخدم غير موجود", 404);
  }
  const targetData = targetDoc.data() || {};
  const oldRole = (targetData.role as AdminRole | undefined) || null;

  // حماية: إذا الـcaller يحاول إزالة دوره عن نفسه، نتأكد من وجود
  // super_admin آخر (تجنّب lockout)
  if (caller.uid === targetUid && newRole !== "super_admin") {
    const otherSupers = await fs
      .collection("users")
      .where("role", "==", "super_admin")
      .limit(2)
      .get();
    const othersCount = otherSupers.docs.filter(
      (d) => d.id !== caller.uid
    ).length;
    if (othersCount === 0) {
      return jsonError(
        "لا يمكنك إزالة دور Super Admin عن نفسك ما لم يوجد مدير عام آخر",
        400
      );
    }
  }

  // 2026-11-21 (المرحلة 0): Custom Claim `role` هو مصدر الحقيقة الجديد (مثل setStaffRole في
  // Cloud Functions). يُعيَّن أولاً — إن فشل لا يتغيّر شيء — ثم نسخة الوثيقة.
  const auth = getAuth(app);
  try {
    const target = await auth.getUser(targetUid);
    const claims: Record<string, unknown> = { ...(target.customClaims ?? {}) };
    if (newRole) claims.role = newRole;
    else delete claims.role;
    await auth.setCustomUserClaims(targetUid, claims);
  } catch (err: any) {
    return jsonError(err?.message || "فشل تحديث صلاحيات الحساب", 500);
  }

  // التنفيذ
  try {
    if (newRole === null) {
      await targetRef.update({
        role: FieldValue.delete(),
        isAdmin: false,
      });
    } else {
      await targetRef.update({
        role: newRole,
        isAdmin: true,
      });
    }
  } catch (err: any) {
    return jsonError(err?.message || "فشل تحديث الدور", 500);
  }

  await logAdminAction({
    adminUid: caller.uid,
    action: "user_role_change",
    targetType: "user",
    targetId: targetUid,
    before: { role: oldRole, isAdmin: targetData.isAdmin === true },
    after: { role: newRole, isAdmin: newRole !== null },
  });

  // خفض الصلاحية يسري فوراً: إبطال الجلسات (الترقية تسري عند تحديث الرمز).
  const rank = (r: string | null) =>
    r === "super_admin" ? 5 : r === "admin" ? 4 : r === "moderator" ? 3 : r ? 2 : 0;
  const wasRole = targetData.isAdmin === true ? (oldRole || "admin") : null;
  const demoted = rank(newRole) < rank(wasRole);
  if (demoted) await auth.revokeRefreshTokens(targetUid).catch(() => undefined);

  return NextResponse.json({ ok: true, role: newRole, revokedSessions: demoted });
}
