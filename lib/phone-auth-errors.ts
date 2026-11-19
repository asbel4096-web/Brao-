/**
 * أخطاء إرسال رمز التحقق (OTP) عبر Firebase Phone Auth.
 *
 * فحص 2026-11-19: كل طلبات sendVerificationCode للمشروع منذ أسابيع تعود من خادم
 * Google بالخطأ 503 «Error code: 39» — تعذّر إرسال الرسالة من جهة مزوّد الرسائل،
 * وليس خطأً في الرقم أو في إعدادات المشروع (المنطقة مسموحة، الفوترة مفعّلة).
 * في هذه الحالة نعطّل خيار الهاتف ونوجّه المستخدم إلى Google أو اسم المستخدم.
 */
export const SMS_BACKEND_FAILURE_MESSAGE =
  "تعذّر إرسال رمز التحقق إلى رقمك حالياً بسبب عطل لدى مزوّد الرسائل، وليس في رقمك. سجّل الدخول بحساب Google أو باسم المستخدم.";

export function isSmsBackendFailure(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  const code = String(e?.code ?? "");
  const msg = String(e?.message ?? "");
  return (
    code === "auth/error-code:-39" ||
    code === "auth/internal-error" ||
    /error[- ]code:?\s*-?39\b|\b503\b|UNAVAILABLE/i.test(msg)
  );
}
