import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "@/lib/firebase";
import { CONTENT_NOUN, type ContentType, type ModAction } from "@/lib/moderation/content";

/**
 * عميل الدالة moderateContent (us-central1) — الطريق الوحيد لحذف/إيقاف/استعادة/استئناف المحتوى
 * مع السبب. الخادم يتحقّق من الدور (مدير عام/أدمن/مشرف)، ويكتب adminLogs، ويُشعر صاحب المحتوى،
 * ويغلق البلاغ المرتبط (reportId) إن كان مفتوحاً.
 */

export interface ModerateContentInput {
  contentType: ContentType;
  contentId: string;
  action: ModAction;
  reasonCode?: string;
  note?: string;
  notifyOwner?: boolean;
  confirmPaid?: boolean;
  reportId?: string;
}

export interface ModerateContentResult {
  ok: boolean;
  contentType: ContentType;
  contentId: string;
  action: ModAction;
  state: "removed" | "paused" | null;
  status: string | null;
  notified: boolean;
  logId: string;
}

export async function moderateContent(input: ModerateContentInput): Promise<ModerateContentResult> {
  const call = httpsCallable<ModerateContentInput, ModerateContentResult>(
    getFunctions(auth.app, "us-central1"),
    "moderateContent"
  );
  const res = await call(input);
  return res.data;
}

export type ModerationErrorKind =
  | "paid-content"
  | "paid-content-role"
  | "unauthenticated"
  | "permission"
  | "invalid"
  | "not-found"
  | "precondition"
  | "unavailable"
  | "unknown";

export interface ModerationError {
  kind: ModerationErrorKind;
  message: string;
}

const hasArabic = (t: string) => /[؀-ۿ]/.test(t);

/** يحوّل خطأ الدالة إلى رسالة عربية واضحة. */
export function describeModerationError(e: unknown): ModerationError {
  const err = (e ?? {}) as { code?: unknown; message?: unknown; details?: unknown };
  const code = String(err.code ?? "").replace(/^functions\//, "");
  const msg = String(err.message ?? "");
  const detailCode =
    err.details && typeof err.details === "object" ? String((err.details as { code?: unknown }).code ?? "") : "";
  const serverMsg = hasArabic(msg) ? msg : "";

  if (detailCode === "paid-content") {
    return {
      kind: "paid-content",
      message: "هذا المحتوى مدفوع أو مميّز: أكّد الحذف صراحةً أو استخدم الإيقاف المؤقت.",
    };
  }
  if (detailCode === "paid-content-role") {
    return {
      kind: "paid-content-role",
      message: "حذف محتوى مدفوع يتطلّب دور «أدمن» أو «مدير عام». يمكنك إيقافه مؤقتاً بدلاً من ذلك.",
    };
  }
  switch (code) {
    case "unauthenticated":
      return { kind: "unauthenticated", message: "انتهت جلستك. سجّل الدخول من جديد ثم أعد المحاولة." };
    case "permission-denied":
      return {
        kind: "permission",
        message:
          serverMsg ||
          "لا تملك صلاحية إدارة المحتوى (مسموحة للمدير العام والأدمن والمشرف فقط).",
      };
    case "invalid-argument":
      return { kind: "invalid", message: serverMsg || "بيانات الطلب غير صالحة." };
    case "not-found":
      return {
        kind: "not-found",
        message: serverMsg || "خدمة «إدارة المحتوى» غير متاحة على الخادم بعد. حاول لاحقاً.",
      };
    case "failed-precondition":
      return {
        kind: "precondition",
        message: serverMsg || "لا يمكن تنفيذ هذا الإجراء على حالة المحتوى الحالية. حدّث الصفحة وأعد المحاولة.",
      };
    case "unavailable":
    case "deadline-exceeded":
    case "internal":
    case "resource-exhausted":
      return { kind: "unavailable", message: "تعذّر تنفيذ الإجراء الآن. تحقّق من اتصالك وحاول مجدداً." };
    default:
      return { kind: "unknown", message: serverMsg || "حدث خطأ غير متوقع. حاول مجدداً." };
  }
}

/** رسالة نجاح موحّدة. */
export function moderationSuccessMessage(type: ContentType, res: Pick<ModerateContentResult, "action" | "notified">, reportClosed = false): string {
  const noun = CONTENT_NOUN[type];
  const base =
    res.action === "remove"
      ? `تم حذف ${noun} (قابل للاستعادة)`
      : res.action === "pause"
        ? `تم إيقاف ${noun} مؤقتاً`
        : res.action === "restore"
          ? `تمت استعادة ${noun}`
          : `تم استئناف ${noun}`;
  const extra = [res.notified ? "وأُشعر صاحبه" : "", reportClosed ? "وأُغلق البلاغ المرتبط" : ""].filter(Boolean).join(" ");
  return extra ? `${base} ${extra}.` : `${base}.`;
}
