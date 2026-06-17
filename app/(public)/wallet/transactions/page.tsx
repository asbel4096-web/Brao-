"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowRight,
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  Gift,
  Rocket,
  ShieldCheck,
  Sparkles,
  Crown,
  Zap,
  Wallet as WalletIcon,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * /wallet/transactions — سجلّ المعاملات الكامل.
 *
 *  - بطاقة ملخّص (إجمالي الوارد/الصادر للفترة المعروضة).
 *  - فلاتر: الكل / وارد / صادر.
 *  - قائمة كاملة بأيقونات ملوّنة حسب النوع + وضع ليلي.
 */

type Tone = "emerald" | "rose" | "brand" | "amber" | "action" | "slate" | "pink";

const TYPE_META: Record<
  string,
  { icon: LucideIcon; tone: Tone; label: string }
> = {
  credit: { icon: WalletIcon, tone: "emerald", label: "شحن رصيد" },
  topup: { icon: WalletIcon, tone: "emerald", label: "شحن رصيد" },
  debit: { icon: ArrowUpRight, tone: "slate", label: "خصم" },
  verification: { icon: ShieldCheck, tone: "brand", label: "توثيق معرض" },
  featured_listing: { icon: Sparkles, tone: "brand", label: "إعلان مميّز" },
  boost: { icon: Rocket, tone: "action", label: "ترقية إعلان" },
  vip: { icon: Crown, tone: "amber", label: "باقة VIP" },
  urgent: { icon: Zap, tone: "rose", label: "وسم عاجل" },
  referral_bonus: { icon: Gift, tone: "pink", label: "مكافأة إحالة" },
  refund: { icon: ArrowDownLeft, tone: "brand", label: "استرداد" },
  transfer_out: { icon: ArrowUpRight, tone: "rose", label: "تحويل صادر" },
  transfer_in: { icon: ArrowDownLeft, tone: "emerald", label: "تحويل وارد" },
  admin_adjustment: { icon: Award, tone: "amber", label: "تعديل إداري" },
};

const TONE_CHIP: Record<Tone, string> = {
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
  action: "bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300",
  slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  pink: "bg-pink-50 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300",
};

const arNum = (v: number) => Math.abs(v).toLocaleString("en-US");

type Filter = "all" | "in" | "out";

export default function TransactionsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [txns, setTxns] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/wallet/transactions");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, "walletTransactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => setTxns(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => setTxns([])
    );
    return () => unsub();
  }, [user?.uid]);

  const totals = useMemo(() => {
    const list = txns || [];
    let income = 0;
    let spent = 0;
    for (const t of list) {
      const a = Number(t.amount) || 0;
      if (a >= 0) income += a;
      else spent += Math.abs(a);
    }
    return { income, spent };
  }, [txns]);

  const filtered = useMemo(() => {
    const list = txns || [];
    if (filter === "in") return list.filter((t) => (Number(t.amount) || 0) >= 0);
    if (filter === "out") return list.filter((t) => (Number(t.amount) || 0) < 0);
    return list;
  }, [txns, filter]);

  if (authLoading || txns === null) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <section className="container pb-28 pt-3 sm:pt-5" dir="rtl">
      <div className="mx-auto max-w-2xl">
        {/* رأس */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="رجوع"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            سجلّ المعاملات
          </h1>
        </div>

        {/* بطاقة الملخّص */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] p-5 text-white shadow-blue">
          <div className="pointer-events-none absolute -left-8 -top-10 h-36 w-36 rounded-full bg-emerald-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-action-500/20 blur-3xl" />
          <div className="relative grid grid-cols-2 gap-3">
            <SummaryTile
              icon={<ArrowDownLeft size={16} />}
              label="إجمالي الوارد"
              value={arNum(totals.income)}
              tint="text-emerald-300"
            />
            <SummaryTile
              icon={<ArrowUpRight size={16} />}
              label="إجمالي الصادر"
              value={arNum(totals.spent)}
              tint="text-action-300"
            />
          </div>
        </div>

        {/* فلاتر */}
        <div className="mt-4 flex gap-2">
          {([
            ["all", "الكل"],
            ["in", "وارد"],
            ["out", "صادر"],
          ] as [Filter, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-full px-4 py-1.5 text-xs font-black transition ${
                filter === key
                  ? "bg-brand-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* القائمة */}
        <div className="mt-4 space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <WalletIcon size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-black text-slate-700 dark:text-white">
                لا توجد معاملات
              </p>
              <p className="mt-1 text-xs text-slate-400">
                ستظهر هنا كل عمليات الشحن والترقية والتحويل.
              </p>
            </div>
          ) : (
            filtered.map((t) => <TxRow key={t.id} tx={t} />)
          )}
        </div>

        {txns.length >= 200 && (
          <p className="mt-4 text-center text-[11px] text-slate-400">
            يتم عرض آخر 200 عملية.
          </p>
        )}
      </div>
    </section>
  );
}

function SummaryTile({
  icon,
  label,
  value,
  tint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tint: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-3 backdrop-blur">
      <div className={`mb-1 flex items-center gap-1 ${tint}`}>
        {icon}
        <span className="text-[11px] font-bold text-white/60">{label}</span>
      </div>
      <div className="text-xl font-black tabular-nums">
        {value} <span className="text-xs font-bold text-white/50">BC</span>
      </div>
    </div>
  );
}

function TxRow({ tx }: { tx: any }) {
  const meta = TYPE_META[tx.type] || {
    icon: WalletIcon,
    tone: "slate" as Tone,
    label: tx.type || "عملية",
  };
  const Icon = meta.icon;
  const amount = Number(tx.amount) || 0;
  const positive = amount >= 0;
  const date = tx.createdAt?.toMillis?.()
    ? new Date(tx.createdAt.toMillis()).toLocaleDateString("ar-LY", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${TONE_CHIP[meta.tone]}`}
      >
        <Icon size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-slate-900 dark:text-white">
          {meta.label}
        </p>
        {tx.reason && (
          <p className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
            {tx.reason}
          </p>
        )}
        <p className="mt-0.5 text-[10px] text-slate-400">{date}</p>
      </div>
      <div className="shrink-0 text-end">
        <p
          className={`text-sm font-black tabular-nums ${
            positive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {positive ? "+" : "−"}
          {arNum(amount)}
          <span className="mr-0.5 text-[10px] font-bold text-slate-400"> BC</span>
        </p>
        {typeof tx.balanceAfter === "number" && (
          <p className="mt-0.5 text-[9px] text-slate-400">
            الرصيد: {arNum(tx.balanceAfter)}
          </p>
        )}
      </div>
    </div>
  );
}
