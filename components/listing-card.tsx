"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import { MapPin, Phone, MessageCircle, Eye, Calendar, Gauge } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatPrice, normalizeLibyanPhone } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";
import { OwnerOnly } from "./owner-only";

const FALLBACK = "/icons/car-card.svg";

interface ListingCardProps {
  listing: Listing;
  /**
   * إذا كانت true، الصورة الأولى ستتحمل بأولوية (eager).
   * استعملها لأول 2-3 بطاقات فوق الـ fold للحصول على LCP أفضل.
   */
  priority?: boolean;
}

function ListingCardImpl({ listing, priority = false }: ListingCardProps) {
  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const img = listing.images?.[0] || FALLBACK;
  const isFallback = !listing.images?.length;

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden
        rounded-3xl border border-slate-200/80 bg-white
        shadow-card transition-all duration-300
        hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-blue
        dark:border-slate-700/80 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      <Link
        href={`/listings/${listing.id}`}
        prefetch={false}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800"
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
              ? "object-contain p-10 opacity-50"
              : "object-cover transition duration-500 group-hover:scale-105"
          }
        />

        {!isFallback && (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/40 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/40 to-transparent"
            />
          </>
        )}

        {listing.featured && (
          <span className="absolute right-3 top-3 rounded-full bg-action-500 px-3 py-1 text-[11px] font-black text-white shadow-action">
            مميز
          </span>
        )}

        <div className="absolute left-3 top-3">
          <FavoriteButton listing={listing} />
        </div>

        {/*
          عداد المشاهدات يظهر فقط للمالك.
          OwnerOnly يقارن user.uid مع listing.ownerId ويرجع null للزوار العاديين.
          الشارة محسَّنة بشعار "خاص بك" ليفهم المالك أنها مرئية له فقط.
        */}
        {typeof listing.views === "number" && listing.views > 0 && (
          <OwnerOnly ownerId={listing.ownerId}>
            <span
              className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/95 px-2.5 py-1 text-[11px] font-black text-white shadow-md backdrop-blur-md"
              title="عداد المشاهدات يظهر لك فقط كمالك للإعلان"
            >
              <Eye size={12} /> {listing.views}
            </span>
          </OwnerOnly>
        )}

        <div className="absolute bottom-3 left-3 rounded-2xl border border-white/20 bg-brand-700/90 px-3 py-1.5 shadow-blue backdrop-blur-md">
          <span className="text-sm font-black text-white">
            {formatPrice(listing.price)}
          </span>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2">
          <span className="badge">{listing.category || "إعلان"}</span>
        </div>

        <Link
          href={`/listings/${listing.id}`}
          prefetch={false}
          className="group/title"
        >
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-black leading-snug text-slate-950 transition-colors group-hover/title:text-brand-700 dark:text-white dark:group-hover/title:text-brand-300">
            {listing.title}
          </h3>
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} className="text-brand-700/70 dark:text-brand-300/70" />
            {listing.city}
          </span>
          {listing.year ? (
            <span className="inline-flex items-center gap-1">
              <Calendar size={13} className="text-brand-700/70 dark:text-brand-300/70" />
              {listing.year}
            </span>
          ) : null}
          {listing.mileage ? (
            <span className="inline-flex items-center gap-1">
              <Gauge size={13} className="text-brand-700/70 dark:text-brand-300/70" />
              {Number(listing.mileage).toLocaleString("ar-LY")} كم
            </span>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <Link
            href={`/listings/${listing.id}`}
            prefetch={false}
            className="btn-primary !py-2 !px-2 !text-xs"
          >
            التفاصيل
          </Link>
          <a
            href={listing.phone ? `tel:${listing.phone}` : "#"}
            className="btn-secondary !py-2 !px-2 !text-xs"
            aria-label="اتصال"
          >
            <Phone size={14} />
            <span className="hidden sm:inline">اتصال</span>
          </a>
          <a
            href={wa ? `https://wa.me/${wa}` : "#"}
            target="_blank"
            rel="noreferrer"
            className="btn-action !py-2 !px-2 !text-xs"
            aria-label="واتساب"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">واتساب</span>
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
    a.views === b.views &&
    a.featured === b.featured &&
    a.ownerId === b.ownerId &&
    prev.priority === next.priority
  );
});
