"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Wallet as WalletIcon,
  Plus,
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronLeft,
  Coins,
  Sparkles,
  ListChecks,
  Award,
  Gift,
  Settings,
  Send,
  Users as UsersIcon,
  Star,
} from "lucide-react";
import { useWallet } from "@/hooks/wallet/use-wallet";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import {
  formatBC,
  formatBCSigned,
  isCreditType,
  TRANSACTION_TYPE_LABELS,
  type WalletTransaction,
} from "@/lib/wallet/types";

/**
 * Wallet Sheet - bottom sheet عصري للمحفظة.
 *
 * Inspired by تصميم المستخدمة (الصورة):
 *  - Header مع gradient + رصيد كبير
 *  - quick actions (شحن، تحويل، دعوة، عروض)
 *  - قائمة آخر المعاملات
 *  - dark mode متناسق
 *
 * Animations: Framer Motion للـenter/exit (slide up + fade)
 *
 * إذا flag "wallet" مغلق → لا يُعرض إطلاقاً (المسؤولية على الـcaller).
 */

interface Props {
  open: boolean;
  onClose: () => void;
  /** فتح dialog عرض الباقات/الخدمات (نُضيفه في الجولة C). */
  onOpenPlans?: () => void;
  /** فتح صفحة الإحالات (الجولة D). */
  onOpenReferrals?: () => void;
  /** فتح dialog شحن الرصيد. */
  onOpenTopup?: () => void;
}

export function WalletSheet({
  open,
  onClose,
  onOpenPlans,
  onOpenReferrals,
  onOpenTopup,
}: Props) {
  const { balance, transactions, loadingTransactions } = useWallet();
  const referralsEnabled = useFeatureFlag("referrals");
  const [view, setView] = useState<"main" | "transactions">("main");

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="
              fixed inset-x-0 bottom-0 z-50 max-h-[92vh]
              overflow-hidden rounded-t-[28px]
              bg-slate-950 shadow-2xl
            "
            dir="rtl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            {/* Header */}
            <div className="relative flex items-center justify-between px-5 pb-2 pt-2">
              {view === "transactions" && (
                <button
                  type="button"
                  onClick={() => setView("main")}
                  aria-label="رجوع"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <h2 className="absolute left-1/2 -translate-x-1/2 text-base font-black text-white">
                {view === "main" ? "محفظتي" : "آخر العمليات"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-60px)] overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {view === "main" ? (
                  <motion.div
                    key="main"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Balance Card */}
                    <div className="relative mt-2 overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 p-5 shadow-xl">
                      {/* Decorative coins */}
                      <div className="absolute -right-4 -top-4 opacity-20">
                        <Coins size={120} className="text-white" />
                      </div>

                      <p className="text-[11px] font-bold text-blue-100">
                        رصيدي الحالي
                      </p>
                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-black tabular-nums text-white">
                          {balance.toLocaleString("ar-LY")}
                        </span>
                        <span className="text-sm font-black text-blue-200">BC</span>
                      </div>

                      <button
                        type="button"
                        onClick={onOpenTopup}
                        disabled={!onOpenTopup}
                        className="
                          mt-4 inline-flex w-full items-center justify-center gap-1.5
                          rounded-2xl bg-white/15 py-2.5 text-sm font-black text-white
                          backdrop-blur-sm transition
                          hover:bg-white/25 active:scale-[0.98]
                          disabled:opacity-60
                        "
                      >
                        <Plus size={14} />
                        شحن رصيد
                      </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-4 grid grid-cols-4 gap-2">
                      <QuickAction
                        icon={Send}
                        label="شحن رصيد"
                        onClick={onOpenTopup}
                      />
                      <QuickAction
                        icon={ArrowUpFromLine}
                        label="تحويل رصيد"
                        disabled
                      />
                      {referralsEnabled && (
                        <QuickAction
                          icon={UsersIcon}
                          label="دعوة صديق"
                          onClick={onOpenReferrals}
                        />
                      )}
                      <QuickAction
                        icon={Sparkles}
                        label="العروض"
                        onClick={onOpenPlans}
                      />
                    </div>

                    {/* Transactions header */}
                    <div className="mt-6 flex items-center justify-between">
                      <h3 className="text-sm font-black text-white">
                        آخر العمليات
                      </h3>
                      {transactions.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setView("transactions")}
                          className="text-[11px] font-black text-blue-400 transition hover:text-blue-300"
                        >
                          عرض الكل
                        </button>
                      )}
                    </div>

                    {/* Recent transactions (3-5 items) */}
                    <div className="mt-2 space-y-1.5">
                      {loadingTransactions ? (
                        <>
                          {[...Array(3)].map((_, i) => (
                            <div
                              key={i}
                              className="h-14 animate-pulse rounded-2xl bg-slate-800/50"
                            />
                          ))}
                        </>
                      ) : transactions.length === 0 ? (
                        <p className="py-6 text-center text-xs text-slate-500">
                          لا توجد عمليات بعد
                        </p>
                      ) : (
                        transactions.slice(0, 4).map((tx) => (
                          <TransactionRow key={tx.id} tx={tx} />
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="transactions"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Full transactions list */}
                    <div className="space-y-1.5 pt-2">
                      {transactions.length === 0 ? (
                        <p className="py-10 text-center text-xs text-slate-500">
                          لا توجد عمليات
                        </p>
                      ) : (
                        transactions.map((tx) => (
                          <TransactionRow key={tx.id} tx={tx} detailed />
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Sub-components
// ============================================================

function QuickAction({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`
        flex flex-col items-center gap-1.5 rounded-2xl bg-slate-800/60 p-3 transition
        hover:bg-slate-800 active:scale-95
        disabled:cursor-not-allowed disabled:opacity-40
      `}
    >
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-700 text-blue-400">
        <Icon size={16} />
      </div>
      <span className="text-[10px] font-bold text-slate-300">{label}</span>
    </button>
  );
}

function TransactionRow({
  tx,
  detailed = false,
}: {
  tx: WalletTransaction;
  detailed?: boolean;
}) {
  const credit = isCreditType(tx.type, tx.amount);
  const date = tx.createdAt?.toMillis?.()
    ? new Date(tx.createdAt.toMillis()).toLocaleDateString("ar-LY", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : "";

  // أيقونة حسب النوع
  const TypeIcon = (() => {
    switch (tx.type) {
      case "credit":
      case "admin_adjust":
        return credit ? Plus : ArrowUpFromLine;
      case "reward":
      case "referral_bonus":
        return Gift;
      case "featured_listing":
        return Sparkles;
      case "boost":
        return Award;
      case "verification":
        return Star;
      case "purchase":
        return ListChecks;
      case "refund":
        return ArrowDownToLine;
      default:
        return WalletIcon;
    }
  })();

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/40 p-3">
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          credit
            ? "bg-emerald-900/40 text-emerald-400"
            : "bg-rose-900/40 text-rose-400"
        }`}
      >
        <TypeIcon size={14} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-black text-white">
          {tx.reason || TRANSACTION_TYPE_LABELS[tx.type]}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {date}
          {detailed && tx.metadata?.txId && (
            <span className="ms-2 font-mono text-[9px]" dir="ltr">
              #{tx.id.slice(0, 8)}
            </span>
          )}
        </p>
      </div>

      <div className="text-end">
        <p
          className={`text-[13px] font-black tabular-nums ${
            credit ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatBCSigned(tx.amount)}
        </p>
        {detailed && (
          <p className="mt-0.5 text-[10px] text-slate-500">
            رصيد: {formatBC(tx.balanceAfter)}
          </p>
        )}
      </div>
    </div>
  );
}
