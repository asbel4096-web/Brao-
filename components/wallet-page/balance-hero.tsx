"use client";

import { motion } from "framer-motion";
import { Plus, ArrowLeft, Wifi } from "lucide-react";
import { useWallet } from "@/hooks/wallet/use-wallet";

/**
 * بطاقة الرصيد الرئيسية — بأسلوب بطاقة دفع فاخرة بهوية Bratsho.
 *
 *  - تدرّج كحلي (هوية المنصّة) + لمسة برتقالية + شريحة بطاقة (chip).
 *  - الرصيد بخط كبير + ما يعادله بالدينار + علامة BC مائية.
 *  - زرّان: "شحن رصيد" (برتقالي) + "استخدام الرصيد" (زجاجي).
 */

interface Props {
  onTopup: () => void;
  onUse: () => void;
}

export function BalanceHero({ onTopup, onUse }: Props) {
  const { balance } = useWallet();
  const lyd = balance.toLocaleString("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] p-5 shadow-blue sm:p-6"
      dir="rtl"
    >
      {/* أوهاج زخرفية */}
      <div className="pointer-events-none absolute -left-10 -top-12 h-44 w-44 rounded-full bg-action-500/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-8 h-44 w-44 rounded-full bg-brand-400/20 blur-3xl" />

      {/* علامة BC مائية */}
      <span className="pointer-events-none absolute -bottom-6 left-3 select-none text-[7rem] font-black leading-none text-white/[0.05]">
        BC
      </span>

      {/* نمط نقاط خفيف */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      <div className="relative">
        {/* صف علوي: شريحة + هوية البطاقة */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* شريحة الذهبية */}
            <div className="flex h-7 w-9 items-center justify-center rounded-md bg-gradient-to-br from-amber-300 to-amber-500 shadow-inner">
              <div className="h-3.5 w-5 rounded-[3px] border border-amber-700/30" />
            </div>
            <Wifi
              size={16}
              className="rotate-90 text-white/50"
              strokeWidth={2.5}
            />
          </div>
          <div className="text-end leading-none">
            <p className="text-[13px] font-black tracking-wide text-white">
              BRATSHO CAR
            </p>
            <p className="mt-0.5 text-[9px] font-bold tracking-[0.2em] text-action-300">
              WALLET
            </p>
          </div>
        </div>

        {/* الرصيد */}
        <div className="mt-6 text-end">
          <p className="text-[12px] font-bold text-white/55">رصيدي الحالي</p>
          <div className="mt-1 flex items-baseline justify-end gap-2">
            <span className="text-[2.7rem] font-black leading-none tracking-tight text-white sm:text-5xl">
              {balance.toLocaleString("en-US")}
            </span>
            <span className="rounded-lg bg-action-500/20 px-2 py-1 text-sm font-black text-action-300">
              BC
            </span>
          </div>
          <p className="mt-2 text-[11px] text-white/45">
            ≈ <span className="font-mono tabular-nums">{lyd}</span> د.ل
          </p>
        </div>

        {/* الأزرار */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <motion.button
            type="button"
            onClick={onTopup}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-action-500 py-3.5 text-sm font-black text-white shadow-action transition hover:bg-action-600"
          >
            <Plus size={15} strokeWidth={2.8} />
            شحن رصيد
          </motion.button>
          <motion.button
            type="button"
            onClick={onUse}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-3.5 text-sm font-black text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15"
          >
            استخدام الرصيد
            <ArrowLeft size={15} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
