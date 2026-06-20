"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShoppingCart, ChevronLeft } from "lucide-react";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { useMarketState } from "@/hooks/friday-market/use-market-state";
import { formatCountdown } from "@/lib/friday-market/market-time";

/**
 * FridayMarketBanner — بانر كبير في الصفحة الرئيسية (قبل الأقسام).
 *
 * - يظهر فقط لو الـfeature flag "friday_market" مفعّل.
 * - يعرض حالة السوق: مفتوح + عدّاد الإغلاق، أو مغلق + عدّاد الافتتاح.
 * - بنقرة → /friday-market.
 */
export function FridayMarketBanner() {
  const flagOn = useFeatureFlag("friday_market");
  const { settings, isLive, msRemaining, msUntilOpen, loading } =
    useMarketState();

  if (!flagOn || loading || settings.enabled === false) return null;

  return (
    <section className="container pt-4">
      <Link href="/friday-market" prefetch={false} aria-label="سوق الجمعة">
        <motion.div
          whileTap={{ scale: 0.985 }}
          className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_-8px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55"
        >
          {/* وهج برتقالي خفيف للهوية */}
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-action-400/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-amber-300/20 blur-3xl" />

          <div className="relative flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-action-400 to-action-600 text-white shadow-md shadow-action-500/30">
              <ShoppingCart size={26} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[17px] font-black text-slate-900 dark:text-white">
                  {settings.bannerTitle || "🛒 سوق الجمعة"}
                </h2>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black",
                    isLive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300",
                  ].join(" ")}
                >
                  {isLive ? "مفتوح الآن" : "قريباً"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                {settings.bannerSubtitle || "عروض الجمعة فقط — انشر واشترِ بسرعة"}
              </p>

              <p className="mt-1.5 text-[13px] font-bold tabular-nums text-action-600 dark:text-action-400">
                {isLive ? (
                  <>⏳ يغلق خلال {formatCountdown(msRemaining)}</>
                ) : (
                  <>🗓️ يفتح خلال {formatCountdown(msUntilOpen)}</>
                )}
              </p>
            </div>

            <ChevronLeft size={22} className="shrink-0 text-slate-300 dark:text-slate-600" />
          </div>
        </motion.div>
      </Link>
    </section>
  );
}
