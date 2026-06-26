"use client";

import { useEffect, useState } from "react";
import { AdminPageSkeleton } from "@/components/admin/ui/admin-loading";
import Link from "next/link";
import {
  ArrowRight,
  UserPlus,
  ListPlus,
  Clock,
  Coins,
  Wallet,
  CheckCircle2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const arNum = (v: number) => (Number(v) || 0).toLocaleString("ar-LY");

export default function AdminTodayPage() {
  const { profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/today", {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok === false) throw new Error(json?.error || "تعذّر التحميل");
      setData(json);
      setError("");
    } catch (e: any) {
      setError(e?.message || "خطأ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  if (authLoading) {
    return (
      <AdminPageSkeleton variant="table" />
    );
  }
  if ((profile as any)?.isAdmin !== true) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        هذه الصفحة للأدمن فقط.
      </div>
    );
  }

  const cards: { icon: LucideIcon; label: string; value: string; tone: Tone }[] = data
    ? [
        { icon: UserPlus, label: "تسجيلات اليوم", value: arNum(data.newUsers), tone: "brand" },
        { icon: ListPlus, label: "إعلانات جديدة", value: arNum(data.newListings), tone: "action" },
        { icon: Clock, label: "بانتظار المراجعة", value: arNum(data.pendingNow), tone: "amber" },
        { icon: Coins, label: "إيراد اليوم", value: `${arNum(data.revenueToday)} BC`, tone: "emerald" },
        { icon: Wallet, label: "شحن اليوم", value: `${arNum(data.topupsToday)} BC`, tone: "brand" },
        { icon: CheckCircle2, label: "اعتُمد اليوم", value: arNum(data.approvedToday), tone: "emerald" },
        { icon: XCircle, label: "رُفض اليوم", value: arNum(data.rejectedToday), tone: "rose" },
      ]
    : [];

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
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            اليوم
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            نبض المنصّة منذ منتصف الليل
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-2xl bg-brand-600 px-4 py-2 text-xs font-black text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {cards.map((c) => (
            <TodayCard key={c.label} {...c} />
          ))}
        </div>
      )}
    </div>
  );
}

type Tone = "brand" | "action" | "emerald" | "rose" | "amber";

function TodayCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: Tone;
}) {
  const chip: Record<Tone, string> = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    action: "bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-2xl ${chip[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}
