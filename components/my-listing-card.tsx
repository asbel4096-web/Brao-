"use client";

import Link from "next/link";
import Image from "next/image";
import { Edit2, Trash2, Eye, Calendar, MapPin, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatPrice, timeAgo } from "@/lib/utils";

const FALLBACK = "/icons/car-card.svg";

interface MyListingCardProps {
  listing: Listing;
  onDelete: (id: string) => void;
}

const STATUS_CONFIG = {
  approved: {
    label: "معتمد",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-500/95 text-white border-emerald-400",
    pillClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  },
  pending: {
    label: "قيد المراجعة",
    icon: Clock,
    badgeClass: "bg-amber-500/95 text-white border-amber-400",
    pillClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  },
  rejected: {
    label: "مرفوض",
    icon: AlertCircle,
    badgeClass: "bg-rose-500/95 text-white border-rose-400",
    pillClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800",
  },
  draft: {
    label: "مسودة",
    icon: Clock,
    badgeClass: "bg-slate-500/95 text-white border-slate-400",
    pillClass: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800",
  },
} as const;

export function MyListingCard({ listing, onDelete }: MyListingCardProps) {
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
        <Image
          src={img}
          alt={listing.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          loading="lazy"
          className={
            isFallback
              ? "object-contain p-10 opacity-50"
              : "object-cover transition duration-500 group-hover:scale-105"
          }
        />

        {/* تظليل تدريجي علوي */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent"
        />

        {/* شارة الحالة */}
        <span
          className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-black backdrop-blur-md ${status.badgeClass}`}
        >
          <StatusIcon size={12} />
          {status.label}
        </span>

        {/* السعر */}
        <div className="absolute bottom-3 left-3 rounded-2xl border border-white/20 bg-brand-700/90 px-3 py-1.5 shadow-blue backdrop-blur-md">
          <span className="text-sm font-black text-white">
            {formatPrice(listing.price)}
          </span>
        </div>
      </div>

      {/* محتوى البطاقة */}
      <div className="flex flex-1 flex-col p-4">
        {/* القسم */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="badge truncate">{listing.category}</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
            <Eye size={11} /> {listing.views || 0}
          </span>
        </div>

        {/* العنوان */}
        <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-black leading-snug text-slate-950 dark:text-white">
          {listing.title}
        </h3>

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
              <span className="font-black">سبب الرفض:</span> {listing.rejectionReason}
            </span>
          </div>
        )}

        {/* أزرار الإجراءات */}
        <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
          <Link
            href={`/listings/${listing.id}`}
            className="btn-secondary !py-2 !px-2 !text-xs"
            aria-label="عرض التفاصيل"
          >
            <Eye size={14} />
            <span>عرض</span>
          </Link>
          <Link
            href={`/my-listings/${listing.id}/edit`}
            className="btn-primary !py-2 !px-2 !text-xs"
            aria-label="تعديل"
          >
            <Edit2 size={14} />
            <span>تعديل</span>
          </Link>
          <button
            type="button"
            onClick={() => onDelete(listing.id)}
            className="btn-danger !py-2 !px-2 !text-xs"
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
