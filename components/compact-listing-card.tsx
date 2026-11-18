"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import { Clock3, Eye, Heart, MapPin } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatNumber, timeAgo } from "@/lib/utils";
import { listingHeadline } from "@/lib/listing-display";
import { FavoriteButton } from "./favorite-button";
import { NoImage, PhotoCount, PriceLine, PromoBadges, SpecRow } from "./vehicle-card-parts";

interface Props {
  listing: Listing;
  /** يعرض إحصاءات الحفظ/المشاهدات (لقسم "الأكثر حفظاً"). */
  showStats?: boolean;
  priority?: boolean;
  /** اسم القسم كشارة محايدة (صفوف «أحدث …» حسب القسم). */
  categoryLabel?: string;
}

/**
 * بطاقة الصفوف الأفقية — Bratsho DS 1.0 (تخطيط «rail» لنفس مكوّن بطاقة الإعلان).
 * عرض 236px على الجوال و 260px من 640px، صورة 4:3، نفس الشارات والسعر والمواصفات
 * كبطاقة الشبكة؛ وفي وضع showStats يظهر سطر المشاهدات/الحفظ (ميزة الموقع الحالية).
 */
function CompactListingCardImpl({ listing, showStats = false, priority = false, categoryLabel }: Props) {
  const img = listing.images?.[0] || "";
  const isFallback = !listing.images?.length;
  const href = `/listings/${listing.id}`;
  const headline = listingHeadline(listing);

  const views = (listing as any).views as number | undefined;
  const saves = (listing as any).favoritesCount as number | undefined;
  const posted = timeAgo((listing as any).createdAt);

  return (
    <article
      dir="rtl"
      className="
        group relative flex w-[236px] shrink-0 flex-col overflow-hidden rounded-3xl
        border border-slate-200/80 bg-white shadow-card transition
        hover:-translate-y-0.5 hover:border-brand-200
        dark:border-slate-700/80 dark:bg-slate-900 sm:w-[260px]
      "
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-slate-200 dark:bg-slate-800" aria-label={headline}>
        {isFallback ? (
          <NoImage />
        ) : (
          <Image
            src={img}
            alt={headline}
            fill
            sizes="260px"
            priority={priority}
            loading={priority ? undefined : "lazy"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <PromoBadges listing={listing} category={categoryLabel} />
        <PhotoCount count={listing.images?.length || 0} />
      </Link>

      {/* المفضلة (نهاية RTL = يسار) — خارج الرابط */}
      <div className="absolute left-0.5 top-0.5">
        <FavoriteButton listing={listing} size={18} />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <Link href={href}>
          <h3
            className="truncate text-[15px] font-bold leading-[22px] text-slate-950 transition-colors group-hover:text-brand-700 dark:text-white"
            title={headline}
          >
            {headline}
          </h3>
        </Link>

        <PriceLine price={listing.price} />
        <SpecRow listing={listing} />

        {/* إحصاءات الحفظ/المشاهدة (صفّا «الأكثر حفظاً» و«الأكثر مشاهدة») — إضافة، لا بديل عن المدينة */}
        {showStats && ((saves ?? 0) > 0 || (views ?? 0) > 0) && (
          <div className="flex items-center gap-3 text-[11.5px] font-bold text-slate-500 dark:text-slate-400">
            {saves != null && saves > 0 && (
              <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <Heart size={12} className="fill-current" />
                <span className="num">{formatNumber(saves)}</span> حفظ
              </span>
            )}
            {views != null && views > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye size={12} />
                <span className="num">{formatNumber(views)}</span> مشاهدة
              </span>
            )}
          </div>
        )}

        {/* المدينة + وقت النشر — في كل الأوضاع كما في الإنتاج */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11.5px] font-medium text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {listing.city ? (
            <span className="inline-flex min-w-0 items-center gap-1 truncate">
              <MapPin size={12} className="shrink-0" />
              {listing.city}
            </span>
          ) : (
            <span />
          )}
          {posted && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Clock3 size={12} />
              {posted}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export const CompactListingCard = memo(CompactListingCardImpl, (prev, next) => {
  const a = prev.listing;
  const b = next.listing;
  return (
    a.id === b.id &&
    a.price === b.price &&
    a.title === b.title &&
    (a as any).favoritesCount === (b as any).favoritesCount &&
    (a as any).views === (b as any).views &&
    a.images?.[0] === b.images?.[0] &&
    prev.showStats === next.showStats &&
    prev.priority === next.priority &&
    prev.categoryLabel === next.categoryLabel
  );
});

export default CompactListingCard;
