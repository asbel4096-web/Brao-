"use client";

import { Info } from "lucide-react";

/**
 * بانر "نصائح عامة" داخل الدردشة - مطابق للنمط في الصورة المرجعية.
 * - حدود متقطعة وردية.
 * - أيقونة معلومات بدائرة حمراء.
 * - 3 نصائح أمان للمستخدم قبل الشراء.
 */
export function ChatTipsBanner() {
  return (
    <div
      role="note"
      aria-label="نصائح عامة"
      className="
        relative my-3 rounded-2xl border-2 border-dashed border-rose-300/80
        bg-rose-50/40 px-4 py-3
        dark:border-rose-700/60 dark:bg-rose-950/20
      "
    >
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white shadow-sm">
          <Info size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-slate-900 dark:text-white">
            نصائح عامة
          </h4>
          <ul className="mt-1.5 space-y-1 text-xs leading-relaxed text-slate-700 dark:text-slate-200">
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
              قم بتفقّد المنتج جيداً قبل شرائه
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
              لا تقم بإرسال المال مسبقاً
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
              اجتمع في الأماكن العامة فقط
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
