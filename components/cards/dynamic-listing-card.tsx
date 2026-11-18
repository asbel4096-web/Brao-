"use client";

import { memo } from "react";
import type { Listing } from "@/lib/types";
import { getCategoryConfig, type HomeBucket } from "@/lib/category-config";
import { CompactListingCard } from "@/components/compact-listing-card";

/**
 * DynamicListingCard — Bratsho DS 1.0
 *
 * كانت بطاقة مستقلة بشارات ملوّنة لكل قسم (أخضر/برتقالي/بنفسجي) وعنوان البائع الحر.
 * الآن: نفس بطاقة الصفوف الموحّدة (CompactListingCard) — نفس الصورة والسعر والشارات —
 * مع اسم القسم كشارة محايدة، والمواصفات حسب القسم تأتي من listingSpecs
 * (السيارات: سنة/مسافة/ناقل؛ القطع: الحالة/التوافق؛ الساحبات: متاح الآن/التغطية؛ الخدمات: التقييم).
 * قاعدة «لا حقل فارغ» محفوظة: كل مواصفة تظهر فقط إن وُجدت.
 */

const BUCKET_LABEL: Partial<Record<HomeBucket, string>> = {
  parts: "قطعة غيار",
  tow: "ساحبة",
  services: "خدمة",
  dealers: "معرض",
};

interface Props {
  listing: Listing;
  priority?: boolean;
}

function DynamicListingCardImpl({ listing, priority = false }: Props) {
  const bucket = getCategoryConfig(listing.category || "").homeBucket;
  return (
    <CompactListingCard
      listing={listing}
      priority={priority}
      categoryLabel={BUCKET_LABEL[bucket]}
    />
  );
}

export const DynamicListingCard = memo(DynamicListingCardImpl, (prev, next) => {
  const a = prev.listing;
  const b = next.listing;
  return (
    a.id === b.id &&
    a.price === b.price &&
    a.title === b.title &&
    a.images?.[0] === b.images?.[0] &&
    prev.priority === next.priority
  );
});

export default DynamicListingCard;
