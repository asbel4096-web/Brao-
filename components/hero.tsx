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
 * Hero احترافي:
 *
 * - عنوان وفقرة تعريفية واضحة.
 * - شريط بحث مركزي بارز (الإجراء الأهم في الصفحة).
 * - chips للتصنيفات الرئيسية (موبايل first، scrollable).
 * - زرّ ثانوي لإضافة إعلان.
 * - بدون stats مزيّفة (الأرقام الفارغة تفقد الثقة).
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
          bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c]
          px-5 py-5 text-white shadow-blue
          sm:px-8 sm:py-10 lg:px-10 lg:py-12
        "
      >
        {/* خلفية زخرفية */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-white/5 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-20 h-56 w-56 rounded-full bg-action-500/15 blur-3xl"
        />

        <div className="relative">
          {/* badge فوق العنوان */}
          <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold text-white/95 backdrop-blur sm:text-xs">
            سيارات • قطع غيار • ورش • خدمات
          </span>

          {/* العنوان */}
          <h1 className="mt-3 text-2xl font-black leading-tight sm:text-4xl lg:text-5xl">
            سوق السيارات الاحترافي
            <span className="block text-white/85 sm:mt-1">في ليبيا</span>
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/80 sm:mt-4 sm:text-base sm:leading-8">
            ابحث، تصفّح، وتواصل مباشرة مع التجّار والورش — أسرع طريقة لشراء أو
            بيع سيارة في ليبيا.
          </p>

          {/* شريط البحث - الإجراء الأهم */}
          <form
            onSubmit={handleSearch}
            className="
              mt-3 flex items-stretch gap-2
              rounded-2xl border border-white/15 bg-white/95 p-1.5
              shadow-2xl backdrop-blur
              sm:mt-6 sm:rounded-[20px]
            "
            role="search"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="
                  pointer-events-none absolute right-3 top-1/2
                  -translate-y-1/2 text-slate-400
                "
                aria-hidden="true"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن سيارة، موديل، قطعة..."
                className="
                  w-full rounded-xl border-0 bg-transparent
                  py-3 pr-10 pl-3 text-sm text-slate-900
                  outline-none placeholder:text-slate-400
                "
                aria-label="ابحث في الإعلانات"
              />
            </div>
            <button
              type="submit"
              className="
                inline-flex shrink-0 items-center justify-center gap-1.5
                rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-black
                text-white transition active:scale-[0.97]
                hover:bg-brand-800
                sm:px-6
              "
            >
              <Search size={16} className="sm:hidden" />
              <span className="hidden sm:inline">ابحث</span>
            </button>
          </form>

          {/* chips للتصنيفات السريعة */}
          <div
            className="
              -mx-5 mt-4 flex gap-2 overflow-x-auto px-5 no-scrollbar
              sm:-mx-0 sm:mt-5 sm:px-0
            "
          >
            {QUICK_CATS.map((c) => {
              const Icon = getIcon(c.icon);
              return (
                <Link
                  key={c.slug}
                  href={`/listings?category=${c.slug}`}
                  className="
                    inline-flex shrink-0 items-center gap-1.5
                    rounded-full border border-white/20 bg-white/10
                    px-3 py-1.5 text-[11px] font-bold text-white
                    backdrop-blur transition
                    hover:bg-white/20 active:scale-95
                    sm:text-xs
                  "
                >
                  <Icon size={13} aria-hidden="true" />
                  {c.name}
                </Link>
              );
            })}
          </div>

          {/* CTA ثانوي */}
          <div className="mt-3 flex flex-wrap items-center gap-2 sm:mt-6">
            <Link
              href="/add-listing"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl bg-action-500 px-4 py-2.5 text-sm
                font-black text-white shadow-action transition
                hover:bg-action-600 active:scale-[0.97]
                sm:px-5 sm:py-3
              "
            >
              <Plus size={16} />
              ابدأ بإضافة إعلان
            </Link>
            <Link
              href="/listings"
              className="
                inline-flex items-center justify-center gap-1.5
                rounded-2xl border border-white/20 bg-white/10
                px-4 py-2.5 text-sm font-bold text-white
                backdrop-blur transition hover:bg-white/20
                active:scale-[0.97]
                sm:px-5 sm:py-3
              "
            >
              تصفّح الإعلانات
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
