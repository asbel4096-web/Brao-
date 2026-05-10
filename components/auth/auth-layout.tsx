"use client";

import Link from "next/link";
import { ArrowRight, X } from "lucide-react";

interface AuthLayoutProps {
  /** عنوان كبير في الأعلى - يجب أن يكون واضحاً جداً */
  title: string;
  /** سطر شرح قصير - واحد فقط، لا تطوّل */
  description?: string;
  /** صفحة "مساعدة؟" اختيارية في الأعلى */
  helpHref?: string;
  /** زر إغلاق (X) أو رجوع (←). يُخفي لو لم يُقدّم */
  onBack?: () => void;
  /** نوع زر الـ back */
  backType?: "close" | "back";
  /** المحتوى */
  children: React.ReactNode;
  /** Footer thin أسفل الصفحة (الشروط/الخصوصية) */
  showLegalFooter?: boolean;
}

/**
 * AuthLayout - هيكل موحَّد لكل شاشات التسجيل / الدخول / التوثيق.
 *
 * المبدأ: شاشة واحدة = هدف واحد. لا cards جانبية، لا أعمدة.
 * - شريط علوي رفيع: مساعدة (يمين) ← / × (يسار)
 * - عنوان كبير (text-2xl/3xl) في أعلى المحتوى
 * - description سطر واحد قصير
 * - منطقة المحتوى تأخذ بقية الشاشة (children)
 * - footer قانوني خفيف اختياري
 *
 * Mobile-first: max-w-md center، padding مريح، CTA كبير عريض.
 */
export function AuthLayout({
  title,
  description,
  helpHref = "/contact",
  onBack,
  backType = "back",
  children,
  showLegalFooter = true,
}: AuthLayoutProps) {
  return (
    <section className="min-h-[100dvh] bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 py-4 sm:py-6">
        {/* ============== شريط علوي رفيع ============== */}
        <div className="flex items-center justify-between">
          <Link
            href={helpHref}
            className="text-sm font-bold text-brand-700 hover:underline dark:text-brand-300"
          >
            مساعدة؟
          </Link>

          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label={backType === "close" ? "إغلاق" : "رجوع"}
              className="
                inline-flex h-10 w-10 items-center justify-center
                rounded-full text-slate-700 transition
                hover:bg-slate-100 active:scale-95
                dark:text-slate-200 dark:hover:bg-slate-800
              "
            >
              {backType === "close" ? <X size={20} /> : <ArrowRight size={20} />}
            </button>
          ) : (
            <div className="h-10 w-10" aria-hidden="true" />
          )}
        </div>

        {/* ============== العنوان + الشرح ============== */}
        <div className="mt-6 sm:mt-8">
          <h1 className="text-2xl font-black leading-tight text-slate-950 dark:text-white sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
              {description}
            </p>
          )}
        </div>

        {/* ============== المحتوى ============== */}
        <div className="mt-6 flex-1 sm:mt-8">{children}</div>

        {/* ============== Footer قانوني ============== */}
        {showLegalFooter && (
          <div className="pt-6 text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            باستخدامك براتشو كار فأنت توافق على{" "}
            <Link
              href="/terms"
              className="font-bold text-brand-700 hover:underline dark:text-brand-300"
            >
              اتفاقية الاستخدام
            </Link>{" "}
            و{" "}
            <Link
              href="/privacy"
              className="font-bold text-brand-700 hover:underline dark:text-brand-300"
            >
              سياسة الخصوصية
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
