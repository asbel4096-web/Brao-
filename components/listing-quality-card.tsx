"use client";

import { CheckCircle2, ShieldCheck, Clock } from "lucide-react";
import type { Listing } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

interface Props {
  listing: Listing;
}

/**
 * مؤشرات جودة الإعلان للزوار العاديين.
 *
 * ملاحظة: عدد المشاهدات (views) **لم يعد** ضمن هذه البطاقة لأنه بيانات خاصة
 * بالمالك فقط. لعرضه استخدم <OwnerStatsBar /> في صفحة التفاصيل.
 */
export function ListingQualityCard({ listing }: Props) {
  const indicators: Array<{
    label: string;
    value: string;
    icon: typeof CheckCircle2;
    positive?: boolean;
  }> = [];

  // البائع موثّق إذا كان للإعلان حالة approved
  if (listing.status === "approved") {
    indicators.push({
      label: "الإعلان",
      value: "معتمد",
      icon: ShieldCheck,
      positive: true,
    });
  }

  // وثائق متوفرة إذا ذُكرت في المميزات
  const hasDocs = listing.features?.some((f) =>
    /وثائق|ملكية|كرت|دفتر|وكالة/.test(f)
  );
  if (hasDocs) {
    indicators.push({
      label: "الوثائق",
      value: "متوفرة",
      icon: CheckCircle2,
      positive: true,
    });
  }

  // تاريخ النشر
  if (listing.createdAt) {
    indicators.push({
      label: "النشر",
      value: timeAgo(listing.createdAt),
      icon: Clock,
    });
  }

  if (indicators.length === 0) return null;

  return (
    <section
      aria-label="مؤشرات جودة الإعلان"
      className="card p-5"
    >
      <h3 className="mb-4 text-sm font-black text-slate-900 dark:text-white">
        مؤشرات الجودة
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {indicators.map(({ label, value, icon: Icon, positive }, idx) => (
          <div
            key={idx}
            className="
              flex flex-col items-start gap-2
              rounded-2xl border border-slate-100
              bg-slate-50/60 p-3
              dark:border-slate-800 dark:bg-slate-950/40
            "
          >
            <div
              className={`
                flex h-8 w-8 items-center justify-center rounded-xl
                ${
                  positive
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                }
              `}
            >
              <Icon size={16} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
