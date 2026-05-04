"use client";

import { MessageCircleMore } from "lucide-react";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorite-button";
import { LikeButton } from "@/components/like-button";
import { ShareButton } from "@/components/share-button";
import type { Listing } from "@/lib/types";

interface ListingActionsBarProps {
  listing: Listing;
  compact?: boolean;
  commentsCount?: number;
}

export function ListingActionsBar({
  listing,
  compact = false,
  commentsCount = 0,
}: ListingActionsBarProps) {
  const buttonClasses = compact
    ? "!h-10 !w-10"
    : "min-w-[84px] justify-center";

  return (
    <div className="grid grid-cols-4 gap-2">
      <LikeButton
        listing={listing}
        count={Number(listing.likesCount || 0)}
        className={buttonClasses}
      />

      <Link
        href={`/listings/${listing.id}#comments`}
        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      >
        <MessageCircleMore size={16} />
        <span>{commentsCount > 0 ? commentsCount : "تعليق"}</span>
      </Link>

      <ShareButton
        title={listing.title}
        text={listing.city}
        image={listing.images?.[0]}
        variant="button"
        className="[&>button]:w-full [&>button]:justify-center"
      />

      <FavoriteButton listing={listing} variant="button" className={buttonClasses} />
    </div>
  );
}
