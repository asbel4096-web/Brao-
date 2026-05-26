"use client";

import Link from "next/link";
import Image from "next/image";
import { memo } from "react";
import {
  Clock,
  MapPin,
  MessageCircle,
  Phone,
  Truck,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import {
  calculateDistanceKm,
  formatDistance,
  normalizeLibyanPhone,
} from "@/lib/utils";

/**
 * البطاقة الأفقية لقسم "أقرب الساحبات إليك".
 *
 * هذه نسخة "premium" من TowTruckCard: أفقية، صورة كبيرة على اليمين،
 * تفاصيل + أزرار أكبر على اليسار، مع badge "أقرب" للأقرب فعلاً.
 * تُستخدم فقط في top-3 بعد منح الموقع. الـgrid السفلي يبقى يستخدم
 * TowTruckCard العادي.
 */

interface Props {
  listing: Listing;
  userLat?: number | null;
  userLng?: number | null;
  /** الأول في القائمة - نُبرزه أكثر (ring + badge). */
  isClosest?: boolean;
  priority?: boolean;
}

/**
 * تقدير زمن الوصول بالدقائق.
 * 1.7 دقيقة/كم تقريباً = ~35 كم/س متوسط داخل المدينة (مع توقفات).
 * نُدوّر للأقرب دقيقة، حد أدنى 2 دقيقة (الساحبة تحتاج وقت تجهيز).
 */
function estimateEtaMinutes(km: number | null): number | null {
  if (km == null) return null;
  return Math.max(2, Math.round(km * 1.7));
}

function NearestTowCardImpl({
  listing,
  userLat,
  userLng,
  isClosest = false,
  priority = false,
}: Props) {
  const phone = listing.phone || "";
  const wa = normalizeLibyanPhone(listing.whatsapp || phone);
  const available = listing.availableNow === true;

  const distanceKm = calculateDistanceKm(
    userLat,
    userLng,
    listing.latitude,
    listing.longitude
  );
  const distanceText = formatDistance(distanceKm);
  const etaMin = estimateEtaMinutes(distanceKm);

  return (
    <article
      className={`
        relative overflow-hidden rounded-3xl border bg-white transition
        dark:bg-slate-900
        ${isClosest
          ? "border-action-300 shadow-action dark:border-action-700/60"
          : "border-slate-200 shadow-card dark:border-slate-800"}
      `}
    >
      {/* badge "الأقرب" - الزاوية العلوية اليمنى (RTL) */}
      {isClosest && (
        <div
          className="
            absolute right-0 top-0 z-10
            rounded-bl-2xl bg-action-500 px-3 py-1
            text-[10px] font-black text-white shadow-action
          "
        >
          الأقرب إليك
        </div>
      )}

      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        {/* الصورة - يمين بحكم RTL */}
        <Link
          href={`/tow-trucks/${listing.id}`}
          className="
            relative block aspect-[4/3] w-32 shrink-0 overflow-hidden
            rounded-2xl sm:w-40
          "
        >
          {listing.images && listing.images[0] ? (
            <Image
              src={listing.images[0]}
              alt={listing.title || "ساحبة سيارات"}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 128px, 160px"
              priority={priority}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-br from-brand-700 via-brand-600 to-action-500 text-white">
              <Truck size={32} strokeWidth={2} />
            </div>
          )}
        </Link>

        {/* التفاصيل + الأزرار - يسار */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* العنوان */}
          <div className="flex items-start justify-between gap-1.5">
            <Link
              href={`/tow-trucks/${listing.id}`}
              className="line-clamp-1 flex-1 text-sm font-black text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300 sm:text-[15px]"
            >
              {listing.title || "ساحبة سيارات"}
            </Link>
          </div>

          {/* حالة "متاح الآن" */}
          {available ? (
            <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-black text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
              متاح الآن
            </p>
          ) : (
            listing.city && (
              <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <MapPin size={11} />
                {listing.city}
              </p>
            )
          )}

          {/* المسافة + الوقت */}
          {(distanceText || etaMin != null) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
              {distanceText && (
                <span className="inline-flex items-center gap-1">
                  <MapPin size={11} className="text-brand-600 dark:text-brand-300" />
                  <span className="tabular-nums">{distanceText}</span>
                </span>
              )}
              {etaMin != null && (
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} className="text-action-600 dark:text-action-300" />
                  <span className="tabular-nums">~{etaMin} دقيقة</span>
                </span>
              )}
            </div>
          )}

          {/* الأزرار - row at bottom */}
          <div className="mt-auto flex items-center gap-1.5 pt-3">
            {wa && (
              <a
                href={`https://wa.me/${wa}`}
                target="_blank"
                rel="noreferrer"
                aria-label="واتساب"
                className="
                  inline-flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-full bg-emerald-500 text-white shadow-sm
                  transition active:scale-95 hover:bg-emerald-600
                "
              >
                <MessageCircle size={15} />
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                aria-label="اتصال"
                className="
                  inline-flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-full bg-brand-700 text-white shadow-sm
                  transition active:scale-95 hover:bg-brand-600
                "
              >
                <Phone size={15} />
              </a>
            )}
            <Link
              href={`/tow-trucks/${listing.id}`}
              className="
                ms-auto inline-flex h-9 items-center justify-center gap-1
                rounded-2xl bg-action-500 px-4 text-[12px] font-black text-white
                shadow-action transition active:scale-95 hover:bg-action-600
                sm:px-5 sm:text-[13px]
              "
            >
              طلب الآن
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export const NearestTowCard = memo(NearestTowCardImpl);
