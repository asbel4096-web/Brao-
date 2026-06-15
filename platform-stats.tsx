"use client";

import { Users, Wrench, Store, Car, TrendingUp } from "lucide-react";

/**
 * شريط إحصائيات المنصة — أربع بطاقات متساوية ضمن بطاقة بيضاء واحدة.
 *
 * كل بطاقة: أيقونة ملوّنة + رقم كبير + وصف + نسبة نمو أسبوعية (أخضر).
 * الأرقام ثابتة (لا استعلامات) لخفّة الأداء وعدم التأثير على LCP —
 * عدّلها يدوياً أو اربطها لاحقاً بعدّادات حقيقية.
 */

const STATS = [
  { icon: Car, value: "24,875", label: "سيارة", trend: "+10%", color: "#1c389c" },
  { icon: Store, value: "1,243", label: "معرض", trend: "+5%", color: "#1c389c" },
  { icon: Wrench, value: "18,542", label: "قطعة غيار", trend: "+8%", color: "#16a34a" },
  { icon: Users, value: "50,286", label: "مستخدم نشط", trend: "+12%", color: "#f97316" },
];

export function PlatformStats() {
  return (
    <section className="container mt-3">
      <div
        className="
          grid grid-cols-4 gap-1 rounded-3xl border border-slate-100 bg-white
          p-3 shadow-[0_2px_20px_-10px_rgba(15,23,42,0.18)]
          dark:border-slate-800 dark:bg-slate-900 sm:gap-0 sm:p-4
        "
      >
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={
                "flex flex-col items-center justify-center gap-1 px-0.5 py-1 text-center sm:px-2 " +
                (i < STATS.length - 1
                  ? "border-l border-slate-100 dark:border-slate-800"
                  : "")
              }
            >
              <Icon
                size={20}
                style={{ color: s.color }}
                strokeWidth={2.2}
                className="mb-0.5 sm:hidden"
              />
              <Icon
                size={24}
                style={{ color: s.color }}
                strokeWidth={2.2}
                className="mb-0.5 hidden sm:block"
              />
              <div className="text-[13px] font-black leading-none text-slate-900 dark:text-white sm:text-xl">
                {s.value}
              </div>
              <div className="mt-0.5 text-[9px] font-bold text-slate-400 sm:text-xs">
                {s.label}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-0.5 text-[8px] font-black text-emerald-600 dark:text-emerald-400 sm:text-[10px]">
                <TrendingUp size={9} strokeWidth={2.5} />
                {s.trend}
                <span className="hidden sm:inline">&nbsp;هذا الأسبوع</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
