"use client";

import { Flame } from "lucide-react";
import { isFeaturedNow, type ListingBoostFields } from "@/lib/wallet/boost";

/**
 * شارة "مميَّز" لبطاقات الإعلانات.
 *
 * تصميم هادئ (متناسب مع طلب المستخدمة):
 *  - حد دني للترويج (لا ألوان صارخة)
 *  - badge صغير بأيقونة + كلمة
 *  - يستخدم gradient amber/orange متناسق مع باقي العلامات
 *
 * يخفي نفسه تلقائياً لو الإعلان غير مميَّز أو انتهت المدة.
 */
export function FeaturedBadge({
  listing,
  size = "sm",
  className = "",
}: {
  listing: ListingBoostFields;
  size?: "sm" | "md";
  className?: string;
}) {
  if (!isFeaturedNow(listing)) return null;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full
        bg-gradient-to-r from-amber-500 to-orange-500
        font-black text-white shadow-sm
        ${size === "sm"
          ? "px-1.5 py-0.5 text-[9px]"
          : "px-2 py-1 text-[11px]"
        }
        ${className}
      `}
      aria-label="إعلان مميَّز"
    >
      <Flame size={size === "sm" ? 9 : 11} />
      مميَّز
    </span>
  );
}
