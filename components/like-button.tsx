"use client";

import { Heart } from "lucide-react";
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
  /** يخفي الرقم عندما يكون صفر */
  showZero?: boolean;
}

/**
 * زر إعجاب بإحساس تفاعلي حديث:
 * - حالة افتراضية → مساحة لمس واضحة + قلب مفرغ.
 * - عند الضغط → نبض خفيف (active:scale-95).
 * - عند الإعجاب → قلب أحمر ممتلئ + خلفية وردية ناعمة + رقم بلون وردي.
 *
 * يحافظ على الهوية: حدود slate كباقي الأزرار، لون brand فقط عند hover.
 */
export function LikeButton({
  listing,
  count = 0,
  variant = "button",
  className,
  showZero = false,
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

    // bump animation: pop خفيف على القلب عند النقر
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

  const showCount = count > 0 || showZero;

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
            ? "border-rose-400/70 bg-rose-500/95 text-white shadow-lg shadow-rose-500/30"
            : "border-white/30 bg-black/40 text-white hover:bg-black/60",
          className,
        )}
      >
        <Heart
          size={18}
          className={cn(
            "transition-transform",
            isLiked && "fill-current",
            bump && "scale-125",
          )}
        />
      </button>
    );
  }

  // variant = button (داخل شريط التفاعل)
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isLiked}
      aria-label={isLiked ? "إلغاء الإعجاب" : "إعجاب"}
      disabled={busy}
      className={cn(
        // قاعدة: مساحة لمس مريحة، حدود ناعمة، نص bold
        "group inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[0.97]",
        // الحالة الافتراضية
        !isLiked &&
          "border border-slate-200 bg-white text-slate-700 hover:border-rose-300 hover:bg-rose-50/60 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-rose-700 dark:hover:bg-rose-950/30 dark:hover:text-rose-300",
        // الحالة المعجَب بها
        isLiked &&
          "border border-rose-300 bg-rose-50 text-rose-700 shadow-sm dark:border-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        className,
      )}
    >
      <Heart
        size={16}
        className={cn(
          "shrink-0 transition-transform duration-200",
          isLiked
            ? "fill-current text-rose-600 dark:text-rose-400"
            : "text-slate-500 group-hover:text-rose-500 dark:text-slate-400",
          bump && "scale-125",
        )}
      />
      <span className="truncate">
        {showCount ? count.toLocaleString("ar-LY") : "إعجاب"}
      </span>
    </button>
  );
}
