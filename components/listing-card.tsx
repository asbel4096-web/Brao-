"use client";

import Link from "next/link";
import { MapPin, Phone, MessageCircle, Eye } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatPrice, normalizeLibyanPhone } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";

const FALLBACK = "/icons/car-card.svg";

export function ListingCard({ listing }: { listing: Listing }) {
  const wa = normalizeLibyanPhone(listing.whatsapp || listing.phone || "");
  const img = listing.images?.[0] || FALLBACK;

  return (
    <article className="card group overflow-hidden p-0 transition hover:shadow-blue">
      <Link href={`/listings/${listing.id}`} className="relative block h-52 bg-slate-100 dark:bg-slate-800 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={listing.title}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 flex gap-2">
          {listing.featured && (
            <span className="rounded-full bg-action-500 px-3 py-1 text-xs font-black text-white shadow">
              مميز
            </span>
          )}
        </div>
        <div className="absolute top-3 left-3">
          <FavoriteButton
            listing={listing}
            className="!h-9 !w-9"
          />
        </div>
        {typeof listing.views === "number" && listing.views > 0 && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
            <Eye size={12} /> {listing.views}
          </span>
        )}
      </Link>

      <div className="p-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="badge">{listing.category || "إعلان"}</span>
          <span className="text-base font-black text-brand-700 dark:text-brand-300">
            {formatPrice(listing.price)}
          </span>
        </div>
        <Link href={`/listings/${listing.id}`}>
          <h3 className="line-clamp-2 text-base font-black text-slate-950 dark:text-white">
            {listing.title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          <MapPin size={13} />
          <span>{listing.city}</span>
          {listing.year ? <span>• {listing.year}</span> : null}
          {listing.mileage ? (
            <span>• {Number(listing.mileage).toLocaleString("ar-LY")} كم</span>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <Link
            href={`/listings/${listing.id}`}
            className="btn-primary !py-2 !px-3 !text-xs"
          >
            التفاصيل
          </Link>
          <a
            href={listing.phone ? `tel:${listing.phone}` : "#"}
            className="btn-secondary !py-2 !px-3 !text-xs"
          >
            <Phone size={14} />
            <span className="hidden sm:inline">اتصال</span>
          </a>
          <a
            href={wa ? `https://wa.me/${wa}` : "#"}
            target="_blank"
            rel="noreferrer"
            className="btn-action !py-2 !px-3 !text-xs"
          >
            <MessageCircle size={14} />
            <span className="hidden sm:inline">واتساب</span>
          </a>
        </div>
      </div>
    </article>
  );
}
