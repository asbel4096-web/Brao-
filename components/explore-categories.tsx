"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Car,
  Bus,
  Truck,
  Bike,
  Cog,
  Zap,
  Recycle,
  Sparkles,
  Droplet,
  CircleDot,
  Wrench,
  PaintBucket,
  Settings,
  Plug,
  ShieldAlert,
  FileText,
  LayoutGrid,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { categories, type CategoryDef } from "@/lib/categories";
import { useCategoryCounts } from "@/hooks/useCategoryCounts";
import { useCategoryImages } from "@/hooks/useCategoryImages";
import { formatNumber } from "@/lib/utils";

/**
 * استكشف جميع الأقسام — قسم ديناميكي في الصفحة الرئيسية.
 *
 * - يقرأ كل الأقسام تلقائياً من lib/categories (مصدر الحقيقة الواحد).
 *   إضافة قسم جديد هناك يظهر هنا فوراً دون تعديل هذا الملف.
 * - بطاقات صغيرة أنيقة، صفّان على الموبايل مع تمرير أفقي.
 * - كل بطاقة: أيقونة + اسم + عدد الإعلانات (حيّ) + لون حسب المجموعة.
 * - كل بطاقة تفتح صفحة القسم: /listings?category={slug}
 */

// خريطة أسماء أيقونات lucide (مخزّنة كنص في categories) إلى المكوّنات.
const ICON_MAP: Record<string, LucideIcon> = {
  Car,
  Bus,
  Truck,
  Bike,
  Cog,
  Zap,
  Recycle,
  Sparkles,
  Droplet,
  CircleDot,
  Wrench,
  PaintBucket,
  Settings,
  Plug,
  ShieldAlert,
  FileText,
};

// ألوان حسب المجموعة (سلاسل كاملة حتى يلتقطها Tailwind JIT).
const GROUP_STYLE: Record<
  CategoryDef["group"],
  { iconWrap: string }
> = {
  vehicles: { iconWrap: "bg-blue-600 text-white" },
  parts: { iconWrap: "bg-amber-500 text-white" },
  services: { iconWrap: "bg-emerald-600 text-white" },
  special: { iconWrap: "bg-rose-600 text-white" },
};

export function ExploreCategories() {
  const counts = useCategoryCounts();
  const images = useCategoryImages();

  return (
    <section
      aria-label="استكشف جميع الأقسام"
      className="border-b border-slate-200/70 bg-slate-50/70 py-4 dark:border-slate-800 dark:bg-slate-950/40 sm:py-5"
    >
      <div className="container">
        {/* رأس القسم */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-xl bg-brand-700 text-white">
              <LayoutGrid size={15} />
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white sm:text-base">
                استكشف جميع الأقسام
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                كل أقسام المنصة في مكان واحد
              </p>
            </div>
          </div>
          <Link
            href="/categories"
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-black text-brand-700 dark:text-brand-300"
          >
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>

        {/* صفّان أفقيان قابلان للتمرير */}
        <div className="-mx-4 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0">
          <div className="grid grid-flow-col grid-rows-2 gap-2.5 pb-1">
            {categories.map((cat) => (
              <CategoryCard
                key={cat.slug}
                cat={cat}
                count={counts[cat.name]}
                image={images[cat.slug]}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({
  cat,
  count,
  image,
}: {
  cat: CategoryDef;
  count: number | undefined;
  image?: string;
}) {
  const Icon = ICON_MAP[cat.icon] || LayoutGrid;
  const style = GROUP_STYLE[cat.group];

  return (
    <Link
      href={`/listings?category=${cat.slug}`}
      prefetch={false}
      className="
        group flex w-[164px] shrink-0 items-center gap-2.5 rounded-2xl
        border border-slate-200 bg-white p-2.5 transition
        hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-blue
        dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      {image ? (
        <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl ring-1 ring-slate-100 dark:ring-slate-800">
          <Image
            src={image}
            alt={cat.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        </span>
      ) : (
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style.iconWrap}`}
        >
          <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-black leading-tight text-slate-900 dark:text-white">
          {cat.name}
        </span>
        <span className="mt-0.5 block text-[10px] font-bold text-slate-400">
          {count == null ? (
            <span className="inline-block h-2.5 w-10 animate-pulse rounded bg-slate-200 align-middle dark:bg-slate-700" />
          ) : count > 0 ? (
            `${formatNumber(count)} إعلان`
          ) : (
            "تصفّح القسم"
          )}
        </span>
      </span>
    </Link>
  );
}
