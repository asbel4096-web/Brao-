"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Phone, Truck } from "lucide-react";
import type { Listing } from "@/lib/types";

/**
 * شريط أفقي يعرض الساحبات المفضلة للوصول السريع.
 *
 * يظهر في أعلى /tow-trucks عندما يكون لدى المستخدم >= 1 ساحبة محفوظة.
 * مخفي تلقائياً للزوار غير المسجَّلين أو القائمة الفارغة.
 *
 * كل بطاقة في الشريط مدمجة جداً:
 *  - صورة دائرية صغيرة (أو بديل أيقونة)
 *  - اسم مختصر سطر واحد
 *  - زر اتصال سريع (إن وُجد رقم)
 *
 * scroll أفقي على الموبايل - أعرض في الـscreen مهم لتطبيق طوارئ.
 */

interface Props {
  /** الساحبات المفضلة (محلولة من listings). الترتيب: الأحدث إضافةً أولاً. */
  items: Listing[];
}

export function FavoritesStrip({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="mb-4" aria-label="ساحباتي المفضلة">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-black text-slate-900 dark:text-white">
          <Heart size={14} className="fill-rose-500 text-rose-500" />
          ساحباتي المفضلة
        </h2>
        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {items.length} محفوظة
        </span>
      </div>

      {/* Scroll أفقي - RTL: snap-x للوقوف على كل بطاقة */}
      <div
        className="
          -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto
          scroll-px-4 px-4 pb-2
          [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
        "
      >
        {items.map((it) => (
          <FavoriteChip key={it.id} listing={it} />
        ))}
      </div>
    </section>
  );
}

function FavoriteChip({ listing }: { listing: Listing }) {
  const phone = listing.phone || "";
  const hasImage = Boolean(listing.images && listing.images[0]);

  return (
    <article
      className="
        relative flex w-[220px] shrink-0 snap-start items-center gap-3
        rounded-2xl border border-slate-200 bg-white p-2.5
        shadow-sm transition hover:border-brand-300
        dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      {/* صورة دائرية - يمين RTL */}
      <Link
        href={`/tow-trucks/${listing.id}`}
        className="
          relative h-12 w-12 shrink-0 overflow-hidden rounded-xl
          bg-gradient-to-br from-brand-700 to-brand-500
        "
      >
        {hasImage ? (
          <Image
            src={listing.images![0]!}
            alt={listing.title || "ساحبة"}
            fill
            sizes="48px"
            className="object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-white">
            <Truck size={20} />
          </div>
        )}
      </Link>

      {/* الاسم + الحالة */}
      <Link
        href={`/tow-trucks/${listing.id}`}
        className="min-w-0 flex-1"
      >
        <div className="line-clamp-1 text-[13px] font-black text-slate-900 dark:text-white">
          {listing.title || "ساحبة سيارات"}
        </div>
        {listing.availableNow ? (
          <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            متاحة الآن
          </div>
        ) : listing.city ? (
          <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            {listing.city}
          </div>
        ) : null}
      </Link>

      {/* زر اتصال سريع */}
      {phone && (
        <a
          href={`tel:${phone}`}
          aria-label="اتصال سريع"
          onClick={(e) => e.stopPropagation()}
          className="
            grid h-9 w-9 shrink-0 place-items-center rounded-full
            bg-brand-700 text-white shadow-sm transition
            hover:bg-brand-600 active:scale-95
          "
        >
          <Phone size={14} />
        </a>
      )}
    </article>
  );
}
