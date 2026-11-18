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
 * Bratsho DS 1.0 (قرار ق٤): سوق الجمعة بنفس هوية المنصّة — بطل كحلي
 * (ink → brand-900 → brand-700) مع وهج برتقالي وزر إجراء برتقالي، نفس التطبيق.
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
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ink via-brand-900 to-brand-700 p-4 text-white shadow-card"
        >
          {/* وهج برتقالي للهوية */}
          <div className="pointer-events-none absolute -left-10 -top-14 h-40 w-40 rounded-full bg-action-500/25 blur-3xl" />

          <div className="relative flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-action-500 text-white shadow-action">
              <ShoppingCart size={26} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-extrabold text-white">
                  {settings.bannerTitle || "🛒 سوق الجمعة"}
                </h2>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold",
                    isLive
                      ? "bg-emerald-400/20 text-emerald-200"
                      : "bg-white/15 text-white/80",
                  ].join(" ")}
                >
                  {isLive ? "مفتوح الآن" : "قريباً"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-[13px] font-medium text-brand-200">
                {settings.bannerSubtitle || "عروض الجمعة فقط — انشر واشترِ بسرعة"}
              </p>

              <p className="mt-1.5 text-[13px] font-bold text-action-300">
                {isLive ? (
                  <>⏳ يغلق خلال {formatCountdown(msRemaining)}</>
                ) : (
                  <>🗓️ يفتح خلال {formatCountdown(msUntilOpen)}</>
                )}
              </p>
            </div>

            <ChevronLeft size={22} className="shrink-0 text-white/60" />
          </div>
        </motion.div>
      </Link>
    </section>
  );
}
