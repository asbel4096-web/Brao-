"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import * as Icons from "lucide-react";
import { Plus, Search } from "lucide-react";
import { categories } from "@/lib/categories";

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Tag;
}

/**
 * Hero احترافي 2026:
 *
 * - خلفية متدرّجة عميقة + توهّجات ناعمة (premium).
 * - عنوان كبير + فقرة تعريفية.
 * - زرّا CTA: "بيع سيارتك الآن" (برتقالي) + "تصفّح السيارات" (أبيض).
 * - شريط بحث عائم زجاجي (الإجراء الأهم).
 * - chips للفئات (موبايل first، scrollable).
 *
 * منطق البحث محفوظ كما هو.
 */

const QUICK_CATS = categories.slice(0, 8);

export function Hero() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/listings?q=${encodeURIComponent(q)}` : "/listings");
  };

  return (
    <section className="container pt-3 sm:pt-6">
      <div
        className="
          relative overflow-hidden rounded-[2rem]
          bg-gradient-to-br from-[#060f2e] via-[#0b1f63] to-[#1c389c]
          px-5 pb-5 pt-6 text-white shadow-blue
          sm:px-8 sm:pb-8 sm:pt-10 lg:px-10
        "
      >
        {/* توهّجات زخرفية */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-action-500/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-blue-400/20 blur-3xl"
        />
        {/* شبكة نقطية خفيفة */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="relative">
          {/* badge */}
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/95 backdrop-blur sm:text-xs">
            سيارات • قطع غيار • ورش • خدمات
          </span>

          {/* العنوان الكبير */}
          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">
            ابحث عن سيارتك القادمة
            <span className="mt-1 block bg-gradient-to-l from-white to-blue-200 bg-clip-text text-transparent">
              في ليبيا
            </span>
          </h1>

          <p className="mt-2 max-w-xl text-xs leading-6 text-white/75 sm:mt-3 sm:text-base sm:leading-8">
            أكثر من 10,000 سيارة وقطعة غيار ومعرض في مكان واحد — أسرع طريقة
            لشراء أو بيع سيارة في ليبيا.
          </p>

          {/* زرّا CTA */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <Link
              href="/add-listing"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl bg-action-500 px-5 py-3 text-sm font-black
                text-white shadow-action transition
                hover:bg-action-600 active:scale-[0.97]
              "
            >
              <Plus size={16} />
              بيع سيارتك الآن
            </Link>
            <Link
              href="/listings"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl bg-white px-5 py-3 text-sm font-black
                text-brand-800 shadow-lg transition
                hover:bg-blue-50 active:scale-[0.97]
              "
            >
              تصفّح السيارات
            </Link>
          </div>

          {/* شريط البحث العائم الزجاجي */}
          <form
            onSubmit={handleSearch}
            className="
              mt-4 flex items-stretch gap-2
              rounded-[20px] border border-white/40 bg-white/95 p-1.5
              shadow-2xl backdrop-blur-xl
              sm:mt-6
            "
            role="search"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن سيارة، قطعة غيار، معرض أو سيارة..."
                className="w-full rounded-xl border-0 bg-transparent py-3 pr-10 pl-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                aria-label="ابحث في الإعلانات"
              />
            </div>
            <button
              type="submit"
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-brand-800 active:scale-[0.97] sm:px-6"
            >
              <Search size={16} className="sm:hidden" />
              <span className="hidden sm:inline">ابحث</span>
            </button>
          </form>

          {/* chips الفئات */}
          <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 no-scrollbar sm:-mx-0 sm:px-0">
            {QUICK_CATS.map((c) => {
              const Icon = getIcon(c.icon);
              return (
                <Link
                  key={c.slug}
                  href={`/listings?category=${c.slug}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur transition hover:bg-white/20 active:scale-95 sm:text-xs"
                >
                  <Icon size={13} aria-hidden="true" />
                  {c.name}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
