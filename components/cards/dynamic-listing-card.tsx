"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  MapPin,
  Gauge,
  Calendar,
  Star,
  CheckCircle2,
  Wrench,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatPrice, formatNumber } from "@/lib/utils";
import { getCategoryConfig, type HomeBucket } from "@/lib/category-config";
import { FavoriteButton } from "@/components/favorite-button";

/**
 * ============================================================
 *  DynamicListingCard — البطاقة الديناميكية (المرحلة 3)
 * ============================================================
 *
 * بطاقة واحدة ذكية تعرض حقولاً *مختلفة حسب نوع القسم* بدل بطاقة
 * موحّدة، معتمدةً على homeBucket من getCategoryConfig:
 *
 *   cars      → المسافة + السنة          (CarCard)
 *   parts     → الحالة + السيارة المتوافقة (PartsCard)
 *   tow       → مناطق التغطية + متاح الآن  (TowTruckCard)
 *   services  → التقييم + الخدمة           (ServiceCard)
 *   dealers   → عدد السيارات              (DealerCard)
 *
 * قاعدة صارمة: *لا يُعرض أي حقل فارغ* — لا "غير متوفر"، لا N/A،
 * لا undefined/null. كل حقل يُغلَّف بـhasValue قبل العرض.
 */

const FALLBACK = "/icons/car-card.svg";

/** هل للقيمة محتوى فعلي يستحق العرض؟ (يمنع N/A و undefined و0 الفارغ) */
function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  return Boolean(v);
}

interface Props {
  listing: Listing;
  priority?: boolean;
}

function DynamicListingCardImpl({ listing, priority = false }: Props) {
  const img = listing.images?.[0] || FALLBACK;
  const isFallback = !listing.images?.length;
  const href = `/listings/${listing.id}`;
  const bucket = getCategoryConfig(listing.category || "").homeBucket;

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

        {/* شارة نوع القسم (أعلى اليمين) */}
        <BucketBadge bucket={bucket} />

        {/* زر الحفظ (أعلى اليسار) */}
        <div className="absolute left-3 top-3">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-white/25 text-white ring-1 ring-white/30 backdrop-blur-md">
            <FavoriteButton listing={listing} size={16} className="!text-white" />
          </div>
        </div>
      </Link>

      <div className="p-3">
        {/* الترتيب المطلوب: العنوان → السعر → التفاصيل الخاصة بالقسم */}
        <Link href={href}>
          <h3 className="line-clamp-1 text-sm font-black text-slate-900 transition-colors group-hover:text-brand-700 dark:text-white">
            {listing.title}
          </h3>
        </Link>

        {/* السعر (formatPrice يضيف "د.ل" - لا تكرار) */}
        {hasValue(listing.price) && (
          <div className="mt-1 font-black text-brand-700 dark:text-brand-300">
            <span className="text-lg leading-none">
              {formatPrice(listing.price)}
            </span>
          </div>
        )}

        {/* التفاصيل الخاصة بنوع القسم - كلها محميّة بـhasValue */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {hasValue(listing.city) && (
            <Meta icon={MapPin}>{listing.city}</Meta>
          )}
          <BucketDetails bucket={bucket} listing={listing} />
        </div>
      </div>
    </article>
  );
}

/* ---------- شارة نوع القسم ---------- */
function BucketBadge({ bucket }: { bucket: HomeBucket }) {
  const map: Partial<Record<HomeBucket, { label: string; cls: string }>> = {
    parts: { label: "قطعة غيار", cls: "bg-emerald-600 text-white" },
    tow: { label: "سطحة", cls: "bg-orange-500 text-white" },
    services: { label: "خدمة", cls: "bg-violet-600 text-white" },
    dealers: { label: "معرض", cls: "bg-brand-700 text-white" },
  };
  const b = map[bucket];
  if (!b) return null;
  return (
    <span
      className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-black shadow-sm backdrop-blur-sm ${b.cls}`}
    >
      {b.label}
    </span>
  );
}

/* ---------- التفاصيل حسب نوع القسم (لا تعرض فارغاً) ---------- */
function BucketDetails({
  bucket,
  listing,
}: {
  bucket: HomeBucket;
  listing: Listing;
}) {
  const l = listing as Listing & {
    condition?: string;
    compatibleCar?: string;
    coverageAreas?: string;
    availableNow?: boolean;
    rating?: number;
  };

  if (bucket === "cars") {
    return (
      <>
        {hasValue(l.mileage) && (
          <Meta icon={Gauge}>{formatNumber(l.mileage as number)} كم</Meta>
        )}
        {hasValue(l.year) && <Meta icon={Calendar}>{l.year}</Meta>}
      </>
    );
  }

  if (bucket === "parts") {
    return (
      <>
        {hasValue(l.condition) && (
          <Meta icon={CheckCircle2}>{l.condition}</Meta>
        )}
        {hasValue(l.compatibleCar) && (
          <span className="line-clamp-1">{l.compatibleCar}</span>
        )}
      </>
    );
  }

  if (bucket === "tow") {
    return (
      <>
        {hasValue(l.coverageAreas) && (
          <span className="line-clamp-1">{l.coverageAreas}</span>
        )}
        {l.availableNow === true && (
          <span className="inline-flex items-center gap-1 font-black text-emerald-600">
            <CheckCircle2 size={12} /> متاح الآن
          </span>
        )}
      </>
    );
  }

  if (bucket === "services") {
    return (
      <>
        {hasValue(l.rating) && (
          <Meta icon={Star}>{Number(l.rating).toFixed(1)}</Meta>
        )}
        <Meta icon={Wrench}>خدمة</Meta>
      </>
    );
  }

  return null;
}

function Meta({
  icon: Icon,
  children,
}: {
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon size={12} className="text-brand-600/70" />
      {children}
    </span>
  );
}

export const DynamicListingCard = memo(
  DynamicListingCardImpl,
  (prev, next) =>
    prev.listing.id === next.listing.id &&
    prev.listing.title === next.listing.title &&
    prev.listing.price === next.listing.price &&
    prev.priority === next.priority
);
