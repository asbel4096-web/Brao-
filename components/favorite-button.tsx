"use client";

import { Bookmark } from "lucide-react";
import { memo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFavoriteState } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  listing: Pick<Listing, "id" | "title" | "price" | "city" | "category" | "images">;
  className?: string;
  size?: number;
  variant?: "icon" | "button";
}

/**
 * FavoriteButton - أيقونة Bookmark (حفظ).
 * - بدون خلفية ولا حدود في variant=button (تصميم أيقوني نظيف).
 * - liked: أزرق brand + ممتلئ.
 * - hover: brand.
 */
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

      if (!user) {
        toast.info("سجّل الدخول لحفظ الإعلانات في المفضلة.");
        router.push(`/login?redirect=/listings/${listing.id}`);
        return;
      }

      if (busy) return;
      setBusy(true);
      try {
        await toggle(listing);
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
        aria-label={liked ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        className={cn(
          "group inline-flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
          liked
            ? "text-brand-700 dark:text-brand-300"
            : "text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300",
          className
        )}
      >
        <Bookmark
          size={size + 2}
          className={cn("transition-transform", liked && "fill-current")}
        />
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
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed",
        liked
          ? "border-brand-300 bg-brand-700/95 text-white shadow-blue"
          : "border-white/30 bg-black/40 text-white hover:bg-black/60",
        className
      )}
    >
      <Bookmark size={size + 2} className={liked ? "fill-current" : ""} />
    </button>
  );
}

export const FavoriteButton = memo(FavoriteButtonImpl);
