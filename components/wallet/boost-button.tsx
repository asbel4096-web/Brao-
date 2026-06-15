"use client";

import { useState } from "react";
import { Rocket, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { BoostSheet } from "./boost-sheet";
import {
  isBoostedNow,
  isFeaturedNow,
  type ListingBoostFields,
} from "@/lib/wallet/boost";

/**
 * زر "تعزيز" قابل للإدراج بجانب أي إعلان.
 *
 * يظهر لمالك الإعلان فقط، عند:
 *  - الإعلان status == "approved"
 *  - flag wallet أو boosts مفعَّل
 *
 * شكل الزر يتغيّر حسب الحالة:
 *  - عادي: زر بنفسجي "تعزيز" مع 🚀
 *  - مُعزَّز/مميَّز حالياً: badge صغير "نشط"
 */

interface Props {
  listingId: string;
  listingTitle: string;
  listingOwnerId: string;
  listingStatus: string;
  listingBoostFields?: ListingBoostFields;
  variant?: "button" | "icon";
  className?: string;
}

export function BoostButton({
  listingId,
  listingTitle,
  listingOwnerId,
  listingStatus,
  listingBoostFields,
  variant = "button",
  className = "",
}: Props) {
  const { user } = useAuth();
  const walletEnabled = useFeatureFlag("wallet");
  const boostsEnabled = useFeatureFlag("boosts");
  const [open, setOpen] = useState(false);

  // الزر يظهر فقط للمالك على إعلان معتمد، عندما أي flag مفعَّل
  if (!user || user.uid !== listingOwnerId) return null;
  if (listingStatus !== "approved") return null;
  if (!walletEnabled && !boostsEnabled) return null;

  const isBoosted = listingBoostFields
    ? isBoostedNow(listingBoostFields)
    : false;
  const isFeatured = listingBoostFields
    ? isFeaturedNow(listingBoostFields)
    : false;
  const hasActive = isBoosted || isFeatured;

  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
          }}
          aria-label="تعزيز الإعلان"
          className={`
            grid h-9 w-9 place-items-center rounded-full
            text-white shadow-sm transition active:scale-95
            ${hasActive
              ? "bg-gradient-to-br from-amber-500 to-orange-600"
              : "bg-gradient-to-br from-purple-600 to-pink-600 hover:brightness-110"
            }
            ${className}
          `}
        >
          {isFeatured ? <Flame size={14} /> : <Rocket size={14} />}
        </button>
        <BoostSheet
          open={open}
          onClose={() => setOpen(false)}
          listingId={listingId}
          listingTitle={listingTitle}
          listingBoostFields={listingBoostFields}
        />
      </>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        whileTap={{ scale: 0.96 }}
        className={`
          inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
          text-[11px] font-black text-white shadow-sm transition
          hover:brightness-110
          ${hasActive
            ? "bg-gradient-to-br from-amber-500 to-orange-600"
            : "bg-gradient-to-br from-purple-600 to-pink-600"
          }
          ${className}
        `}
      >
        {isFeatured ? (
          <>
            <Flame size={11} />
            مميَّز نشط
          </>
        ) : isBoosted ? (
          <>
            <Rocket size={11} />
            Boost نشط
          </>
        ) : (
          <>
            <Rocket size={11} />
            تعزيز
          </>
        )}
      </motion.button>
      <BoostSheet
        open={open}
        onClose={() => setOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
        listingBoostFields={listingBoostFields}
      />
    </>
  );
}
