"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Car,
  Cog,
  Search,
  Store,
  Wrench,
  LayoutGrid,
  Plus,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/**
 * SearchHero — هيرو عصري فاخر (هوية Bratsho) + شريط بحث لاصق + فئات سريعة.
 *
 *  - شريحة هيرو متدرّجة (كحلي) بعنوان واضح وأزرار CTA ومؤشّرات ثقة.
 *  - شريط البحث يبقى Sticky أسفل الهيدر عند التمرير (نمط Dubizzle).
 *  - منطق البحث محفوظ (يوجّه إلى /listings?q=).
 */

interface QuickCat {
  label: string;
  href: string;
  Icon: typeof Car;
  primary?: boolean;
}

const QUICK_CATS: QuickCat[] = [
  { label: "سيارات", href: "/listings?category=cars", Icon: Car, primary: true },
  { label: "قطع غيار", href: "/listings?category=car-parts", Icon: Cog },
  { label: "معارض", href: "/traders", Icon: Store },
  { label: "ورش", href: "/listings?category=workshops", Icon: Wrench },
  { label: "خدمات", href: "/categories", Icon: LayoutGrid },
];

export function SearchHero() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/listings?q=${encodeURIComponent(q)}` : "/listings");
  };

  return (
    <section className="pt-3 sm:pt-4">
      {/* ===== شريحة الهيرو المتدرّجة ===== */}
      <div className="container">
        <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] px-5 py-6 text-white shadow-blue sm:px-8 sm:py-8">
          {/* زخارف ضوئية */}
          <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-action-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-48 w-48 rounded-full bg-brand-400/20 blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-white/90 ring-1 ring-white/15 backdrop-blur">
              <Sparkles size={12} className="text-action-300" />
              براتشو كار
            </span>

            <h1 className="mt-3 text-2xl font-black leading-tight sm:text-[34px]">
              سوق السيارات الأول في ليبيا
            </h1>
            <p className="mt-1.5 max-w-md text-sm text-white/70 sm:text-base">
              بيع واشترِ السيارات وقطع الغيار والخدمات بثقة وأمان.
            </p>

            {/* أزرار CTA */}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                href="/listings"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-white px-5 py-2.5 text-sm font-black text-brand-800 shadow-sm transition active:scale-95 hover:bg-slate-100"
              >
                <Car size={16} />
                تصفّح السيارات
              </Link>
              <Link
                href="/add-listing"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-action-500 px-5 py-2.5 text-sm font-black text-white shadow-action transition active:scale-95 hover:bg-action-600"
              >
                <Plus size={16} />
                أضف إعلانك
              </Link>
            </div>

            {/* مؤشّرات ثقة */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-white/55">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-emerald-300" />
                معارض موثّقة
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Car size={13} className="text-brand-300" />
                آلاف السيارات
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles size={13} className="text-action-300" />
                إعلانات يومية جديدة
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== شريط البحث — Sticky أسفل الهيدر عند التمرير ===== */}
      <div className="sticky top-14 z-30 -mx-4 mt-3 bg-slate-50/80 px-4 py-2 backdrop-blur-md sm:top-16 dark:bg-slate-950/80">
        <div className="container">
          <form onSubmit={handleSearch} role="search" className="relative">
            <Search
              size={20}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سيارة، قطعة غيار، معرض أو خدمة"
              aria-label="ابحث في براتشو كار"
              className="
                h-14 w-full rounded-2xl border border-slate-200 bg-white
                pr-12 pl-4 text-[15px] text-slate-900 shadow-[0_2px_16px_-6px_rgba(15,23,42,0.12)]
                outline-none transition placeholder:text-slate-400 sm:pl-24
                focus:border-brand-400 focus:ring-4 focus:ring-brand-100
                dark:border-slate-700 dark:bg-slate-900 dark:text-white
                dark:focus:border-brand-600 dark:focus:ring-brand-900/40
              "
            />
            <button
              type="submit"
              aria-label="بحث"
              className="
                absolute left-2 top-1/2 hidden -translate-y-1/2 items-center justify-center
                rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-black text-white
                transition hover:bg-brand-800 active:scale-95 sm:inline-flex
              "
            >
              بحث
            </button>
          </form>
        </div>
      </div>

      {/* ===== الفئات السريعة ===== */}
      <div className="container">
        <div
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:px-0"
          style={{ scrollbarWidth: "none" }}
        >
          {QUICK_CATS.map((c) => {
            const Icon = c.Icon;
            return (
              <Link
                key={c.label}
                href={c.href}
                prefetch={false}
                className={
                  c.primary
                    ? "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-brand-700 px-4 py-2 text-[13px] font-black text-white shadow-blue transition active:scale-95"
                    : "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-[13px] font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                }
              >
                <Icon size={15} aria-hidden="true" />
                {c.label}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
