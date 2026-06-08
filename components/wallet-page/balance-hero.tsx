"use client";

import { motion } from "framer-motion";
import { Plus, ChevronLeft } from "lucide-react";
import { useWallet } from "@/hooks/wallet/use-wallet";

/**
 * بطاقة الرصيد الرئيسية - Hero card في أعلى الصفحة.
 *
 * تصميم:
 *  - Gradient أزرق فاخر مع decorative shapes
 *  - أيقونة BC ثلاثية الأبعاد على اليسار
 *  - الرصيد بخط كبير + ما يعادله بالدينار
 *  - زرّان: "شحن رصيد" (مع plus) + "استخدام الرصيد"
 *  - Glow effect خفيف
 */

interface Props {
  onTopup: () => void;
  onUse: () => void;
}

export function BalanceHero({ onTopup, onUse }: Props) {
  const { balance } = useWallet();
  // افتراض 1 BC = 1 LYD (التسعيرة الحالية في النظام)
  const lyd = balance.toLocaleString("ar-LY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="
        relative overflow-hidden rounded-[28px]
        bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
        p-5 shadow-xl shadow-blue-500/30
      "
      dir="rtl"
    >
      {/* Decorative glows */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />

      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "16px 16px",
        }}
      />

      <div className="relative">
        <div className="flex items-start gap-4">
          {/* 3D-ish coin stack */}
          <div className="relative shrink-0">
            <CoinIcon3D />
          </div>

          {/* Balance */}
          <div className="min-w-0 flex-1 text-end">
            <p className="text-[12px] font-bold text-blue-100">
              رصيدي الحالي
            </p>
            <div className="mt-1 flex items-baseline justify-end gap-1.5">
              <span className="text-4xl font-black leading-none tracking-tight text-white sm:text-5xl">
                {balance.toLocaleString("en-US")}
              </span>
              <span className="text-base font-black text-blue-100">BC</span>
            </div>
            <p className="mt-1.5 text-[11px] text-blue-200">
              ≈ <span className="font-mono tabular-nums">{lyd}</span> د.ل
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <motion.button
            type="button"
            onClick={onTopup}
            whileTap={{ scale: 0.97 }}
            className="
              inline-flex items-center justify-center gap-1.5
              rounded-2xl bg-white py-3 text-sm font-black text-blue-700
              shadow-lg transition hover:shadow-xl
            "
          >
            <Plus size={14} strokeWidth={2.5} />
            شحن رصيد
          </motion.button>
          <motion.button
            type="button"
            onClick={onUse}
            whileTap={{ scale: 0.97 }}
            className="
              inline-flex items-center justify-center gap-1.5
              rounded-2xl bg-white/15 py-3 text-sm font-black text-white
              backdrop-blur-sm ring-1 ring-white/20 transition
              hover:bg-white/20
            "
          >
            استخدام الرصيد
            <ChevronLeft size={14} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

/** أيقونة عملة ثلاثية الأبعاد بسيطة (CSS فقط، بدون صورة). */
function CoinIcon3D() {
  return (
    <div className="relative h-20 w-20">
      {/* Back coin */}
      <div
        className="
          absolute inset-1 rounded-full
          bg-gradient-to-br from-blue-400 to-blue-600
          shadow-lg
        "
        style={{ transform: "translateY(4px) translateX(-3px) rotate(-8deg)" }}
      />
      {/* Front coin */}
      <div
        className="
          relative h-full w-full rounded-full
          bg-gradient-to-br from-cyan-200 via-blue-300 to-blue-500
          shadow-xl
          ring-2 ring-white/30
        "
      >
        {/* Inner ring */}
        <div className="absolute inset-1.5 rounded-full bg-gradient-to-br from-blue-500 to-blue-700">
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-base font-black text-white">BC</span>
          </div>
        </div>
        {/* Highlight */}
        <div className="absolute top-1 right-2 h-3 w-5 rounded-full bg-white/40 blur-sm" />
      </div>
    </div>
  );
}
