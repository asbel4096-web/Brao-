"use client";

import { Bookmark, MessageCircleMore, Share2, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import { useListingCounts } from "@/hooks/useListingEngagement";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListingActionsBarProps {
  listing: Listing;
  compact?: boolean;
  /** قيمة أوّلية للتعليقات (تُستخدم كـ seed قبل وصول snapshot) */
  commentsCount?: number;
}

/**
 * شريط التفاعل (Facebook-feel بهوية براتشو):
 *
 * - الأعداد live من Firestore (snapshot واحد مشترك بين كل البطاقات).
 * - عند الإعجاب/إلغاؤه يتحدّث الرقم فوراً (optimistic).
 * - زر التعليق يفتح قسم التعليقات.
 * - أزرار موحَّدة في الارتفاع والـ rounded.
 * - hover يلوّن brand، active:scale للضغط.
 */
export function ListingActionsBar({
  listing,
  compact = false,
  commentsCount: initialCommentsCount = 0,
}: ListingActionsBarProps) {
  // جلب الأعداد الحية - مشترك بين كل المكوّنات لنفس listingId
  const { likesCount, commentsCount } = useListingCounts(listing.id, {
    likesCount: Number(listing.likesCount || 0),
    commentsCount: Number(listing.commentsCount || initialCommentsCount || 0),
  });

  const buttonClasses = compact ? "!h-10 !w-10" : "min-w-[84px] justify-center";

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-50/80 p-1.5 dark:bg-slate-950/50 sm:gap-2 sm:p-2"
      )}
    >
      {/* 1. إعجاب 👍 - بهوية brand عند التفعيل */}
      <LikeButton
        listing={listing}
        count={likesCount}
        showCountAlways
        className={buttonClasses}
      />

      {/* 2. تعليق - رقم live من نفس الـ snapshot */}
      <CommentsButton
        listingId={listing.id}
        count={commentsCount}
        className={buttonClasses}
      />

      {/* 3. مشاركة */}
      <ShareButton
        title={listing.title}
        text={listing.city}
        image={listing.images?.[0]}
        variant="button"
        className="[&>button]:w-full [&>button]:justify-center [&>button]:transition-all [&>button]:duration-200 active:[&>button]:scale-[0.97]"
      />

      {/* 4. مفضلة (حفظ) - bookmark بدلاً من Heart للتمييز عن الإعجاب */}
      <FavoriteButton
        listing={listing}
        variant="button"
        className={cn(
          buttonClasses,
          "transition-all duration-200 active:scale-[0.97]"
        )}
      />
    </div>
  );
}

/* ============================================================
 * زر التعليق
 * ============================================================ */
function CommentsButton({
  listingId,
  count,
  className,
}: {
  listingId: string;
  count: number;
  className?: string;
}) {
  const display = count > 0 ? count.toLocaleString("ar-LY") : "تعليق";

  return (
    <Link
      href={`/listings/${listingId}#comments`}
      aria-label={count > 0 ? `${count} تعليق` : "إضافة تعليق"}
      className={cn(
        "group inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300",
        className
      )}
    >
      <MessageCircleMore
        size={16}
        className="shrink-0 text-slate-500 transition-colors group-hover:text-brand-600 dark:text-slate-400 dark:group-hover:text-brand-300"
      />
      <span className="truncate tabular-nums">{display}</span>
    </Link>
  );
}
