"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/contexts/AuthContext";
import type { Listing } from "@/lib/types";

interface Props {
  listing: Pick<Listing, "id" | "title" | "price" | "city" | "category" | "images">;
  className?: string;
  size?: number;
  variant?: "icon" | "button";
}

export function FavoriteButton({
  listing, className = "", size = 18, variant = "icon",
}: Props) {
  const { user } = useAuth();
  const router = useRouter();
  const { isFavorited, toggle } = useFavorites();
  const [busy, setBusy] = useState(false);
  const liked = isFavorited(listing.id);

  const handle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login?redirect=" + encodeURIComponent(window.location.pathname));
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      await toggle(listing);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("toggle favorite", err);
    } finally {
      setBusy(false);
    }
  };

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`btn-secondary ${liked ? "!border-rose-300 !text-rose-600" : ""} ${className}`}
      >
        <Heart size={size} fill={liked ? "currentColor" : "none"} />
        {liked ? "في المفضلة" : "أضف للمفضلة"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      aria-label={liked ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur transition hover:scale-110 ${
        liked ? "text-rose-600" : "text-slate-700"
      } ${className}`}
    >
      <Heart size={size} fill={liked ? "currentColor" : "none"} />
    </button>
  );
}
