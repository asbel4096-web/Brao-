"use client";

import { useEffect, useRef } from "react";
import { Loader2, SearchX } from "lucide-react";
import { MarketItemCard } from "./market-item-card";
import type { FridayMarketItem } from "@/lib/friday-market/types";

interface Props {
  items: FridayMarketItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  hrefBase?: string;
  emptyHint?: string;
}

export function MarketGrid({
  items,
  loading,
  loadingMore,
  hasMore,
  onLoadMore,
  hrefBase = "/friday-market",
  emptyHint = "لا توجد إعلانات بعد",
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Infinite scroll عبر IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [onLoadMore]);

  if (loading && items.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div className="aspect-square w-full animate-pulse bg-slate-100 dark:bg-slate-800" />
            <div className="space-y-2 p-2.5">
              <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
        <SearchX size={34} className="text-slate-300" />
        <p className="mt-3 text-sm font-bold text-slate-500">{emptyHint}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <MarketItemCard key={item.id} item={item} hrefBase={hrefBase} />
        ))}
      </div>

      {/* خطّاف التحميل اللانهائي */}
      <div ref={sentinelRef} className="h-10" />

      {loadingMore && (
        <div className="flex justify-center py-4">
          <Loader2 size={22} className="animate-spin text-action-500" />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="py-4 text-center text-xs font-semibold text-slate-400">
          — وصلت إلى نهاية القائمة —
        </p>
      )}
    </>
  );
}
