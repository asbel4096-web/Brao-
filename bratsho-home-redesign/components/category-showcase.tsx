"use client";

import Link from "next/link";
import { Car, Cog, Store, Wrench, ChevronLeft } from "lucide-react";
import { useState } from "react";

/**
 * CategoryShowcase — "تصفّح الأقسام" ببطاقات كبيرة بصور حقيقية.
 *
 * كل بطاقة:
 *  - خلفية صورة (إن وُجدت) فوق تدرّج لوني احتياطي.
 *  - Overlay داكن خفيف لقراءة النص.
 *  - اسم القسم + عدد العناصر.
 *  - أيقونة مميِّزة أعلى اليمين.
 *
 * الصور: ضع ملفات حقيقية في /public/categories/{cars,parts,dealers,services}.jpg
 * وستظهر تلقائياً. وإن لم تُوجد، يبقى التدرّج اللوني الأنيق (لا روابط مكسورة).
 * قابلة للسحب أفقياً.
 */

interface ShowcaseCard {
  label: string;
  count: string;
  href: string;
  img: string;
  Icon: typeof Car;
  gradient: string;
}

const CARDS: ShowcaseCard[] = [
  {
    label: "سيارات",
    count: "أكثر من ألف سيارة",
    href: "/listings?category=cars",
    img: "/categories/cars.jpg",
    Icon: Car,
    gradient: "from-brand-800 via-brand-700 to-brand-500",
  },
  {
    label: "قطع غيار",
    count: "أكثر من 1,500 قطعة",
    href: "/listings?category=car-parts",
    img: "/categories/parts.jpg",
    Icon: Cog,
    gradient: "from-action-700 via-action-600 to-action-400",
  },
  {
    label: "معارض",
    count: "أكثر من 320 معرض",
    href: "/traders",
    img: "/categories/dealers.jpg",
    Icon: Store,
    gradient: "from-slate-900 via-slate-800 to-slate-600",
  },
  {
    label: "ورش وخدمات",
    count: "أكثر من 180 ورشة",
    href: "/listings?category=workshops",
    img: "/categories/services.jpg",
    Icon: Wrench,
    gradient: "from-emerald-800 via-emerald-700 to-emerald-500",
  },
];

export function CategoryShowcase() {
  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
            تصفّح الأقسام
          </h2>
          <Link
            href="/categories"
            className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
          >
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>

      <div
        className="flex gap-3 overflow-x-auto px-4 pb-1 no-scrollbar sm:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        {CARDS.map((c) => (
          <ShowcaseCardItem key={c.label} card={c} />
        ))}
      </div>
    </section>
  );
}

function ShowcaseCardItem({ card }: { card: ShowcaseCard }) {
  const [imgOk, setImgOk] = useState(false);
  const Icon = card.Icon;

  return (
    <Link
      href={card.href}
      prefetch={false}
      className="
        group relative aspect-[3/4] w-[150px] shrink-0 overflow-hidden
        rounded-3xl shadow-card transition active:scale-[0.98]
        sm:w-[170px]
      "
    >
      {/* تدرّج احتياطي دائم */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${card.gradient}`}
        aria-hidden="true"
      />

      {/* الصورة الحقيقية (إن وُجدت) — تظهر فوق التدرّج عند نجاح التحميل */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={card.img}
        alt={card.label}
        loading="lazy"
        onLoad={() => setImgOk(true)}
        onError={() => setImgOk(false)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
          imgOk ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Overlay داكن للقراءة */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent"
        aria-hidden="true"
      />

      {/* الأيقونة أعلى اليمين */}
      <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-2xl bg-white/20 text-white backdrop-blur-md ring-1 ring-white/30">
        <Icon size={18} aria-hidden="true" />
      </span>

      {/* النص أسفل */}
      <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
        <div className="text-[15px] font-black leading-tight drop-shadow-sm">
          {card.label}
        </div>
        <div className="mt-0.5 text-[11px] font-medium text-white/80">
          {card.count}
        </div>
      </div>
    </Link>
  );
}
