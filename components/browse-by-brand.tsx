"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CAR_BRANDS, searchBrands } from "@/lib/car-brands";
import { BrandLogo } from "@/components/brand-logo";

/**
 * قسم "تصفح حسب الماركة" — يظهر في الصفحة الرئيسية.
 *
 * - عنوان عربي بهوية براتشو.
 * - شريط بحث يدعم العربي والإنجليزي والمرادفات.
 * - شبكة بطاقات: شعار فوق + اسم عربي تحت.
 * - النقر على بطاقة يفتح /listings?brand={id} لتصفية الإعلانات.
 */
export function BrowseByBrand() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    return query.trim() ? searchBrands(query) : CAR_BRANDS;
  }, [query]);

  return (
    <section className="container py-4 sm:py-6">
      <div className="mx-auto max-w-6xl">
        {/* عنوان القسم */}
        <h2 className="px-1 text-lg font-black text-slate-900 dark:text-white sm:text-xl">
          تصفح حسب الماركة
        </h2>

        {/* شريط البحث */}
        <div className="relative mt-3">
          <Search
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن ماركة..."
            className="
              w-full rounded-2xl border border-slate-200 bg-white px-10 py-3
              text-sm outline-none transition focus:border-brand-500
              dark:border-slate-700 dark:bg-slate-900 dark:text-white
              dark:placeholder:text-slate-500
            "
            aria-label="ابحث عن ماركة"
          />
        </div>

        {/* البطاقات */}
        {filtered.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
            لا توجد ماركة بهذا الاسم.
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 sm:gap-3">
            {filtered.map((brand) => (
              <Link
                key={brand.id}
                href={`/listings?brand=${brand.id}`}
                className="
                  group flex flex-col items-center gap-2 rounded-2xl
                  border border-slate-200 bg-white p-3 transition
                  hover:border-brand-300 hover:shadow-card
                  active:scale-[0.97]
                  dark:border-slate-700 dark:bg-slate-900
                  dark:hover:border-brand-600
                "
              >
                <BrandLogo brand={brand} size={56} />
                <span className="line-clamp-1 w-full text-center text-[12px] font-black text-slate-900 dark:text-white">
                  {brand.nameAr}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
