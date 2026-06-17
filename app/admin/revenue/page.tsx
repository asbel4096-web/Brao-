"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  TrendingUp,
  Wallet,
  Coins,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const GrowthChart = dynamic(
  () => import("@/components/admin/charts/growth-chart").then((m) => m.GrowthChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
    ),
  }
);

const arNum = (v: number) => Math.round(v).toLocaleString("en-US");

interface RevenueData {
  totalRevenue: number;
  totalTopups: number;
  byService: { type: string; label: string; amount: number }[];
  daily: { date: string; count: number }[];
  txCount: number;
}

export default function AdminRevenuePage() {
  const { profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/revenue", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) {
          throw new Error(json?.error || "تعذّر تحميل البيانات");
        }
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "خطأ");
      } finally {
        if (!cancelled) setLoading(false);
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

  const maxService = data
    ? Math.max(1, ...data.byService.map((s) => s.amount))
    : 1;

  return (
    <div className="space-y-5" dir="rtl">
      {/* رأس */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            الإيرادات واقتصاد BC
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            نظرة مالية على المنصّة
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
            ))}
          </div>
          <div className="h-[260px] animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : data ? (
        <>
          {/* بطاقة الإيراد الرئيسية */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] p-5 text-white shadow-blue sm:p-6">
            <div className="pointer-events-none absolute -left-8 -top-10 h-40 w-40 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-6 h-40 w-40 rounded-full bg-action-500/20 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-bold text-white/55">إجمالي إيراد المنصّة</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums sm:text-5xl">
                  {arNum(data.totalRevenue)}
                </span>
                <span className="rounded-lg bg-emerald-500/20 px-2 py-1 text-sm font-black text-emerald-300">
                  BC
                </span>
              </div>
              <p className="mt-2 text-[11px] text-white/45">
                من إنفاق المستخدمين على خدمات الترقية والتوثيق
              </p>
            </div>
          </div>

          {/* بطاقات مصغّرة */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <MiniStat icon={Coins} tone="emerald" label="إجمالي الشحن" value={`${arNum(data.totalTopups)} BC`} />
            <MiniStat icon={TrendingUp} tone="brand" label="عدد العمليات" value={arNum(data.txCount)} />
            <MiniStat
              icon={Wallet}
              tone="action"
              label="متوسط العملية"
              value={`${arNum(data.txCount ? data.totalRevenue / data.txCount : 0)} BC`}
            />
          </div>

          {/* رسم الإيراد اليومي */}
          <GrowthChart
            title="الإيراد اليومي"
            description="آخر 30 يوم (BC)"
            data={data.daily}
            color="emerald"
          />

          {/* تفصيل حسب الخدمة */}
          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-black text-slate-900 dark:text-white">
              الإيراد حسب الخدمة
            </h2>
            {data.byService.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">لا توجد بيانات بعد.</p>
            ) : (
              <div className="space-y-3">
                {data.byService.map((s) => (
                  <div key={s.type}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600 dark:text-slate-300">
                        {s.label}
                      </span>
                      <span className="font-black tabular-nums text-slate-900 dark:text-white">
                        {arNum(s.amount)} BC
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-l from-brand-500 to-brand-700"
                        style={{ width: `${(s.amount / maxService) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <p className="text-center text-[11px] text-slate-400">
            محسوبة من آخر {arNum(data.txCount)} عملية. الشحن لا يُحتسب إيراداً (هو
            رصيد للمستخدم)؛ الإيراد هو ما يُنفَق على الخدمات.
          </p>
        </>
      ) : null}
    </div>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "emerald" | "brand" | "action";
}) {
  const chip: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    action: "bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300",
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-2xl ${chip[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}
