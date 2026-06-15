"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  ArrowLeftRight,
  Coins,
  Search,
  TrendingUp,
  Users as UsersIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";

/**
 * Admin - مراقبة تحويلات الرصيد بين المستخدمين.
 *
 * يقرأ آخر 200 تحويلة من walletTransfers (realtime).
 * إحصاءات + بحث client-side (بالاسم/الهاتف).
 *
 * للقراءة فقط (التحويلات لا تُعدّل من الأدمن - فقط مراقبة + كشف عبث).
 */

interface TransferRow {
  id: string;
  senderName?: string;
  senderPhone?: string;
  recipientName?: string;
  recipientPhone?: string;
  amount: number;
  note?: string;
  createdAt?: any;
}

export default function AdminTransfersPage() {
  const { can } = useAdminRole();
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "walletTransfers"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransfers(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية التحويلات.
      </div>
    );
  }

  // إحصاءات
  const totalAmount = transfers.reduce((s, t) => s + (t.amount || 0), 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayCount = transfers.filter((t) => {
    const ms = t.createdAt?.toMillis?.() || 0;
    return ms >= today.getTime();
  }).length;

  // فلترة
  const filtered = transfers.filter((t) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (t.senderName || "").toLowerCase().includes(q) ||
      (t.recipientName || "").toLowerCase().includes(q) ||
      (t.senderPhone || "").includes(q) ||
      (t.recipientPhone || "").includes(q)
    );
  });

  return (
    <div className="space-y-4" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          <ArrowLeftRight size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            تحويلات الرصيد
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            مراقبة تحويلات BC بين المستخدمين
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={TrendingUp}
          label="إجمالي التحويلات"
          value={String(transfers.length)}
          tone="blue"
        />
        <StatCard
          icon={Coins}
          label="مجموع المبالغ"
          value={`${totalAmount.toLocaleString("en-US")} BC`}
          tone="emerald"
        />
        <StatCard
          icon={UsersIcon}
          label="اليوم"
          value={String(todayCount)}
          tone="purple"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الهاتف..."
          className="h-11 w-full rounded-2xl border border-slate-200 bg-white pe-9 ps-3 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          {search ? "لا نتائج مطابقة" : "لا توجد تحويلات بعد"}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {filtered.map((t) => (
            <TransferRowItem key={t.id} transfer={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "blue" | "emerald" | "purple";
}) {
  const tones: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon size={15} />
      </div>
      <p className="text-base font-black tabular-nums text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  );
}

function TransferRowItem({ transfer: t }: { transfer: TransferRow }) {
  const date = t.createdAt?.toMillis?.()
    ? new Date(t.createdAt.toMillis())
    : null;
  const dateText = date
    ? date.toLocaleDateString("en-CA") +
      " " +
      date.toLocaleTimeString("ar-LY", { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0 dark:border-slate-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30">
        <ArrowLeftRight size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-slate-900 dark:text-white">
          {t.senderName || "?"} ← {t.recipientName || "?"}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400" dir="ltr">
          {t.senderPhone || "—"} → {t.recipientPhone || "—"}
        </p>
        {t.note && (
          <p className="mt-0.5 truncate text-[10px] italic text-slate-400">
            “{t.note}”
          </p>
        )}
        <p className="mt-0.5 text-[9px] text-slate-400">{dateText}</p>
      </div>
      <div className="shrink-0 text-start">
        <p className="text-[14px] font-black tabular-nums text-emerald-600">
          {t.amount} BC
        </p>
      </div>
    </div>
  );
}
