"use client";

import { useState } from "react";
import { Wallet as WalletIcon, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@/hooks/wallet/use-wallet";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { WalletSheet } from "./wallet-sheet";
import { formatBC } from "@/lib/wallet/types";

/**
 * زر فتح المحفظة - مع badge للرصيد.
 *
 * متى يظهر:
 *  - flag "wallet" مفعّل + المستخدم مسجَّل دخول
 *
 * غير ذلك:
 *  - لا شيء (يخفي نفسه)
 *
 * الـsize:
 *  - "compact": للأماكن المزدحمة (شريط علوي)
 *  - "card": كبطاقة كاملة (الصفحة الرئيسية، الـprofile)
 */

interface Props {
  variant?: "compact" | "card";
  className?: string;
}

export function WalletTrigger({ variant = "card", className = "" }: Props) {
  const { user } = useAuth();
  const enabled = useFeatureFlag("wallet");
  const { balance } = useWallet();
  const [sheetOpen, setSheetOpen] = useState(false);

  // لا يظهر إذا الـflag مغلق أو المستخدم غير مسجَّل
  if (!enabled || !user) return null;

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`
            inline-flex items-center gap-1.5 rounded-full
            bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-1.5
            text-[12px] font-black text-white shadow-sm transition
            hover:shadow-md active:scale-95
            ${className}
          `}
        >
          <WalletIcon size={13} />
          <span className="tabular-nums">{balance.toLocaleString("ar-LY")}</span>
          <span className="text-[10px] opacity-80">BC</span>
        </button>
        <WalletSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setSheetOpen(true)}
        whileTap={{ scale: 0.97 }}
        className={`
          group relative flex w-full items-center gap-3 overflow-hidden
          rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700
          p-4 text-right shadow-lg transition hover:shadow-xl
          ${className}
        `}
      >
        {/* Decoration */}
        <div className="absolute -right-6 -top-6 opacity-20 transition group-hover:scale-110">
          <Sparkles size={80} className="text-white" />
        </div>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
          <WalletIcon size={20} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-blue-100">رصيدي</p>
          <p className="mt-0.5 text-xl font-black tabular-nums text-white">
            {formatBC(balance)}
          </p>
        </div>

        <div className="shrink-0 rounded-full bg-white/15 px-3 py-1.5 text-[10px] font-black text-white backdrop-blur-sm">
          فتح
        </div>
      </motion.button>
      <WalletSheet open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

/**
 * بطاقة "قريباً" - تظهر عندما flag مغلق لكن نريد تلميحاً للقادم.
 * استعمال اختياري - يمكن للأدمن تركها أو إخفاؤها.
 */
export function WalletComingSoonCard({ className = "" }: { className?: string }) {
  const enabled = useFeatureFlag("wallet");
  // لو الـwallet مفعّل، لا تظهر هذه البطاقة
  if (enabled) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative flex items-center gap-3 overflow-hidden rounded-3xl
        border border-slate-700/50 bg-slate-900/60 p-4 backdrop-blur-sm
        ${className}
      `}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Sparkles size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-white">💎 نظام المكافآت</p>
        <p className="mt-0.5 text-[11px] text-slate-400">قريباً...</p>
      </div>
    </motion.div>
  );
}
