"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import {
  Eye,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Truck,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import {
  calculateDistanceKm,
  formatDistance,
  formatPrice,
  normalizeLibyanPhone,
} from "@/lib/utils";

interface TowTruckCardProps {
  listing: Listing;
  /** موقع المستخدم - لو متوفر تظهر المسافة. */
  userLat?: number | null;
  userLng?: number | null;
  priority?: boolean;
}

function TowTruckCardImpl({
  listing,
  userLat,
  userLng,
  priority = false,
}: TowTruckCardProps) {
  const phone = listing.phone || "";
  const wa = normalizeLibyanPhone(listing.whatsapp || phone);
  const available = listing.availableNow === true;

  // حساب المسافة لو الموقعان متوفران (موقع المستخدم + موقع الساحبة).
  // calculateDistanceKm تُرجع null لو أي مدخل ناقص.
  const distanceKm = calculateDistanceKm(
    userLat,
    userLng,
    listing.latitude,
    listing.longitude
  );
  const distanceText = formatDistance(distanceKm);

  // النص الجغرافي: المدينة + المنطقة (لو موجودة).
  const locationText = [listing.city, listing.area]
    .filter(Boolean)
    .join(" — ");

  return (
    <article
      className="
        group flex flex-col overflow-hidden rounded-3xl
        border border-slate-200/70 bg-white shadow-card transition
        hover:shadow-lg
        dark:border-slate-700/70 dark:bg-slate-900
      "
    >
      {/* الصورة */}
      <Link
        href={`/tow-trucks/${listing.id}`}
        className="relative block aspect-[4/3] overflow-hidden"
      >
        {listing.images && listing.images[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.title || "ساحبة سيارات"}
            fill
            className="object-cover transition group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 33vw"
            priority={priority}
          />
        ) : (
          /* placeholder مخصّص للساحبات - بهوية البرند بدلاً من رمادي.
             تدرّج أزرق-برتقالي خفيف + أيقونة Truck بيضاء كبيرة. يستخدَم
             عندما لا يرفع المالك صورة لخدمته. */
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand-700 via-brand-600 to-action-500 text-white">
            <Truck size={40} strokeWidth={2} className="opacity-90" />
            <span className="text-[10px] font-black opacity-90">
              ساحبة سيارات
            </span>
          </div>
        )}

        {/* بادج "متاح الآن" */}
        {available && (
          <span
            className="
              absolute right-3 top-3 inline-flex items-center gap-1
              rounded-full bg-emerald-500 px-2.5 py-1
              text-[10px] font-black text-white shadow-md
            "
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            متاح الآن
          </span>
        )}

        {/* بادج المسافة */}
        {distanceText && (
          <span
            className="
              absolute left-3 top-3 inline-flex items-center gap-1
              rounded-full bg-brand-700 px-2.5 py-1
              text-[10px] font-black text-white shadow-md
            "
          >
            <Navigation size={10} />
            {distanceText}
          </span>
        )}
      </Link>

      {/* المحتوى */}
      <div className="flex flex-1 flex-col p-3">
        <Link
          href={`/tow-trucks/${listing.id}`}
          className="line-clamp-1 text-sm font-black text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
        >
          {listing.title || "ساحبة سيارات"}
        </Link>

        {locationText && (
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <MapPin size={11} className="shrink-0" />
            <span className="line-clamp-1">{locationText}</span>
          </p>
        )}

        {/* السعر إذا موجود */}
        {Number(listing.price) > 0 && (
          <p className="mt-1.5 text-xs font-black text-action-600 dark:text-action-300">
            {formatPrice(listing.price)} د.ل
          </p>
        )}

        {/* الأزرار */}
        <div className="mt-3 flex gap-1.5">
          {phone && (
            <a
              href={`tel:${phone}`}
              aria-label="اتصال"
              className="
                inline-flex h-9 flex-1 items-center justify-center gap-1
                rounded-2xl bg-brand-700 text-[11px] font-black text-white
                transition active:scale-95 hover:bg-brand-600
              "
            >
              <Phone size={12} />
              اتصال
            </a>
          )}
          {wa && (
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              aria-label="واتساب"
              className="
                inline-flex h-9 w-9 shrink-0 items-center justify-center
                rounded-2xl bg-emerald-500 text-white
                transition active:scale-95 hover:bg-emerald-600
              "
            >
              <MessageCircle size={14} />
            </a>
          )}
          <Link
            href={`/tow-trucks/${listing.id}`}
            aria-label="عرض التفاصيل"
            className="
              inline-flex h-9 w-9 shrink-0 items-center justify-center
              rounded-2xl border border-slate-200 bg-white text-slate-700
              transition active:scale-95 hover:bg-slate-50
              dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
              dark:hover:bg-slate-800
            "
          >
            <Eye size={14} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export const TowTruckCard = memo(TowTruckCardImpl);
