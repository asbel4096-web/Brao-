"use client";

/**
 * Bratsho DS 1.0 — أجزاء بطاقة الإعلان الموحّدة (تُستخدم في ListingCard و CompactListingCard).
 * نفس المقاسات والألوان في تطبيق Flutter (BratshoVehicleCard).
 */
import {
  Calendar,
  Camera,
  Car,
  Check,
  Cog,
  Crown,
  Droplet,
  Fuel,
  Gauge,
  ImageIcon,
  Info,
  MapPin,
  Rocket,
  Star,
  Tag,
  Zap,
} from "lucide-react";
import type { Listing } from "@/lib/types";
import { formatAmount } from "@/lib/utils";
import {
  BADGE_CLASS,
  listingBadges,
  listingSpecs,
  type PromoKind,
  type SpecIcon,
} from "@/lib/listing-display";

const SPEC_ICON: Record<SpecIcon, typeof Calendar> = {
  calendar: Calendar,
  gauge: Gauge,
  gear: Cog,
  fuel: Fuel,
  check: Check,
  pin: MapPin,
  info: Info,
  car: Car,
  drop: Droplet,
  star: Star,
};

const BADGE_ICON: Partial<Record<PromoKind, typeof Calendar>> = {
  vip: Crown,
  urgent: Zap,
  featured: Star,
  sponsored: Rocket,
  cat: Tag,
};

/** شارات الترويج أعلى الصورة (جهة البداية = يمين). */
export function PromoBadges({ listing, max = 2, category }: { listing: Partial<Listing>; max?: number; category?: string }) {
  const badges = listingBadges(listing, max, category);
  if (!badges.length) return null;
  return (
    <div className="pointer-events-none absolute right-2.5 top-2.5 flex max-w-[75%] flex-wrap gap-1.5">
      {badges.map((b) => {
        const Icon = BADGE_ICON[b.kind];
        return (
          <span key={b.kind} className={BADGE_CLASS[b.kind]}>
            {Icon && <Icon size={12} strokeWidth={2.4} />}
            {b.label}
          </span>
        );
      })}
    </div>
  );
}

/** عدّاد الصور أسفل الصورة (جهة النهاية = يسار) عند وجود صورتين فأكثر. */
export function PhotoCount({ count }: { count: number }) {
  if (count < 2) return null;
  return (
    <span className="num pointer-events-none absolute bottom-2 left-2 inline-flex h-[22px] items-center gap-1 rounded-full bg-ink/60 px-2 text-[11px] font-bold text-white">
      <Camera size={12} />
      {count}
    </span>
  );
}

/** بديل الصورة: لا حاوية فارغة أبداً. */
export function NoImage() {
  return (
    <div className="absolute inset-0 grid place-items-center bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <div className="text-center text-xs font-bold">
        <ImageIcon size={30} strokeWidth={1.6} className="mx-auto mb-1.5" />
        لا توجد صورة
      </div>
    </div>
  );
}

/** سطر السعر: الرقم بخط Inter معزول الاتجاه + «د.ل» منفصلة؛ السعر الصفري «السعر عند الطلب». */
export function PriceLine({
  price,
  negotiable,
  size = "md",
}: {
  price: unknown;
  negotiable?: boolean;
  size?: "sm" | "md";
}) {
  const amount = formatAmount(price as any);
  if (amount === null) {
    return (
      <div className={`font-extrabold text-price ${size === "sm" ? "text-[13px]" : "text-[15px]"}`}>
        السعر عند الطلب
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-1.5">
      <span
        className={`num font-extrabold text-price ${size === "sm" ? "text-base leading-[22px]" : "text-lg leading-6"}`}
      >
        {amount}
      </span>
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">د.ل</span>
      {negotiable && size !== "sm" && (
        <span className="ms-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
          قابل للتفاوض
        </span>
      )}
    </div>
  );
}

/** صف المواصفات حسب القسم (يظهر فقط ما هو موجود). */
export function SpecRow({ listing, max = 3, compact = false }: { listing: Partial<Listing>; max?: number; compact?: boolean }) {
  const specs = listingSpecs(listing, max);
  if (!specs.length) return null;
  return (
    <ul
      className={`m-0 flex list-none flex-wrap gap-x-2.5 gap-y-1 p-0 font-medium text-slate-600 dark:text-slate-300 ${compact ? "text-[11px]" : "text-xs"}`}
    >
      {specs.map((s) => {
        const Icon = SPEC_ICON[s.icon];
        return (
          <li
            key={s.key}
            className={`inline-flex max-w-full items-center gap-1 truncate ${s.tone === "success" ? "text-emerald-700 dark:text-emerald-300" : ""}`}
          >
            <Icon size={13} className={s.tone === "success" ? "" : "text-slate-400"} />
            <span className={s.numeric ? "num" : undefined}>{s.label}</span>
            {s.unit && <span>{s.unit}</span>}
          </li>
        );
      })}
    </ul>
  );
}
