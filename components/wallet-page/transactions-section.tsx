"use client";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Award,
  ChevronLeft,
  Gift,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet as WalletIcon,
  LucideIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

/**
 * قسم آخر العمليات - يعرض آخر 5 معاملات.
 *
 * كل معاملة:
 *  - أيقونة دائرية ملوّنة حسب النوع
 *  - عنوان + سبب
 *  - تاريخ
 *  - المبلغ (أخضر للموجب، أحمر للسالب)
 */

const TYPE_META: Record<
  string,
  { icon: LucideIcon; bg: string; color: string; label: string }
> = {
  credit: {
    icon: WalletIcon,
    bg: "bg-emerald-50",
    color: "text-emerald-600",
    label: "شحن رصيد",
  },
  topup: {
    icon: WalletIcon,
    bg: "bg-emerald-50",
    color: "text-emerald-600",
    label: "شحن رصيد",
  },
  debit: {
    icon: ArrowUpRight,
    bg: "bg-slate-100",
    color: "text-slate-600",
    label: "خصم",
  },
  verification: {
    icon: ShieldCheck,
    bg: "bg-blue-50",
    color: "text-blue-600",
    label: "توثيق معرض",
  },
  featured_listing: {
    icon: Sparkles,
    bg: "bg-amber-50",
    color: "text-amber-600",
    label: "إعلان مميز",
  },
  boost: {
    icon: Rocket,
    bg: "bg-purple-50",
    color: "text-purple-600",
    label: "رفع إعلان",
  },
  referral_bonus: {
    icon: Gift,
    bg: "bg-pink-50",
    color: "text-pink-600",
    label: "مكافأة إحالة",
  },
  refund: {
    icon: ArrowDownLeft,
    bg: "bg-blue-50",
    color: "text-blue-600",
    label: "استرداد",
  },
  transfer_out: {
    icon: ArrowUpRight,
    bg: "bg-rose-50",
    color: "text-rose-600",
    label: "تحويل صادر",
  },
  transfer_in: {
    icon: ArrowDownLeft,
    bg: "bg-emerald-50",
    color: "text-emerald-600",
    label: "تحويل وارد",
  },
  admin_adjustment: {
    icon: Award,
    bg: "bg-amber-50",
    color: "text-amber-600",
    label: "تعديل إداري",
  },
};

interface Props {
  onViewAll?: () => void;
}

// Inline hook (self-contained لتجنّب dependency على hook خارجي)
function useRecentTransactions(count: number = 5) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "walletTransactions"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(count)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setTransactions(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [user?.uid, count]);

  return { transactions, loading };
}

export function TransactionsSection({ onViewAll }: Props) {
  const { transactions, loading } = useRecentTransactions(5);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
      dir="rtl"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-900 dark:text-white">
          آخر العمليات
        </h2>
        {transactions.length > 0 && (
          <button
            type="button"
            onClick={onViewAll}
            className="
              inline-flex items-center gap-0.5 text-[12px] font-black
              text-brand-600 hover:text-brand-700 dark:text-brand-300
            "
          >
            عرض الكل
            <ChevronLeft size={12} />
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-2xl bg-slate-50"
            />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-8 text-center">
          <WalletIcon size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-[12px] font-bold text-slate-500">
            لا توجد عمليات بعد
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      )}

      {/* See all bottom button */}
      {transactions.length >= 5 && (
        <button
          type="button"
          onClick={onViewAll}
          className="
            mt-3 inline-flex w-full items-center justify-center gap-1
            rounded-2xl border border-slate-200 bg-slate-50 py-2.5
            text-[12px] font-black text-slate-600 transition
            hover:bg-slate-100
          "
        >
          عرض جميع العمليات
          <ChevronLeft size={12} />
        </button>
      )}
    </motion.section>
  );
}

function TransactionRow({ tx }: { tx: any }) {
  const isCredit = tx.amount > 0;
  const meta = TYPE_META[tx.type] || TYPE_META.debit;
  const Icon = meta.icon;

  // Date formatting
  const date = tx.createdAt?.toMillis?.()
    ? new Date(tx.createdAt.toMillis())
    : null;

  const dateText = date
    ? date.toLocaleDateString("en-CA")  // YYYY-MM-DD
    : "";
  const timeText = date
    ? date.toLocaleTimeString("ar-LY", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="flex items-center gap-3 py-3">
      {/* Icon */}
      <div
        className={`
          flex h-10 w-10 shrink-0 items-center justify-center
          rounded-full ${meta.bg}
        `}
      >
        <Icon size={16} className={meta.color} strokeWidth={2} />
      </div>

      {/* Title + meta */}
      <div className="min-w-0 flex-1 text-end">
        <p className="truncate text-[13px] font-black text-slate-900 dark:text-white">
          {meta.label}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {tx.reason || meta.label}
        </p>
        <p className="mt-0.5 text-[9px] text-slate-400">{dateText}</p>
      </div>

      {/* Amount + time */}
      <div className="shrink-0 text-start">
        <p
          className={`text-[13px] font-black tabular-nums ${
            isCredit ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {isCredit ? "+" : ""}{tx.amount} BC
        </p>
        <p className="mt-0.5 text-[9px] text-slate-400">{timeText}</p>
      </div>
    </div>
  );
}
