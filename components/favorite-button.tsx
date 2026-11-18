"use client";

import { Heart } from "lucide-react";
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
 * FavoriteButton — Bratsho DS 1.0: قلب في كل مكان (كان Bookmark على البطاقات وقلباً في الشريط).
 * - variant=icon (فوق الصور): دائرة بيضاء 36px داخل منطقة لمس 44px.
 * - variant=button: أيقونة بلا خلفية (صفحة التفاصيل).
 * - liked: وردي (rose-600) ممتلئ — نفس التطبيق.
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
          "group inline-flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-200 active:scale-95",
          liked
            ? "text-rose-600 dark:text-rose-400"
            : "text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400",
          className
        )}
      >
        <Heart
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
        "grid h-11 w-11 place-items-center transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
    >
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-full bg-white/90 shadow-sm transition-colors",
          liked ? "text-rose-600" : "text-slate-900 hover:text-rose-600"
        )}
      >
        <Heart size={size} className={liked ? "fill-current" : ""} />
      </span>
    </button>
  );
}

export const FavoriteButton = memo(FavoriteButtonImpl);
