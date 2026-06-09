"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import {
  Calendar,
  Gauge,
  Fuel,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import {
  formatPrice,
  getTraderDisplayName,
  isListingFeatured,
  normalizeLibyanPhone,
} from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { ListingActionsBar } from "./listing-actions-bar";

const FALLBACK = "/icons/car-card.svg";

interface ListingCardProps {
  listing: Listing;
  /** أول 2-3 بطاقات في الـ fold تأخذ priority للحصول على LCP أفضل */
  priority?: boolean;
}

/**
 * بطاقة إعلان احترافية:
 *
 * البنية البصرية (top → bottom):
 *  1. صورة 4:3 + شارة "مميز" + زر مفضلة + سعر بارز.
 *  2. عنوان + اسم التاجر سطر واحد.
 *  3. تفاصيل (مدينة، سنة، عداد) في سطر واحد مدمج.
 *  4. شريط التفاعل (لايك / تعليق / مشاركة / مفضلة).
 *  5. زرّا اتصال + واتساب صفّاً واحداً.
 *
 * - السعر يظهر فوق الصورة في كبسولة واضحة (التركيز الأول).
 * - زر القلب فوق الصورة (إجراء فوري دون تشتيت).
 * - شريط التفاعل أسفل البطاقة بمظهر نظيف بدون خلفيات ملوّنة.
 * - زرّا الاتصال والواتساب فقط (إزالة زر "التفاصيل" المكرر — البطاقة كلها رابط).
 */

