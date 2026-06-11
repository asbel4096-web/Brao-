"use client";

import { type LucideIcon } from "lucide-react";
import Link from "next/link";

/**
 * StatCard - بطاقة KPI احترافية.
 *
 * - يدعم رقم رئيسي + label
 * - تغيُّر النسبة (+12% / -5%) مع لون أخضر/أحمر
 * - أيقونة مع خلفية مُلوَّنة
 * - badge اختياري للتنبيه (مثلاً "12 جديد")
 * - يمكن جعله Link لصفحة تفاصيل
 *
 * تصميم مثل Stripe/Linear: مساحة بيضاء واسعة، أرقام بارزة، أيقونة تكميلية.
 */

export interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  /** لون الأيقونة - يطابق Tailwind palette. */
  tone?: "brand" | "action" | "emerald" | "rose" | "amber" | "slate";
  /** نسبة التغيُّر (مثل +12، -5). Null = لا نعرض. */
  change?: number | null;
  /** نص بجانب رقم التغيُّر (مثل "هذا الأسبوع"). */
  changeLabel?: string;
  /** Badge عاجل (مثل عدد العناصر المعلَّقة). */
  alertCount?: number;
  /** لو موجود، البطاقة تصبح link. */
  href?: string;
}

const TONE_STYLES: Record<
  NonNullable<StatCardProps["tone"]>,
  { iconBg: string; iconText: string }
> = {
  brand: {
    iconBg: "bg-brand-50 dark:bg-brand-900/30",
    iconText: "text-brand-700 dark:text-brand-300",
  },
  action: {
    iconBg: "bg-action-50 dark:bg-action-900/30",
    iconText: "text-action-700 dark:text-action-300",
  },
  emerald: {
    iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    iconText: "text-emerald-700 dark:text-emerald-300",
  },
  rose: {
    iconBg: "bg-rose-50 dark:bg-rose-900/30",
    iconText: "text-rose-700 dark:text-rose-300",
  },
  amber: {
    iconBg: "bg-amber-50 dark:bg-amber-900/30",
    iconText: "text-amber-700 dark:text-amber-300",
  },
  slate: {
    iconBg: "bg-slate-100 dark:bg-slate-800",
    iconText: "text-slate-700 dark:text-slate-300",
  },
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  change,
  changeLabel,
  alertCount,
  href,
}: StatCardProps) {
  const t = TONE_STYLES[tone];

  // محتوى البطاقة (نُعيد استخدامه سواء كانت link أم لا)
  const content = (
    <div
      className="
        group relative flex items-start justify-between gap-3
        rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm
        transition hover:border-slate-300 hover:shadow-md
        dark:border-slate-800 dark:bg-slate-900
        dark:hover:border-slate-700
      "
    >
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-1.5 text-2xl font-black tabular-nums text-slate-900 dark:text-white sm:text-3xl">
          {typeof value === "number" ? value.toLocaleString("ar-LY") : value}
        </p>

        {/* تغيُّر النسبة */}
        {change != null && (
          <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold">
            <span
              className={
                change > 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : change < 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-slate-500 dark:text-slate-400"
              }
            >
              {change > 0 ? "+" : ""}
              {change}%
            </span>
            {changeLabel && (
              <span className="text-slate-400 dark:text-slate-500">
                {changeLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* أيقونة */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${t.iconBg}`}
      >
        <Icon size={18} className={t.iconText} strokeWidth={2.2} />
      </div>

      {/* Alert badge في الزاوية العلوية */}
      {typeof alertCount === "number" && alertCount > 0 && (
        <span
          className="
            absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center
            rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white
            shadow-sm ring-2 ring-white dark:ring-slate-900
          "
        >
          {alertCount > 99 ? "99+" : alertCount}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} prefetch={false} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
