"use client";

import Link from "next/link";
import * as Icons from "lucide-react";
import { marketplaceSections, categories } from "@/lib/categories";

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Tag;
}

export function CategoryGrid() {
  return (
    <section className="container py-8 sm:py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">أقسام براتشو كار</h2>
          <p className="section-subtitle">
            تقسيم احترافي لسوق السيارات في ليبيا.
          </p>
        </div>
        <Link
          href="/listings"
          className="btn-ghost text-brand-700 dark:text-brand-300"
        >
          عرض الكل ←
        </Link>
      </div>

      {/* Quick chips on mobile */}
      <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar pb-2 sm:hidden">
        {categories.map((c) => {
          const Icon = getIcon(c.icon);
          return (
            <Link
              key={c.slug}
              href={`/listings?category=${encodeURIComponent(c.name)}`}
              className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Icon size={14} />
              {c.name}
            </Link>
          );
        })}
      </div>

      {/* Section cards on tablet+ */}
      <div className="mt-6 hidden gap-5 sm:grid lg:grid-cols-2">
        {marketplaceSections.map((section) => (
          <div key={section.title} className="card overflow-hidden p-0">
            <div className={`bg-gradient-to-l ${section.accent} p-5 text-white`}>
              <h3 className="text-xl font-black sm:text-2xl">{section.title}</h3>
              <p className="mt-1 text-sm text-white/80">
                واجهة مرتبة للمعلنين والمشترين.
              </p>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-2">
                {section.items.map((item) => {
                  const Icon = getIcon(item.icon);
                  return (
                    <Link
                      key={item.slug}
                      href={`/listings?category=${encodeURIComponent(item.name)}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800 transition hover:border-brand-200 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-brand-700 dark:hover:bg-slate-700"
                    >
                      <Icon size={16} className="text-brand-700 dark:text-brand-300 shrink-0" />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