function ListingCardImpl({ listing, priority = false }: ListingCardProps) {
  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const img = listing.images?.[0] || FALLBACK;
  const isFallback = !listing.images?.length;
  const sellerName = getTraderDisplayName({ name: listing.sellerName });
  const detailsHref = `/listings/${listing.id}`;

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden
        rounded-3xl border border-slate-200/70 bg-white
        shadow-card transition-all duration-300
        hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-blue
        dark:border-slate-700/70 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      {/* ============== الصورة ============== */}
      <Link
        href={detailsHref}
        prefetch={false}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800"
        aria-label={listing.title}
      >
        <Image
          src={img}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          className={
            isFallback
              ? "object-contain p-12 opacity-50"
              : "object-cover transition duration-500 group-hover:scale-[1.04]"
          }
        />

        {/* تدرّجات لقراءة أفضل للسعر/الشارات */}
        {!isFallback && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent"
            />
          </>
        )}

        {/* شارة "مميز" - تظهر فقط أثناء فترة التمييز الفعلية. */}
        {isListingFeatured(listing) && (
          <span
            className="
              absolute right-3 top-3 inline-flex items-center
              rounded-full bg-action-500 px-2.5 py-1
              text-[10px] font-black text-white shadow-action
            "
          >
            ★ مميز
          </span>
        )}

        {/* زر المفضلة */}
        <div className="absolute left-3 top-3">
          <FavoriteButton listing={listing} />
        </div>

        {/* علامة براتشو احترافية - شفافة، صغيرة، لا تشوّه الصورة */}
        {!isFallback && (
          <div
            aria-hidden="true"
            className="
              pointer-events-none absolute bottom-3 left-3 select-none
              rounded-full bg-black/35 px-2 py-0.5
              text-[10px] font-black tracking-wide text-white/90
              backdrop-blur-sm
            "
          >
            براتشو
          </div>
        )}

        {/* السعر - ركن سفلي يميناً (RTL) - بارز */}
        <div className="absolute bottom-3 right-3">
          <div
            className="
              rounded-2xl border border-white/20
              bg-brand-700/95 px-3.5 py-2
              shadow-blue backdrop-blur-md
            "
          >
            <span className="text-base font-black leading-none text-white sm:text-lg">
              {formatPrice(listing.price)}
            </span>
          </div>
        </div>
      </Link>

      {/* ============== المحتوى ============== */}
      <div className="flex flex-1 flex-col p-3.5 sm:p-4">
        {/* صف 1: تصنيف + اسم التاجر */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="badge !py-0.5 !text-[10px] sm:!text-xs">
            {listing.category || "إعلان"}
          </span>
          {sellerName && (
            <Link
              href={`/traders/${listing.ownerId}`}
              className="
                truncate max-w-[60%] text-[11px] font-bold text-brand-700
                hover:underline dark:text-brand-300
              "
              onClick={(e) => e.stopPropagation()}
            >
              {sellerName}
            </Link>
          )}
        </div>

        {/* صف 2: العنوان */}
        <Link
          href={detailsHref}
          prefetch={false}
          className="group/title"
        >
          <h3
            className="
              line-clamp-2 min-h-[2.5rem] text-sm font-black leading-snug
              text-slate-950 transition-colors
              group-hover/title:text-brand-700
              dark:text-white dark:group-hover/title:text-brand-300
              sm:text-base
            "
          >
            {listing.title}
          </h3>
        </Link>

        {/* صف 3: المعلومات (مدينة / سنة / عداد) */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} className="text-brand-700/70 dark:text-brand-300/70" />
            {listing.city}
          </span>
          {listing.year ? (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} className="text-brand-700/70 dark:text-brand-300/70" />
              {listing.year}
            </span>
          ) : null}
          {listing.mileage ? (
            <span className="inline-flex items-center gap-1">
              <Gauge size={12} className="text-brand-700/70 dark:text-brand-300/70" />
              {Number(listing.mileage).toLocaleString("ar-LY")} كم
            </span>
          ) : null}
          {listing.fuel ? (
            <span className="inline-flex items-center gap-1">
              <Fuel size={12} className="text-brand-700/70 dark:text-brand-300/70" />
              {listing.fuel}
            </span>
          ) : null}
          {(listing as any).driveType ? (
            <span className="inline-flex items-center gap-1">
              <Gauge size={12} className="text-brand-700/70 dark:text-brand-300/70" />
              {(listing as any).driveType}
            </span>
          ) : null}
        </div>

        {/* شارة حالة السيارة (جديدة/مستعملة) - إن وُجدت */}
        {(listing as any).vehicleCondition ? (
          <div className="mt-1.5">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black ${
                (listing as any).vehicleCondition === "جديدة"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {(listing as any).vehicleCondition}
            </span>
          </div>
        ) : null}

        {/* صف 4: شريط التفاعل (لايك/تعليق/مشاركة/مفضلة) */}
        <div className="mt-3">
          <ListingActionsBar listing={listing} />
        </div>

        {/* صف 5: أزرار التواصل */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={listing.phone ? `tel:${listing.phone}` : "#"}
            className="
              inline-flex items-center justify-center gap-1.5
              rounded-2xl border border-slate-200 bg-white
              px-3 py-2.5 text-xs font-bold text-slate-700
              transition hover:border-brand-300 hover:bg-brand-50/50
              hover:text-brand-700 active:scale-[0.98]
              dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100
            "
            aria-label="اتصال"
            onClick={(e) => {
              if (!listing.phone) e.preventDefault();
            }}
          >
            <Phone size={14} />
            اتصال
          </a>
          <a
            href={wa ? `https://wa.me/${wa}` : "#"}
            target={wa ? "_blank" : undefined}
            rel={wa ? "noreferrer" : undefined}
            className="
              inline-flex items-center justify-center gap-1.5
              rounded-2xl bg-emerald-500 px-3 py-2.5
              text-xs font-bold text-white
              transition hover:bg-emerald-600 active:scale-[0.98]
              shadow-sm shadow-emerald-500/30
            "
            aria-label="واتساب"
            onClick={(e) => {
              if (!wa) e.preventDefault();
            }}
          >
            <MessageCircle size={14} />
            واتساب
          </a>
        </div>
      </div>
    </article>
  );
}

export const ListingCard = memo(ListingCardImpl, (prev, next) => {
  const a = prev.listing;
  const b = next.listing;
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.price === b.price &&
    a.featured === b.featured &&
    a.likesCount === b.likesCount &&
    a.commentsCount === b.commentsCount &&
    prev.priority === next.priority
  );
});
