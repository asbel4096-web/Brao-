"use client";

import { Users, Wrench, Store, Car } from "lucide-react";

/**
 * شريط إحصائيات المنصة - يظهر أسفل الـHero.
 *
 * أرقام ثابتة (لا استعلامات) لخفّة الأداء وعدم التأثير على LCP.
 * عدّليها يدوياً عند الحاجة، أو اربطيها لاحقاً بعدّادات حقيقية.
 */

const STATS = [
  { icon: Users, value: "50,000+", label: "مستخدم نشط", color: "#2563EB" },
  { icon: Wrench, value: "1,500+", label: "قطعة غيار", color: "#f97316" },
  { icon: Store, value: "320+", label: "معرض", color: "#2563EB" },
  { icon: Car, value: "12,450+", label: "سيارة", color: "#22c55e" },
];

export function PlatformStats() {
  return (
    <section className="container mt-3">
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-4 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.12)] dark:bg-slate-900 sm:grid-cols-4 sm:gap-0">
        {STATS.map((s, i) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className={
                "flex flex-col items-center justify-center gap-1.5 px-2 py-2 text-center sm:py-1 " +
                (i < STATS.length - 1
                  ? "sm:border-l sm:border-slate-100 sm:dark:border-slate-800"
                  : "")
              }
            >
              <Icon size={22} style={{ color: s.color }} strokeWidth={2} />
              <div className="text-lg font-black text-slate-900 dark:text-white">
                {s.value}
              </div>
              <div className="text-[11px] font-bold text-slate-400">
                {s.label}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
