"use client";

import Link from "next/link";
import { ChevronLeft, Truck } from "lucide-react";

/**
 * بانر CTA صغير في الصفحة الرئيسية يدعو المستخدم لقسم الساحبات.
 * يستخدم هوية البرند (أزرق + برتقالي) - بدون إعادة تصميم.
 */
export function TowTrucksCTA() {
  return (
    <section className="container py-3 sm:py-4">
      <Link
        href="/tow-trucks"
        className="
          group flex items-center gap-3 overflow-hidden rounded-3xl
          border border-action-200 bg-gradient-to-l from-action-50 to-white
          p-3.5 transition hover:shadow-action
          dark:border-action-800/40 dark:from-action-900/20 dark:to-slate-900
        "
      >
        <div className="
          flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl
          bg-action-500 text-white shadow-action
        ">
          <Truck size={22} strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black leading-tight text-slate-900 dark:text-white">
            تعطّلت سيارتك؟
          </p>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 sm:text-xs">
            اطلب أقرب ساحبة سيارات قريبة منك.
          </p>
        </div>
        <ChevronLeft
          size={20}
          className="shrink-0 text-action-600 transition group-hover:-translate-x-0.5 dark:text-action-300"
        />
      </Link>
    </section>
  );
}
