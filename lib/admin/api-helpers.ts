import { NextResponse } from "next/server";
import {
  getApps as getAdminApps,
  initializeApp as initializeAdminApp,
  cert,
  type App as AdminApp,
} from "firebase-admin/app";
import {
  getFirestore as getAdminFirestore,
  FieldValue,
} from "firebase-admin/firestore";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { canPerform } from "@/lib/admin/permissions";
import type { AdminRole } from "@/lib/admin/roles";

/**
 * مكتبة مشتركة لكل API routes الأدمن.
 *
 * توفّر:
 *  - getAdminApp() — تهيئة Firebase Admin مرة واحدة (cached)
 *  - verifyAdminRequest() — يتحقق من الـidToken + يقرأ role + يفحص permission
 *  - logAdminAction() — يكتب سجلّ في adminLogs (audit trail)
 *  - jsonError() — استجابة JSON موحَّدة للأخطاء
 *
 * كل route للأدمن يجب أن يستخدم verifyAdminRequest في البداية، ثم
 * logAdminAction بعد كل تغيير ناجح.
 */

// ============================================================================
// Firebase Admin app — lazy init, cached for the lifetime of the cold start
// ============================================================================
export function getAdminApp(): AdminApp {
  const existing = getAdminApps();
  if (existing.length > 0) return existing[0]!;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(
    /\\n/g,
    "\n"
  );

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin env vars missing. Required: FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }

  return initializeAdminApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

// ============================================================================
// JSON error helper
// ============================================================================
export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

// ============================================================================
// verifyAdminRequest — Auth + permission check
// ============================================================================
export interface VerifiedAdminCaller {
  uid: string;
  email: string;
  role: AdminRole;
}

/**
 * يفحص أن الطلب من أدمن مخوّل بصلاحية معيّنة.
 *
 * - يتحقق من الـidToken في header Authorization: Bearer
 * - يقرأ users/{uid} للحصول على role
 * - يفحص canPerform(role, requiredPermission)
 *
 * يُرجِع VerifiedAdminCaller إذا نجح، أو NextResponse فيها خطأ إذا فشل.
 *
 * استخدام في route:
 *   const result = await verifyAdminRequest(request, "users.ban");
 *   if (result instanceof NextResponse) return result;
 *   const caller = result; // عندي uid + role
 */
export async function verifyAdminRequest(
  request: Request,
  requiredPermission: string
): Promise<VerifiedAdminCaller | NextResponse> {
  // 1) استخراج idToken
  const authHeader = request.headers.get("authorization") || "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!idToken) {
    return jsonError("Missing Authorization Bearer token", 401);
  }

  // 2) التحقق + قراءة الـuser doc
  let app: AdminApp;
  try {
    app = getAdminApp();
  } catch (err: any) {
    return jsonError(err?.message || "Admin SDK not configured", 500);
  }

  const auth = getAdminAuth(app);
  const fs = getAdminFirestore(app);

  let uid: string;
  try {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return jsonError("Invalid auth token", 401);
  }

  const userDoc = await fs.collection("users").doc(uid).get();
  if (!userDoc.exists) {
    return jsonError("User not found", 404);
  }

  const userData = userDoc.data() || {};
  const explicitRole = userData.role as AdminRole | undefined;
  const isAdminFlag = userData.isAdmin === true;

  // توافق رجعي: isAdmin=true بدون role → نعامله "admin"
  const role: AdminRole | null = explicitRole
    ? explicitRole
    : isAdminFlag
    ? "admin"
    : null;

  if (!role) {
    return jsonError("Forbidden: not an admin", 403);
  }

  // 3) فحص الصلاحية
  if (!canPerform(role, requiredPermission)) {
    return jsonError(
      `Forbidden: missing permission '${requiredPermission}'`,
      403
    );
  }

  return {
    uid,
    email: userData.email || "",
    role,
  };
}

// ============================================================================
// logAdminAction — كتابة سجلّ في adminLogs
// ============================================================================
export interface AdminLogParams {
  /** الأدمن الذي قام بالإجراء. */
  adminUid: string;
  /** اسم الإجراء (snake_case). مثل "user_ban", "listing_approve". */
  action: string;
  /** نوع الـtarget (user/listing/comment/...). */
  targetType: string;
  /** id الـtarget. */
  targetId: string;
  /** سبب الإجراء (مدخل من الأدمن، اختياري). */
  reason?: string;
  /** snapshot من بيانات الـtarget قبل التغيير (للـaudit). */
  before?: Record<string, any> | null;
  /** snapshot بعد التغيير. */
  after?: Record<string, any> | null;
}

/**
 * يكتب سجلّ في adminLogs collection.
 *
 * fire-and-forget: نلتقط الأخطاء بصمت لأن فشل logging لا يجب أن يُفشل
 * العملية الأساسية. لكن نسجّلها للـconsole كي يلاحظها مهندس الـbackend.
 */
export async function logAdminAction(params: AdminLogParams): Promise<void> {
  try {
    const app = getAdminApp();
    const fs = getAdminFirestore(app);

    // ننظّف الـsnapshots من undefined/funcs (Firestore يرفضها)
    const safe = (obj?: Record<string, any> | null) => {
      if (!obj) return null;
      const out: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        if (typeof v === "function") continue;
        out[k] = v;
      }
      return out;
    };

    await fs.collection("adminLogs").add({
      adminUid: params.adminUid,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason || null,
      before: safe(params.before),
      after: safe(params.after),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error("[adminLogs] failed to log:", err?.message);
  }
}

// ============================================================================
// Re-exports for convenience
// ============================================================================
export { FieldValue };
export { getAdminFirestore };
