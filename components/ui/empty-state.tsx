import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Bratsho DS 1.0 — حالة «فارغ» الموحّدة (نفس EmptyView في تطبيق Flutter):
 * أيقونة 64px في دائرة ملوّنة، عنوان 18/800، نص 14 خافت، إجراء واحد اختياري.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  tone = "brand",
  className,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  tone?: "brand" | "rose";
  className?: string;
}) {
  return (
    <div className={cn("card flex flex-col items-center px-6 py-10 text-center", className)}>
      <div
        className={cn(
          "grid h-16 w-16 place-items-center rounded-full",
          tone === "rose"
            ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
            : "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
        )}
        aria-hidden="true"
      >
        <Icon size={28} />
      </div>
      <h3 className="mt-4 text-lg font-extrabold leading-7 text-slate-950 dark:text-white">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * Bratsho DS 1.0 — حالة «خطأ» الموحّدة (نفس ErrorView في التطبيق):
 * رسالة بلغة واضحة (لا نص تقني خام) + زر «إعادة المحاولة» يعيد المحاولة فعلاً.
 */
export function ErrorState({
  title = "تعذّر التحميل",
  body = "تحقّق من الاتصال ثم أعد المحاولة.",
  onRetry,
  className,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("card flex flex-col items-center px-6 py-10 text-center", className)}>
      <div
        className="grid h-16 w-16 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400"
        aria-hidden="true"
      >
        <RefreshCw size={28} />
      </div>
      <h3 className="mt-4 text-lg font-extrabold leading-7 text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{body}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary btn-sm mt-5">
          <RefreshCw size={15} />
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
