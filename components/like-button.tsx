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
}

export function LikeButton({ listing, count = 0, variant = "button", className }: LikeButtonProps) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const { isLiked, toggle } = useListingLikeState(listing.id);
  const [busy, setBusy] = useState(false);

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
    try {
      await toggle(listing);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تنفيذ الإعجاب.");
    } finally {
      setBusy(false);
    }
  };

  const classes =
    variant === "icon"
      ? "inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/40 text-white backdrop-blur transition hover:bg-black/60"
      : "inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isLiked}
      disabled={busy}
      className={cn(
        classes,
        isLiked &&
          (variant === "icon"
            ? "border-rose-400/60 bg-rose-500/90 text-white"
            : "border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"),
        className
      )}
    >
      <Heart size={16} className={isLiked ? "fill-current" : ""} />
      {variant === "button" ? <span>{count > 0 ? count : "إعجاب"}</span> : null}
    </button>
  );
}
