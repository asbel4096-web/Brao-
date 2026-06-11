"use client";

import { ReactNode } from "react";
import { useIsListingOwner } from "@/hooks/useIsListingOwner";

interface Props {
  /** ownerId للإعلان أو الخدمة */
  ownerId?: string | null;
  /** المحتوى يُعرض فقط لمالك الإعلان */
  children: ReactNode;
  /** بديل اختياري لغير المالك (مثلاً: skeleton، محتوى عام، أو null) */
  fallback?: ReactNode;
}

/**
 * يعرض `children` فقط إذا كان المستخدم الحالي هو مالك الإعلان.
 * لباقي المستخدمين، يعرض `fallback` (أو لا شيء).
 *
 * مثال:
 *   <OwnerOnly ownerId={listing.ownerId}>
 *     <span>👁 {listing.views} مشاهدة</span>
 *   </OwnerOnly>
 *
 * مع fallback:
 *   <OwnerOnly ownerId={listing.ownerId} fallback={<PublicBadge />}>
 *     <PrivateStatsBar listingId={listing.id} />
 *   </OwnerOnly>
 */
export function OwnerOnly({ ownerId, children, fallback = null }: Props) {
  const isOwner = useIsListingOwner(ownerId);
  return <>{isOwner ? children : fallback}</>;
}
