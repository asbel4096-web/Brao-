"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { categories } from "@/lib/categories";

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Tag;
}

/**
 * شبكة الأقسام موحَّدة:
 *
 * - 2 أعمدة على الجوال، 4 على الديسكتوب.
 * - بطاقات نظيفة بأيقونة كبيرة + اسم.
 * - hover يلوّن brand بشكل خفيف.
 * - نفس التجربة على كل الأجهزة (إزالة chips/cards الازدواجية).
 */

export function CategoryGrid() {
  return (
    <section className="container py-7 sm:py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="section-title">تصفّح حسب القسم</h2>
          <p className="section-subtitle">
            اختر القسم المناسب وابدأ التصفّح فوراً.
          </p>
        </div>
        <Link
          href="/categories"
          className="
            inline-flex items-center gap-1 text-sm font-bold
            text-brand-700 hover:text-brand-800
            dark:text-brand-300 dark:hover:text-brand-200
          "
        >
          عرض الكل ←
        </Link>
      </div>

      <div
        className="
          mt-5 grid grid-cols-3 gap-2.5
          sm:mt-6 sm:grid-cols-4 sm:gap-3
          lg:grid-cols-8
        "
      >
        {categories.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <Link
              key={c.slug}
              href={`/listings?category=${c.slug}`}
              className="
                group flex flex-col items-center justify-center gap-2
                rounded-2xl border border-slate-200/70 bg-white
                p-3 text-center transition-all
                hover:-translate-y-0.5 hover:border-brand-300
                hover:bg-brand-50/40 hover:shadow-card
                active:scale-[0.97]
                dark:border-slate-700/70 dark:bg-slate-900
                dark:hover:border-brand-700 dark:hover:bg-brand-950/30
                sm:p-4
              "
            >
              <div
                className="
                  flex h-11 w-11 shrink-0 items-center justify-center
                  rounded-2xl bg-brand-50 text-brand-700
                  transition-colors
                  group-hover:bg-brand-100
                  dark:bg-brand-900/40 dark:text-brand-300
                  dark:group-hover:bg-brand-900/60
                  sm:h-12 sm:w-12
                "
              >
                <Icon size={20} aria-hidden="true" />
              </div>
              <span
                className="
                  line-clamp-1 text-[11px] font-bold text-slate-800
                  dark:text-slate-100 sm:text-xs
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
