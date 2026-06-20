"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Flame, Eye } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import {
  fridayCategoryEmoji,
  fridayCategoryLabel,
  type FridayMarketItem,
} from "@/lib/friday-market/types";

interface Props {
  item: FridayMarketItem;
  /** أساس الرابط (للأرشيف يختلف). افتراضي /friday-market. */
  hrefBase?: string;
  /** إظهار شارة 🔥 عرض الجمعة. */
  showBadge?: boolean;
}

export function MarketItemCard({
  item,
  hrefBase = "/friday-market",
  showBadge = true,
}: Props) {
  const img = item.images?.[0] || "";

  return (
    <Link href={`${hrefBase}/${item.id}`} prefetch={false}>
      <motion.article
        whileTap={{ scale: 0.97 }}
        className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
      >
        {/* الصورة */}
        <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl">
              {fridayCategoryEmoji(item.category)}
            </div>
          )}

          {showBadge && (
            <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-l from-orange-500 to-red-600 px-2 py-0.5 text-[10px] font-black text-white shadow">
              <Flame size={11} strokeWidth={2.6} /> عرض الجمعة
            </span>
          )}

          {item.featured && (
            <span className="absolute left-2 top-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-amber-950 shadow">
              ⭐ مميّز
            </span>
          )}
        </div>

        {/* التفاصيل */}
        <div className="p-2.5">
          <p className="text-[15px] font-black text-action-600 tabular-nums dark:text-action-400">
            {formatPrice(item.price)}
          </p>
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.4em] text-[13px] font-bold leading-tight text-slate-800 dark:text-slate-100">
            {item.title}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
            <span>
              {fridayCategoryLabel(item.category)}
              {item.city ? ` · ${item.city}` : ""}
            </span>
            {(item.views || 0) > 0 && (
              <span className="inline-flex items-center gap-0.5 text-slate-400">
                · <Eye size={11} /> {item.views}
              </span>
            )}
          </p>
        </div>
      </motion.article>
    </Link>
  );
}
