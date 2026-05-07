"use client";

import { MessageCircleMore } from "lucide-react";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ListingActionsBarProps {
  listing: Listing;
  compact?: boolean;
  commentsCount?: number;
}

/**
 * شريط التفاعل (إعجاب / تعليق / مشاركة / مفضلة).
 *
 * تحسينات نسخة Facebook-feel مع هوية براتشو:
 * - الأزرار بنفس الارتفاع والـ rounded متطابقة.
 * - hover وضّاء + active:scale-97 لإحساس النقر.
 * - الأرقام تستخدم arabic locale.
 * - زر التعليق الآن يلوّن brand عند hover (بدل رمادي صامت).
 * - فاصل خفيف بين أعلى البطاقة وشريط التفاعل بدلاً من حدود قاسية.
 */
export function ListingActionsBar({
  listing,
  compact = false,
  commentsCount = 0,
}: ListingActionsBarProps) {
  const buttonClasses = compact ? "!h-10 !w-10" : "min-w-[84px] justify-center";

  return (
    <div
      className={cn(
        "grid grid-cols-4 gap-1.5 rounded-2xl bg-slate-50/80 p-1.5 dark:bg-slate-950/50 sm:gap-2 sm:p-2",
      )}
    >
      <LikeButton
        listing={listing}
        count={Number(listing.likesCount || 0)}
        className={buttonClasses}
      />

      <CommentsButton
        listingId={listing.id}
        count={commentsCount}
        className={buttonClasses}
      />

      <ShareButton
        title={listing.title}
        text={listing.city}
        image={listing.images?.[0]}
        variant="button"
        className="[&>button]:w-full [&>button]:justify-center [&>button]:transition-all [&>button]:duration-200 active:[&>button]:scale-[0.97]"
      />

      <FavoriteButton
        listing={listing}
        variant="button"
        className={cn(buttonClasses, "transition-all duration-200 active:scale-[0.97]")}
      />
    </div>
  );
}

/* ============================================================
 * زر التعليق - مستقل لتسهيل التحسين البصري
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
  return (
    <Link
      href={`/listings/${listingId}#comments`}
      className={cn(
        "group inline-flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 active:scale-[0.97] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300",
        className,
      )}
      aria-label={count > 0 ? `${count} تعليق` : "إضافة تعليق"}
    >
      <MessageCircleMore
        size={16}
        className="shrink-0 text-slate-500 transition-colors group-hover:text-brand-600 dark:text-slate-400 dark:group-hover:text-brand-300"
      />
      <span className="truncate">
        {count > 0 ? count.toLocaleString("ar-LY") : "تعليق"}
      </span>
    </Link>
  );
}
