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
          className="relative overflow-hidden rounded-[28px] p-5 text-white shadow-lg"
          style={{
            background:
              "linear-gradient(135deg, #f97316 0%, #ea580c 45%, #b91c1c 100%)",
          }}
        >
          {/* وهج زخرفي */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-6 h-44 w-44 rounded-full bg-amber-300/20 blur-2xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
              <ShoppingCart size={28} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-black">
                  {settings.bannerTitle || "🛒 سوق الجمعة"}
                </h2>
                <span
                  className={[
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black",
                    isLive
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-white/25 text-white",
                  ].join(" ")}
                >
                  {isLive ? "مفتوح الآن" : "قريباً"}
                </span>
              </div>

              <p className="mt-0.5 truncate text-[13px] font-medium text-white/85">
                {settings.bannerSubtitle || "عروض الجمعة فقط — انشر واشترِ بسرعة"}
              </p>

              <p className="mt-1.5 text-[13px] font-bold tabular-nums text-white">
                {isLive ? (
                  <>⏳ يغلق خلال {formatCountdown(msRemaining)}</>
                ) : (
                  <>🗓️ يفتح خلال {formatCountdown(msUntilOpen)}</>
                )}
              </p>
            </div>

            <ChevronLeft size={22} className="shrink-0 text-white/80" />
          </div>
        </motion.div>
      </Link>
    </section>
  );
}
