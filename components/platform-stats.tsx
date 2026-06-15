"use client";

import { Users, Wrench, Store, Car } from "lucide-react";
import { usePlatformStats } from "@/hooks/usePlatformStats";
import { formatNumber } from "@/lib/utils";

/**
 * شريط إحصائيات المنصة - أرقام حقيقية من Firestore.
 * - Skeleton أثناء التحميل. عند الفشل: أصفار بدل الانهيار.
 */

const ITEMS = [
  { key: "activeUsers" as const, icon: Users, label: "مستخدم نشط", sub: "آخر 30 يوم", color: "#f97316" },
  { key: "parts" as const, icon: Wrench, label: "قطعة غيار", sub: "إجمالي الإعلانات", color: "#22c55e" },
  { key: "dealers" as const, icon: Store, label: "معرض", sub: "إجمالي المعارض", color: "#2563EB" },
  { key: "cars" as const, icon: Car, label: "سيارة", sub: "إجمالي الإعلانات", color: "#2563EB" },
];

export function PlatformStats() {
  const { data, loading } = usePlatformStats();

  return (
    <section className="container mt-3">
      <div className="mb-2 text-center">
        <h2 className="text-base font-black text-slate-900 dark:text-white">إحصائيات المنصة</h2>
      </div>
      <div className="grid grid-cols-2 gap-2 rounded-3xl bg-white p-3 shadow-[0_2px_20px_-8px_rgba(15,23,42,0.12)] dark:bg-slate-900 sm:grid-cols-4 sm:gap-0">
        {ITEMS.map((item, i) => {
          const Icon = item.icon;
          const value = data ? data[item.key] : 0;
          return (
            <div
              key={item.key}
              className={"flex flex-col items-center justify-center gap-1 px-2 py-2.5 text-center " + (i < ITEMS.length - 1 ? "sm:border-l sm:border-slate-100 sm:dark:border-slate-800" : "")}
            >
              <Icon size={22} style={{ color: item.color }} strokeWidth={2} />
              {loading ? (
                <div className="mt-1 h-6 w-14 animate-pulse rounded-md bg-slate-200 dark:bg-slate-700" />
              ) : (
                <div className="text-lg font-black text-slate-900 dark:text-white">{formatNumber(value)}</div>
              )}
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{item.label}</div>
              <div className="text-[10px] text-slate-400">{item.sub}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
