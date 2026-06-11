"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import { Eye, MapPin, Star, Rocket, Crown, Gauge, Bookmark } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatPrice, formatNumber, isListingFeatured } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";

const FALLBACK = "/icons/car-card.svg";

interface Props {
  listing: Listing;
  /** يعرض إحصاءات الحفظ/المشاهدات بدل شارة التمييز (لقسم "الأكثر حفظاً"). */
  showStats?: boolean;
  priority?: boolean;
}

/**
 * بطاقة سيارة مضغوطة للصفوف الأفقية (سيارات مميزة قريبة منك / الأكثر حفظاً).
 *
 * - صورة كبيرة بنسبة 4:3.
 * - شارة (VIP / ممول / مميز / جديد) أعلى اليمين — أو إحصاء المشاهدات في وضع showStats.
 * - زر الحفظ أعلى اليسار (Glassmorphism).
 * - تحت الصورة: العنوان، السعر (أزرق)، المدينة + المسافة المقطوعة.
 * - في وضع showStats: سطر إحصاءات (مشاهدات + حفظ).
 */
function CompactListingCardImpl({ listing, showStats = false, priority = false }: Props) {
  const img = listing.images?.[0] || FALLBACK;
  const isFallback = !listing.images?.length;
  const href = `/listings/${listing.id}`;

  const vipUntil = (listing as any).vipUntil?.toMillis?.() || 0;
  const isVip = vipUntil > Date.now();
  const boostedUntil = (listing as any).boostedUntil?.toMillis?.() || 0;
  const isBoosted = boostedUntil > Date.now();
  const featured = isListingFeatured(listing);
  const isNew = (listing as any).vehicleCondition === "جديدة";

  const badge = isVip
    ? { label: "VIP", Icon: Crown, cls: "bg-amber-400 text-amber-950" }
    : isBoosted
    ? { label: "ممول", Icon: Rocket, cls: "bg-emerald-600 text-white" }
    : featured
    ? { label: "مميز", Icon: Star, cls: "bg-brand-700 text-white" }
    : isNew
    ? { label: "جديد", Icon: null, cls: "bg-white/95 text-slate-900" }
    : null;

  const views = (listing as any).views as number | undefined;
  const saves = (listing as any).favoritesCount as number | undefined;
  const mileage = listing.mileage;

  return (
    <article
      dir="rtl"
      className="
        group w-[210px] shrink-0 overflow-hidden rounded-3xl border border-slate-200/70
        bg-white shadow-[0_2px_16px_-6px_rgba(15,18,38,0.1)] transition
        hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(28,56,156,0.22)]
        dark:border-slate-800 dark:bg-slate-900 sm:w-[230px]
      "
    >
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden">
        <Image
          src={img}
          alt={listing.title || "إعلان"}
          fill
          sizes="230px"
          priority={priority}
          loading={priority ? undefined : "lazy"}
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${
            isFallback ? "object-contain p-6 opacity-60" : ""
          }`}
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/45 to-transparent" />

        {/* أعلى اليمين: شارة التمييز أو إحصاء المشاهدات */}
        {showStats ? (
          views != null && views > 0 ? (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm">
              <Eye size={12} />
              {formatNumber(views)}
            </span>
          ) : null
        ) : badge ? (
          <span
            className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm backdrop-blur-sm ${badge.cls}`}
          >
            {badge.Icon && <badge.Icon size={11} strokeWidth={2.5} />}
            {badge.label}
          </span>
        ) : null}

        {/* أعلى اليسار: زر الحفظ */}
        <div className="absolute left-3 top-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-white/25 text-white ring-1 ring-white/30 backdrop-blur-md">
            <FavoriteButton listing={listing} size={16} className="!text-white" />
          </div>
        </div>
      </Link>

      <div className="p-3">
        <Link href={href}>
          <h3 className="line-clamp-1 text-sm font-black text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white">
            {listing.title}
          </h3>
        </Link>

        {/* السعر (formatPrice يضيف "د.ل" تلقائياً) */}
        <div className="mt-1 inline-flex items-baseline gap-1 font-black text-brand-700 dark:text-brand-300">
          <span className="text-lg leading-none">{formatPrice(listing.price)}</span>
        </div>

        {/* المدينة + المسافة المقطوعة */}
        <div className="mt-2 flex items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {listing.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={12} className="text-brand-600/70" />
              {listing.city}
            </span>
          )}
          {mileage != null && mileage > 0 && (
            <span className="inline-flex items-center gap-1">
              <Gauge size={12} className="text-brand-600/70" />
              {formatNumber(mileage)} كم
            </span>
          )}
        </div>

        {/* سطر إحصاءات في وضع "الأكثر حفظاً" */}
        {showStats && (saves || views) ? (
          <div className="mt-2.5 flex items-center gap-3 border-t border-slate-100 pt-2 text-[11px] font-bold text-slate-500 dark:border-slate-800 dark:text-slate-400">
            {saves != null && saves > 0 && (
              <span className="inline-flex items-center gap-1 text-brand-700 dark:text-brand-300">
                <Bookmark size={12} className="fill-current" />
                {formatNumber(saves)} حفظ
              </span>
            )}
            {views != null && views > 0 && (
              <span className="inline-flex items-center gap-1">
                <Eye size={12} />
                {formatNumber(views)} مشاهدة
              </span>
            )}
          </div>
        ) : null}
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
    prev.priority === next.priority
  );
});

export default CompactListingCard;
