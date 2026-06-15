"use client";

import { ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useListingLikeState } from "@/hooks/useListingEngagement";
import type { Listing } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LikeButtonProps {
  listing: Pick<Listing, "id" | "title" | "images" | "ownerId">;
  count?: number;
  variant?: "button" | "icon";
  className?: string;
}

/**
 * LikeButton - تصميم أيقوني نظيف بهوية براتشو:
 * - الرقم يظهر يمين الأيقونة (RTL).
 * - بدون خلفية - مجرد أيقونة + رقم.
 * - hover: brand لون.
 * - liked: brand-700 + ThumbsUp ممتلئ.
 * - bump عند النقر.
 */
export function LikeButton({
  listing,
  count = 0,
  variant = "button",
  className,
}: LikeButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { isLiked, toggle } = useListingLikeState(listing.id);
  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState(false);

  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      toast.info("سجّل الدخول أولاً للتفاعل مع الإعلانات.");
      router.push(`/login?redirect=/listings/${listing.id}`);
      return;
    }

    if (busy) return;
    setBusy(true);
    setBump(true);
    setTimeout(() => setBump(false), 280);

    try {
      await toggle(listing);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ الإعجاب.");
    } finally {
      setBusy(false);
    }
  };

  const showCount = count > 0;

  /* ----------------------------------------------------------
   * variant: icon - فقاعة دائرية فوق صورة الإعلان
   * ---------------------------------------------------------- */
  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isLiked}
        aria-label={isLiked ? "إلغاء الإعجاب" : "إعجاب"}
        disabled={busy}
        className={cn(
          "inline-flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur transition-all duration-200 active:scale-95",
          isLiked
            ? "border-brand-300 bg-brand-700/95 text-white shadow-blue"
            : "border-white/30 bg-black/40 text-white hover:bg-black/60",
          className
        )}
      >
        <ThumbsUp
          size={18}
          className={cn(
            "transition-transform",
            isLiked && "fill-current",
            bump && "scale-125"
          )}
        />
      </button>
    );
  }

  /* ----------------------------------------------------------
   * variant: button - أيقونة + رقم بجانبها (نظيف)
   * ---------------------------------------------------------- */
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isLiked}
      aria-label={isLiked ? "إلغاء الإعجاب" : "إعجاب"}
      disabled={busy}
      className={cn(
        "group inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-bold transition-all duration-200 active:scale-95",
        isLiked
          ? "text-brand-700 dark:text-brand-300"
          : "text-slate-600 hover:text-brand-700 dark:text-slate-300 dark:hover:text-brand-300",
        className
      )}
    >
      {showCount && (
        <span className="tabular-nums">{count.toLocaleString("ar-LY")}</span>
      )}
      <ThumbsUp
        size={18}
        className={cn(
          "shrink-0 transition-transform duration-200",
          isLiked && "fill-current",
          bump && "scale-125"
        )}
      />
    </button>
  );
}
