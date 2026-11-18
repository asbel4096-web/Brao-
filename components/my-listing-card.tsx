"use client";

import Link from "next/link";
import Image from "next/image";
import {
  Edit2,
  Trash2,
  Eye,
  Calendar,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { isListingFeatured, timeAgo } from "@/lib/utils";
import { listingHeadline } from "@/lib/listing-display";
import { NoImage, PriceLine, SpecRow } from "@/components/vehicle-card-parts";
import { BoostButton } from "@/components/wallet/boost-button";

const FALLBACK = "/icons/car-card.svg";

/** الحالة الحالية لطلب التمييز لهذا الإعلان. */
export type FeaturedState =
  | { kind: "none" }
  | { kind: "pending" }
  | { kind: "approved"; until: Date };

interface MyListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
  /** طلب التمييز للإعلان - يُحدَّد من الـparent. */
  featuredState?: FeaturedState;
  /** طلب التمييز - يُستدعى عند الضغط على زر "اطلب تمييز". */
  onRequestFeatured?: (id: string) => Promise<void> | void;
  /** هل عملية طلب التمييز جارية الآن لهذا الإعلان؟ */
  requestingFeatured?: boolean;
}

const STATUS_CONFIG = {
  approved: {
    label: "معتمد",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-600 text-white",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  pending: {
    label: "قيد المراجعة",
    icon: Clock,
    badgeClass: "bg-amber-500 text-white",
    pillClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  rejected: {
    label: "مرفوض",
    icon: AlertCircle,
    badgeClass: "bg-rose-600 text-white",
    pillClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  },
  draft: {
    label: "مسودة",
    icon: Clock,
    badgeClass: "bg-slate-600 text-white",
    pillClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800",
  },
} as const;

export function MyListingCard({
  listing,
  onDelete,
  featuredState,
  onRequestFeatured,
  requestingFeatured,
}: MyListingCardProps) {
  const img = listing.images?.[0] || FALLBACK;
  const isFallback = !listing.images?.length;
  const status = STATUS_CONFIG[listing.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
  const StatusIcon = status.icon;

  return (
    <article
      className="
        group flex h-full flex-col overflow-hidden
        rounded-3xl border border-slate-200/80 bg-white
        shadow-card transition-all
        hover:-translate-y-0.5 hover:shadow-blue
        dark:border-slate-700/80 dark:bg-slate-900
      "
    >
      {/* الصورة */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        {isFallback ? <NoImage /> : <Image
          src={img}
          alt={listingHeadline(listing)}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          className="object-cover transition duration-500 group-hover:scale-105"
        />}

        {/* تظليل تدريجي علوي */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent"
        />

        {/* شارة الحالة */}
        <span
          className={`absolute right-2.5 top-2.5 inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-extrabold shadow-sm ${status.badgeClass}`}
        >
          <StatusIcon size={12} />
          {status.label}
        </span>

        
      </div>

      {/* محتوى البطاقة */}
      <div className="flex flex-1 flex-col p-4">
        {/* القسم */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="badge truncate">{listing.category}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Eye size={11} /> <span className="num">{listing.views || 0}</span>
          </span>
        </div>

        {/* العنوان */}
        <h3 className="truncate text-[15px] font-bold leading-[22px] text-slate-950 dark:text-white" title={listingHeadline(listing)}>
          {listingHeadline(listing)}
        </h3>
        <div className="mt-1.5"><PriceLine price={listing.price} negotiable={(listing as any).negotiable === true} /></div>
        <div className="mt-1.5"><SpecRow listing={listing} /></div>

        {/* الموقع والوقت */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <MapPin size={12} className="text-brand-700/70 dark:text-brand-300/70" />
            {listing.city}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={12} className="text-brand-700/70 dark:text-brand-300/70" />
            {timeAgo(listing.createdAt)}
          </span>
        </div>

        {/* سبب الرفض */}
        {listing.status === "rejected" && listing.rejectionReason && (
          <div
            className={`mt-3 inline-flex items-start gap-2 rounded-2xl border px-3 py-2 text-xs leading-relaxed ${status.pillClass}`}
          >
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-extrabold">سبب الرفض:</span> {listing.rejectionReason}
            </span>
          </div>
        )}

        {/* ============== شريط تمييز الإعلان ==============
            يظهر فقط للإعلانات المعتمدة. ثلاث حالات:
            1) مميز حالياً: عرض المدة المتبقية بلون البرند.
            2) طلب pending: زر معطّل "في انتظار الموافقة".
            3) لا شيء (أو مرفوض سابقاً): زر "اطلب تمييز" فعّال.
        */}
        {listing.status === "approved" && onRequestFeatured && (
          <FeaturedActionBar
            listing={listing}
            state={featuredState || { kind: "none" }}
            busy={!!requestingFeatured}
            onRequest={() => onRequestFeatured(listing.id)}
          />
        )}

        {/* زر التعزيز (Wallet/Boosts) - يظهر فقط للمعتمدة + flag مفعَّل */}
        {listing.status === "approved" && (listing as any).ownerId && (
          <div className="mt-3 flex justify-end">
            <BoostButton
              listingId={listing.id}
              listingTitle={listing.title || ""}
              listingOwnerId={(listing as any).ownerId}
              listingStatus={listing.status}
              listingBoostFields={{
                boostedUntil: (listing as any).boostedUntil,
                featured: (listing as any).featured,
                featuredUntil: (listing as any).featuredUntil,
                vipUntil: (listing as any).vipUntil,
                urgentUntil: (listing as any).urgentUntil,
                bumpedAt: (listing as any).bumpedAt,
                bumpCount: (listing as any).bumpCount,
              }}
            />
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="mt-3 grid grid-cols-3 gap-2 pt-1">
          <Link
            href={`/listings/${listing.id}`}
            className="btn-secondary btn-sm !px-2"
            aria-label="عرض التفاصيل"
          >
            <Eye size={14} />
            <span>عرض</span>
          </Link>
          <Link
            href={`/my-listings/${listing.id}/edit`}
            className="btn-primary btn-sm !px-2"
            aria-label="تعديل"
          >
            <Edit2 size={14} />
            <span>تعديل</span>
          </Link>
          <button
            type="button"
            onClick={() => onDelete(listing.id)}
            className="btn-danger btn-sm !px-2"
            aria-label="حذف"
          >
            <Trash2 size={14} />
            <span>حذف</span>
          </button>
        </div>
      </div>
    </article>
  );
}

/* ============================================================
 * FeaturedActionBar - شريط طلب التمييز ضمن البطاقة.
 * ============================================================ */
function FeaturedActionBar({
  listing,
  state,
  busy,
  onRequest,
}: {
  listing: Listing;
  state: FeaturedState;
  busy: boolean;
  onRequest: () => void;
}) {
  // إذا الإعلان مميز حالياً (live featured) - عرض المعلومات.
  if (isListingFeatured(listing) || state.kind === "approved") {
    const until =
      state.kind === "approved"
        ? state.until
        : listing.featuredUntil
          ? (listing.featuredUntil as any).toDate
            ? (listing.featuredUntil as any).toDate()
            : new Date(listing.featuredUntil as any)
          : null;
    const untilText = until
      ? until.toLocaleDateString("ar-LY", {
          day: "numeric",
          month: "long",
        })
      : "";
    return (
      <div
        className="
          mt-3 flex items-center gap-2 rounded-2xl border border-action-200
          bg-action-50 px-3 py-2 text-xs font-extrabold text-action-700
          dark:border-action-800/40 dark:bg-action-900/20 dark:text-action-300
        "
      >
        <Sparkles size={14} className="shrink-0" />
        <span className="flex-1">
          مميَّز{untilText ? ` حتى ${untilText}` : ""}
        </span>
      </div>
    );
  }

  // إذا طلب pending - زر معطّل.
  if (state.kind === "pending") {
    return (
      <div
        className="
          mt-3 inline-flex w-full items-center justify-center gap-1.5
          rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2
          text-xs font-extrabold text-amber-700
          dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300
        "
      >
        <Clock size={14} className="shrink-0" />
        <span>في انتظار الموافقة</span>
      </div>
    );
  }

  // الحالة الافتراضية - زر فعّال.
  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={busy}
      className="
        mt-3 inline-flex w-full items-center justify-center gap-1.5
        rounded-2xl border border-action-300 bg-action-50 px-3 py-2
        text-xs font-extrabold text-action-700 transition
        active:scale-[0.98] hover:bg-action-100
        disabled:opacity-60
        dark:border-action-800/40 dark:bg-action-900/20 dark:text-action-300
        dark:hover:bg-action-900/30
      "
    >
      {busy ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Sparkles size={14} />
      )}
      <span>{busy ? "جارٍ الإرسال..." : "اطلب تمييز الإعلان"}</span>
    </button>
  );
}
