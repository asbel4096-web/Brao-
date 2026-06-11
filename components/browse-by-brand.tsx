"use client";

import Link from "next/link";
import { CAR_BRANDS } from "@/lib/car-brands";
import { BrandLogo } from "@/components/brand-logo";
import { useBrandLogos } from "@/hooks/useBrandLogos";
import { useBrandCounts } from "@/hooks/useBrandCounts";
import { formatNumber } from "@/lib/utils";

/**
 * تصفّح حسب الماركة - شريط أفقي قابل للسحب.
 *
 * - بطاقة لكل ماركة: شعار صغير + اسم عربي.
 * - عرض ثابت (~88px) لاتساق التمرير.
 * - عند النقر يفتح /listings?brand={id} لتصفية الإعلانات.
 * - الشعارات تأتي من Firestore (يديرها الأدمن من /admin/brands).
 * - شريط البحث القديم حُذف لتقليل طول الصفحة؛ المستخدم يسحب أفقياً
 *   للوصول لأي ماركة (8 ماركات فقط حالياً = سحبة واحدة).
 */
export function BrowseByBrand() {
  const logos = useBrandLogos();
  const counts = useBrandCounts();

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
            تصفّح حسب الماركة
          </h2>
          <Link
            href="/listings"
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

      <div
        className="
          flex gap-2 overflow-x-auto px-4 pb-1
          snap-x snap-mandatory scroll-px-4
          scrollbar-hide [&::-webkit-scrollbar]:hidden
          sm:gap-2.5 sm:px-6
        "
        style={{ scrollbarWidth: "none" }}
      >
        {CAR_BRANDS.map((brand) => {
          const count = counts[brand.id];
          return (
            <Link
              key={brand.id}
              href={`/listings?brand=${brand.id}`}
              className="
                group flex w-[84px] shrink-0 snap-start flex-col items-center gap-1.5
                rounded-2xl border border-slate-200/70 bg-white p-2.5
                transition hover:border-brand-300 hover:shadow-card
                active:scale-[0.97]
                dark:border-slate-700/70 dark:bg-slate-900
                dark:hover:border-brand-600
                sm:w-[96px] sm:p-3
              "
            >
              <BrandLogo
                brand={brand}
                size={52}
                overrideUrl={logos[brand.id]}
              />
              <span className="line-clamp-1 w-full text-center text-[12px] font-bold text-slate-800 dark:text-slate-100 sm:text-[13px]">
                {brand.nameAr}
              </span>
              {/* عدد الإعلانات لكل ماركة (يظهر فقط عند توفّره) */}
              {typeof count === "number" && (
                <span className="text-[11px] font-black text-brand-700 dark:text-brand-300">
                  {formatNumber(count)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
