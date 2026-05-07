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
  /** يُعرض داخل الزر دائماً (حتى لو 0). إذا لم يُمرَّر، يُعرض "إعجاب" بدلاً منه */
  count?: number;
  /** أظهر العدد دائماً حتى لو 0 (الافتراضي: نعم في variant button) */
  showCountAlways?: boolean;
  variant?: "button" | "icon";
  className?: string;
}

/**
 * زر إعجاب بإحساس Facebook لكن بهوية براتشو:
 * - أيقونة 👍 ThumbsUp (لا قلب).
 * - الحالة الافتراضية: حدود slate ناعمة + نص رمادي.
 * - عند hover: لون brand خفيف (الأزرق الداكن للعلامة).
 * - عند الإعجاب: brand-700 ممتلئ + أيقونة بيضاء + ظل أزرق.
 * - bump animation عند النقر (pop + scale).
 * - active:scale للإحساس بالضغط.
 */
export function LikeButton({
  listing,
  count = 0,
  showCountAlways = true,
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
      // Optimistic - الـ toggle يحدّث الكاش والعدّاد فوراً
      await toggle(listing);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ الإعجاب.");
    } finally {
      setBusy(false);
    }
  };

  const displayedCount = count.toLocaleString("ar-LY");
  const showLabel = !showCountAlways && count === 0;

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
   * variant: button - داخل شريط التفاعل
   * ---------------------------------------------------------- */
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isLiked}
      aria-label={isLiked ? "إلغاء الإعجاب" : "إعجاب"}
      disabled={busy}
      className={cn(
        "group inline-flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-sm font-bold transition-all duration-200 active:scale-[0.97]",
        // الحالة الافتراضية - slate ناعم
        !isLiked &&
          "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 dark:hover:text-brand-300",
        // الحالة المعجَب بها - brand هوية براتشو
        isLiked &&
          "border border-brand-700 bg-brand-700 text-white shadow-blue dark:border-brand-500 dark:bg-brand-700",
        className
      )}
    >
      <ThumbsUp
        size={16}
        className={cn(
          "shrink-0 transition-transform duration-200",
          isLiked
            ? "fill-current text-white"
            : "text-slate-500 group-hover:text-brand-600 dark:text-slate-400 dark:group-hover:text-brand-300",
          bump && "scale-125"
        )}
      />
      <span className="truncate tabular-nums">
        {showLabel ? "إعجاب" : displayedCount}
      </span>
    </button>
  );
}
