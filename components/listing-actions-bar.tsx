"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import { useListingCounts } from "@/hooks/useListingEngagement";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListingActionsBarProps {
  listing: Listing;
  /** القيمة الأوّلية لتعليقات (تُستخدم seed قبل وصول snapshot) */
  commentsCount?: number;
}

/**
 * شريط التفاعل بتصميم أيقوني نظيف (مطابق للصورة المرجعية):
 *
 * - بدون خلفيات أو حدود — مجرد أيقونات + أرقام بجانبها.
 * - الأرقام live من Firestore (snapshot واحد مشترك).
 * - عند الإعجاب يتحدّث الرقم فوراً (optimistic).
 * - تباعد متساوٍ - justify-around.
 * - مقاس موحَّد للأيقونات (h-10).
 */
export function ListingActionsBar({
  listing,
  commentsCount: initialCommentsCount = 0,
}: ListingActionsBarProps) {
  const { likesCount, commentsCount } = useListingCounts(listing.id, {
    likesCount: Number(listing.likesCount || 0),
    commentsCount: Number(listing.commentsCount || initialCommentsCount || 0),
  });

  return (
    <div
      className={cn(
        "flex items-center justify-around gap-1 border-t border-slate-200/70 pt-2 dark:border-slate-700/70"
      )}
    >
      {/* مفضلة (يمين أقصى في RTL) */}
      <FavoriteButton listing={listing} variant="button" />

      {/* مشاركة */}
      <ShareButton
        title={listing.title}
        text={listing.city}
        image={listing.images?.[0]}
        variant="button"
      />

      {/* تعليقات */}
      <CommentsButton listingId={listing.id} count={commentsCount} />

      {/* لايك (يسار أقصى في RTL) */}
      <LikeButton listing={listing} count={likesCount} />
    </div>
  );
}

/* ============================================================
 * زر التعليقات - أيقوني نظيف، رقم بجانب الأيقونة
 * ============================================================ */
function CommentsButton({
  listingId,
  count,
}: {
  listingId: string;
  count: number;
}) {
  const showCount = count > 0;

  return (
    <Link
      href={`/listings/${listingId}#comments`}
      aria-label={count > 0 ? `${count} تعليق` : "إضافة تعليق"}
      className="group inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold text-slate-600 transition-all duration-200 hover:text-brand-700 active:scale-95 dark:text-slate-300 dark:hover:text-brand-300"
    >
      {showCount && (
        <span className="tabular-nums">{count.toLocaleString("ar-LY")}</span>
      )}
      <MessageCircle size={18} className="shrink-0" />
    </Link>
  );
}
