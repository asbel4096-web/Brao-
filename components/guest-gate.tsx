"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * GuestGate — بوّابة الزوّار.
 *
 * المطلوب: الزائر (غير المسجَّل) يرى **الصفحة الرئيسية فقط**. أي صفحة أخرى
 * (إعلان، قسم، تاجر، محفظة...) تحوّله مباشرة إلى تسجيل الدخول، مع حفظ
 * الوجهة في ?redirect ليعود إليها بعد الدخول.
 *
 * المسارات المسموحة للزائر (عدّلها بحرية):
 *   - "/"            الصفحة الرئيسية
 *   - "/login"       تسجيل الدخول
 *   - "/verify-phone" تأكيد الهاتف
 *   - "/terms" "/privacy"  صفحات قانونية (مرتبطة من صفحة الدخول)
 *
 * ملاحظة: البوّابة عميل-side لأن حالة Firebase Auth تُقرأ في المتصفح.
 * المستخدم المسجَّل يمرّ في كل الصفحات بشكل طبيعي.
 */

// عدّل هذه القائمة للتحكّم فيما يراه الزائر دون تسجيل دخول.
const GUEST_ALLOWED_EXACT = ["/", "/login", "/verify-phone", "/terms", "/privacy"];
// أي مسار يبدأ بهذه البادئات يُسمح به أيضاً (للمسارات الفرعية).
const GUEST_ALLOWED_PREFIXES = ["/login/", "/verify-phone/", "/terms/", "/privacy/"];

function isGuestAllowed(pathname: string): boolean {
  if (GUEST_ALLOWED_EXACT.includes(pathname)) return true;
  return GUEST_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p));
}

function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"
        aria-label="جارٍ التحميل"
      />
    </div>
  );
}

export function GuestGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  const { user, loading } = useAuth();
  const router = useRouter();

  const allowed = isGuestAllowed(pathname);

  useEffect(() => {
    // حوّل الزائر بعيداً عن الصفحات المحمية بعد اكتمال فحص الحالة فقط.
    if (!allowed && !loading && !user) {
      const target = `/login?redirect=${encodeURIComponent(pathname)}`;
      router.replace(target);
    }
  }, [allowed, loading, user, pathname, router]);

  // الصفحات المسموحة (الرئيسية/الدخول/القانونية) تُعرض دائماً.
  if (allowed) return <>{children}</>;

  // صفحة محمية: ننتظر فحص الحالة، ثم نعرض المحتوى للمسجَّل أو مؤشّر تحويل للزائر.
  if (loading || !user) return <Spinner />;

  return <>{children}</>;
}
