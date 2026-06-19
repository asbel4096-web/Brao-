"use client";

import Link from "next/link";
import { ArrowRight, Archive, ChevronLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMarketWeeks } from "@/hooks/friday-market/use-market-weeks";
import { useMarketState } from "@/hooks/friday-market/use-market-state";
import { formatNumber } from "@/lib/utils";

export default function FridayArchivePage() {
  const router = useRouter();
  const { weeks, loading } = useMarketWeeks(40);
  const { weekKey: currentKey } = useMarketState();

  return (
    <div className="pb-24" dir="rtl">
      <div className="container flex items-center gap-2 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={22} />
        </button>
        <h1 className="flex items-center gap-2 text-lg font-black text-slate-900 dark:text-white">
          <Archive size={20} /> أرشيف سوق الجمعة
        </h1>
      </div>

      <div className="container">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={26} className="animate-spin text-action-500" />
          </div>
        ) : weeks.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
            <p className="text-sm font-bold text-slate-500">لا أرشيف بعد</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {weeks.map((w) => {
              const isCurrent = w.weekKey === currentKey;
              return (
                <Link
                  key={w.weekKey}
                  href={`/friday-market/archive/${w.weekKey}`}
                  prefetch={false}
                  className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100 active:scale-[0.99] dark:bg-slate-900 dark:ring-slate-800"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-xl dark:bg-orange-950/40">
                    🛒
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
                      {w.label}
                      {isCurrent && (
                        <span className="mr-2 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          هذا الأسبوع
                        </span>
                      )}
                    </p>
                    <p className="text-xs font-semibold text-slate-400">
                      {formatNumber(w.count || 0)} إعلان
                    </p>
                  </div>
                  <ChevronLeft size={20} className="text-slate-300" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
