"use client";

import { ChevronLeft, ImageOff, Play } from "lucide-react";
import { formatPrice, timeAgo } from "@/lib/utils";
import type { ContentItem } from "@/lib/moderation/content";
import { PaidBadge, StatusBadge, TypeBadge } from "./content-badges";

/** صف محتوى: صورة مصغّرة، العنوان/النص، صاحب المحتوى، الحالة، الترويج، التاريخ. */
export function ContentRow({
  item,
  showType,
  onOpen,
}: {
  item: ContentItem;
  showType?: boolean;
  onOpen: (item: ContentItem) => void;
}) {
  const mod = item.moderation;
  const price = item.price ?? item.budget;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="group flex w-full items-start gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-right transition hover:border-brand-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
    >
      <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-800">
        {item.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
            <ImageOff size={20} />
          </span>
        )}
        {item.videoUrl && (
          <span className="absolute bottom-1 left-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white">
            <Play size={10} />
          </span>
        )}
      </span>

      <span className="block min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          {showType && <TypeBadge type={item.type} />}
          <StatusBadge item={item} />
          <PaidBadge item={item} />
        </span>
        <span className="mt-1 line-clamp-1 block text-sm font-black text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
          {item.title}
        </span>
        {item.type === "post" && item.text && item.text !== item.title && (
          <span className="line-clamp-1 block text-[12px] text-slate-500 dark:text-slate-400">{item.text}</span>
        )}
        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
          {item.ownerName || "—"}
          {" · "}
          {item.createdAtMs ? timeAgo(item.createdAtMs) : "—"}
          {item.city ? ` · ${item.city}` : ""}
          {item.type !== "story" && price !== null && price > 0 ? ` · ${formatPrice(price)}` : ""}
        </span>
        {mod?.state && (
          <span
            className={`mt-1 line-clamp-1 block text-[11px] font-bold ${
              mod.state === "removed" ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"
            }`}
          >
            السبب: {mod.reason || "—"}
            {mod.note ? ` — ${mod.note}` : ""}
          </span>
        )}
      </span>

      <ChevronLeft size={16} className="mt-6 shrink-0 text-slate-300 transition group-hover:text-brand-500 dark:text-slate-600" />
    </button>
  );
}
