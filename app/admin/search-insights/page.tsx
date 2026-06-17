"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, SearchX, TrendingUp, Loader2, MapPin } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const arNum = (v: number) => (Number(v) || 0).toLocaleString("ar-LY");

interface Insight {
  query: string;
  count: number;
  lastAt: number;
  cities: string[];
}

export default function SearchInsightsPage() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Insight[] | null>(null);
  const [meta, setMeta] = useState({ total: 0, unique: 0 });
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/search-insights", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || "تعذّر التحميل");
        }
        if (!cancelled) {
          setItems(json.items || []);
          setMeta({
            total: json.totalZeroSearches || 0,
            unique: json.uniqueQueries || 0,
          });
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "خطأ");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" />
      </div>
    );
  }
  if ((profile as any)?.isAdmin !== true) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        هذه الصفحة للأدمن فقط.
      </div>
    );
  }

  const maxCount = items && items.length ? items[0].count : 1;

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            <SearchX size={22} className="text-action-500" />
            بحث بلا نتائج
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            ماذا يبحث عنه المستخدمون ولا يجدونه
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-xs font-bold text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
        كل عملية هنا فرصة نمو: ماركة أو سيارة مطلوبة وغير متوفّرة — استقطب
        بائعيها أو وجّه إعلاناتك نحوها.
      </div>

      {items === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <SearchX size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-base font-black text-slate-900 dark:text-white">
            لا توجد بيانات بعد
          </p>
          <p className="mt-1 text-sm text-slate-400">
            ستظهر هنا عمليات البحث التي لا تُرجع نتائج مع تراكم الاستخدام.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                <SearchX size={18} />
              </div>
              <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                {arNum(meta.total)}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                بحث بلا نتائج (آخر فترة)
              </div>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-2xl bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300">
                <TrendingUp size={18} />
              </div>
              <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
                {arNum(meta.unique)}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                عبارة فريدة
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((it, idx) => (
              <div
                key={it.query + idx}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {it.query}
                  </p>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-action-400 to-rose-500"
                      style={{ width: `${(it.count / maxCount) * 100}%` }}
                    />
                  </div>
                  {it.cities.length > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                      <MapPin size={10} />
                      {it.cities.join("، ")}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-black tabular-nums text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
                  {arNum(it.count)}×
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
