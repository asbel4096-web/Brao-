"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronLeft, Users } from "lucide-react";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";

/**
 * بانر «منشورات المجتمع» (سابقاً «سوق الجمعة») في الصفحة الرئيسية — نظير FridayBanner في التطبيق:
 * عنوان + شارة «جديد» + سطر وصف، بلا عدّاد (النشر متاح دائماً).
 * يظهر فقط لو المفتاح "friday_market" مفعّل (نفس مفتاح التطبيق). بنقرة → /friday-market.
 */
export function FridayMarketBanner() {
  const flagOn = useFeatureFlag("friday_market");
  if (!flagOn) return null;

  return (
    <section className="container pt-4">
      <Link href="/friday-market" prefetch={false} aria-label="منشورات المجتمع">
        <motion.div
          whileTap={{ scale: 0.985 }}
          className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-[0_10px_30px_-8px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-brand-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-6 h-32 w-32 rounded-full bg-action-300/20 blur-3xl" />

          <div className="relative flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-md shadow-brand-700/30">
              <Users size={26} strokeWidth={2.4} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-[17px] font-black text-slate-900 dark:text-white">منشورات المجتمع</h2>
                <span className="shrink-0 rounded-full bg-action-500 px-2 py-0.5 text-[10px] font-black text-white">
                  جديد
                </span>
              </div>
              <p className="mt-0.5 truncate text-[13px] font-medium text-slate-500 dark:text-slate-400">
                انشر وتصفّح منشورات الأعضاء
              </p>
            </div>

            <ChevronLeft size={22} className="shrink-0 text-slate-300 dark:text-slate-600" />
          </div>
        </motion.div>
      </Link>
    </section>
  );
}
