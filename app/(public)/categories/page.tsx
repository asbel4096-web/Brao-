"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { ChevronLeft } from "lucide-react";
import { categories, marketplaceSections } from "@/lib/categories";

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Tag;
}

export default function CategoriesPage() {
  return (
    <section className="container py-6 sm:py-10">
      {/* رأس الصفحة */}
      <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">كل الأقسام</h1>
          <p className="section-subtitle">
            تصفّح كل أقسام براتشو كار واختر ما يناسبك.
          </p>
        </div>
        <Link
          href="/listings"
          className="btn-ghost self-start text-brand-700 dark:text-brand-300 sm:self-end"
        >
          كل الإعلانات ←
        </Link>
      </div>

      {/* المجموعات (vehicles, parts, services, special) */}
      <div className="space-y-8 sm:space-y-10">
        {marketplaceSections.map((section) => (
          <div key={section.title}>
            {/* رأس المجموعة */}
            <div
              className={`mb-4 rounded-3xl bg-gradient-to-l ${section.accent} p-5 text-white shadow-card`}
            >
              <h2 className="text-xl font-black sm:text-2xl">{section.title}</h2>
              <p className="mt-1 text-sm text-white/80">
                {section.items.length} قسم متاح
              </p>
            </div>

            {/* شبكة الأقسام: 1 على الجوال، 2 على التابلت، 3 على الكمبيوتر */}
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.map((item) => {
                const Icon = getIcon(item.icon);
                return (
                  <Link
                    key={item.slug}
                    href={`/listings?category=${item.slug}`}
                    className="
                      group relative flex items-center gap-4
                      rounded-3xl border border-slate-200 bg-white p-4 sm:p-5
                      shadow-card transition-all
                      hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-blue
                      dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-700
                    "
                  >
                    {/* الأيقونة */}
                    <div
                      className="
                        flex h-14 w-14 shrink-0 items-center justify-center
                        rounded-2xl bg-brand-50 text-brand-700
                        transition-colors
                        group-hover:bg-brand-700 group-hover:text-white
                        dark:bg-brand-900/40 dark:text-brand-300
                        dark:group-hover:bg-brand-700 dark:group-hover:text-white
                      "
                    >
                      <Icon size={26} aria-hidden="true" />
                    </div>

                    {/* النص */}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-black text-slate-900 dark:text-white sm:text-lg">
                        {item.name}
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        تصفّح إعلانات {item.name}
                      </p>
                    </div>

                    {/* السهم */}
                    <ChevronLeft
                      size={20}
                      className="
                        shrink-0 text-slate-400
                        transition-all
                        group-hover:-translate-x-1 group-hover:text-brand-700
                        dark:group-hover:text-brand-300
                      "
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* CTA في الأسفل */}
      <div className="mt-10 rounded-3xl border border-brand-200 bg-brand-50 p-6 text-center dark:border-brand-800 dark:bg-brand-900/30 sm:p-8">
        <h3 className="text-xl font-black text-brand-900 dark:text-brand-100 sm:text-2xl">
          لم تجد القسم المناسب؟
        </h3>
        <p className="mt-2 text-sm text-brand-800/80 dark:text-brand-200/80">
          تصفّح كل الإعلانات أو ابحث مباشرة.
        </p>
        <Link href="/listings" className="btn-primary mt-4 inline-flex">
          عرض كل الإعلانات
        </Link>
      </div>
    </section>
  );
}
