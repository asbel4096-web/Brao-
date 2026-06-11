"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { plans } from "@/lib/plans";
import { formatPrice } from "@/lib/utils";

export default function PricingPage() {
  return (
    <section className="container py-8 sm:py-12">
      <div className="mx-auto max-w-4xl text-center">
        <span className="badge-action">
          <Sparkles size={12} className="ml-1" /> الباقات
        </span>
        <h1 className="mt-3 section-title">اختر الباقة المناسبة لك</h1>
        <p className="section-subtitle mx-auto">
          ابدأ مجاناً، أو ارفع مستوى ظهور إعلاناتك بباقات احترافية.
        </p>
      </div>

      <div className="mx-auto mt-8 grid max-w-5xl gap-5 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`card p-6 ${p.popular ? "border-action-300 ring-4 ring-action-100 dark:ring-action-900/30" : ""}`}
          >
            {p.popular && (
              <div className="mb-3">
                <span className="badge-action">الأكثر طلباً</span>
              </div>
            )}
            <h3 className="text-2xl font-black dark:text-white">{p.name}</h3>
            <div className="mt-4 flex items-end gap-2">
              <span className="text-4xl font-black text-brand-700 dark:text-brand-300">
                {p.price === 0 ? "مجاني" : formatPrice(p.price)}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{p.duration}</div>

            <ul className="mt-5 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                  <Check size={16} className="mt-0.5 text-emerald-600 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/add-listing"
              className={`mt-6 w-full ${p.popular ? "btn-action" : "btn-primary"}`}
            >
              {p.price === 0 ? "ابدأ الآن" : "اشترك"}
            </Link>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-3xl card border-brand-200 bg-brand-50/40 p-5 text-sm dark:bg-brand-900/10 dark:border-brand-700/40">
        <p className="text-center text-slate-700 dark:text-slate-200">
          البوابة المالية قيد التطوير. للاشتراك المؤقت، تواصل معنا عبر صفحة الدعم.
        </p>
      </div>
    </section>
  );
}
