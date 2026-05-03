"use client";

import { Heart } from "lucide-react";
import { memo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFavoriteState } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { Listing } from "@/lib/types";

interface Props {
  listing: Pick<Listing, "id" | "title" | "price" | "city" | "category" | "images">;
  className?: string;
  size?: number;
  variant?: "icon" | "button";
}

function FavoriteButtonImpl({
  listing,
  className = "",
  size = 18,
  variant = "icon",
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { isFav: liked, toggle } = useFavoriteState(listing.id);
  const [busy, setBusy] = useState(false);

  const handle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // غير مسجّل دخول → toast + إعادة توجيه
      if (!user) {
        toast.info("سجّل الدخول لحفظ الإعلانات في المفضلة.");
        router.push(`/login?redirect=/listings/${listing.id}`);
        return;
      }

      if (busy) return;
      setBusy(true);
      try {
        await toggle(listing);
        // tactile feedback: toast صغير عند النجاح
        if (liked) {
          toast.info("تمت الإزالة من المفضلة.");
        } else {
          toast.success("تمت الإضافة إلى المفضلة.");
        }
      } catch (err: any) {
        toast.error(err?.message || "تعذّر تحديث المفضلة.");
      } finally {
        setBusy(false);
      }
    },
    [user, busy, toggle, listing, router, toast, liked]
  );

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        aria-pressed={liked}
        className={`
          inline-flex items-center justify-center gap-2
          rounded-2xl border-2 px-4 py-3 text-sm font-bold
          transition-all duration-200
          disabled:opacity-60 disabled:cursor-not-allowed
          ${
            liked
              ? "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
              : "border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-rose-950/30"
          }
          ${className}
        `}
      >
        <Heart
          size={size}
          className={liked ? "fill-rose-500 text-rose-500" : ""}
        />
        <span>{liked ? "في المفضلة" : "أضف للمفضلة"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      className={`
        inline-flex h-11 w-11 items-center justify-center
        rounded-full border backdrop-blur-md
        transition-all duration-200
        disabled:opacity-60 disabled:cursor-not-allowed
        ${
          liked
            ? "border-rose-400/60 bg-rose-500/90 text-white shadow-lg shadow-rose-500/30 scale-105"
            : "border-white/30 bg-black/40 text-white hover:bg-black/60"
        }
        ${className}
      `}
    >
      <Heart size={size + 2} className={liked ? "fill-white" : ""} />
    </button>
  );
}

export const FavoriteButton = memo(FavoriteButtonImpl, (prev, next) => {
  return (
    prev.listing.id === next.listing.id &&
    prev.variant === next.variant &&
    prev.className === next.className &&
    prev.size === next.size
  );
});
