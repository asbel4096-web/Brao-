"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { categories } from "@/lib/categories";

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Tag;
}

/**
 * تصفّح حسب القسم - شريط أفقي قابل للسحب.
 *
 * - بطاقة عمودية مدمجة: أيقونة + اسم.
 * - عرض كل بطاقة ثابت (~88px على الهاتف) للسحب الناعم.
 * - السكروول مخفي بصرياً لتجنّب ظهور scrollbar.
 * - مسافات أصغر من النسخة السابقة (py-4 بدل py-7) لتقليل طول الصفحة.
 */
export function CategoryGrid() {
  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        {/* رأس القسم */}
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
            تصفّح حسب القسم
          </h2>
          <Link
            href="/categories"
            className="
              inline-flex items-center gap-0.5 text-xs font-black
              text-brand-700 transition hover:text-brand-800
              dark:text-brand-300 dark:hover:text-brand-200
            "
          >
            عرض الكل ←
          </Link>
        </div>
      </div>

      {/*
        الشريط الأفقي - نخرج من الـcontainer قليلاً كي تتمدّد الحواف
        إلى نهاية الشاشة على الهاتف (تجربة سحب طبيعية).
      */}
      <div
        className="
          flex gap-2.5 overflow-x-auto px-4 pb-1
          scrollbar-hide [&::-webkit-scrollbar]:hidden
          sm:gap-3 sm:px-6
        "
        style={{ scrollbarWidth: "none" }}
      >
        {categories.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <Link
              key={c.slug}
              href={`/listings?category=${c.slug}`}
              className="
                group flex w-[82px] shrink-0 flex-col items-center
                justify-center gap-1.5 rounded-2xl border border-slate-200/70
                bg-white p-2.5 text-center transition
                hover:border-brand-300 hover:bg-brand-50/40 hover:shadow-card
                active:scale-[0.97]
                dark:border-slate-700/70 dark:bg-slate-900
                dark:hover:border-brand-700 dark:hover:bg-brand-950/30
                sm:w-[92px] sm:p-3
              "
            >
              <div
                className="
                  flex h-10 w-10 shrink-0 items-center justify-center
                  rounded-xl bg-brand-50 text-brand-700 transition-colors
                  group-hover:bg-brand-100
                  dark:bg-brand-900/40 dark:text-brand-300
                  dark:group-hover:bg-brand-900/60
                  sm:h-11 sm:w-11
                "
              >
                <Icon size={18} aria-hidden="true" />
              </div>
              <span
                className="
                  line-clamp-2 w-full text-[11px] font-bold leading-tight
                  text-slate-800 dark:text-slate-100 sm:text-[12px]
                "
              >
                {c.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
