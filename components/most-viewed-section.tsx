"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ChevronLeft, Eye } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { CompactListingCard } from "./compact-listing-card";

/**
 * السيارات الأكثر مشاهدة.
 *
 * - يستعلم status=="approved" (مطلوب من قواعد الأمان) + orderBy(views desc).
 * - يستبعد خدمات الساحبات.
 * - يختفي تماماً لو لا توجد بيانات (return null).
 * - Skeleton أثناء التحميل، كاش جلسة قصير لتقليل القراءات.
 */

const MAX = 10;
const CACHE_KEY = "bratsho:most-viewed:v1";
const CACHE_TTL_MS = 5 * 60 * 1000;

function readCache(): Listing[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.list as Listing[];
  } catch {
    return null;
  }
}

export function MostViewedSection() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = readCache();
    if (cached !== null) {
      setItems(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        // status=="approved" مطلوب من القواعد، + ترتيب تنازلي بالمشاهدات.
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("status", "==", "approved"),
            orderBy("views", "desc"),
            limit(20)
          )
        );
        if (cancelled) return;
        const list: Listing[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter(
            (l: Listing) =>
              l.category !== "ساحبة سيارات" && (l.views || 0) > 0
          )
          .slice(0, MAX);
        setItems(list);
        setLoading(false);
        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), list })
          );
        } catch {
          /* ignore */
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[most-viewed] fetch failed:", (err as any)?.code);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // إخفاء كامل لو لا بيانات
  if (loading) {
    return (
      <section className="py-4 sm:py-5">
        <div className="container">
          <div className="mb-3 h-6 w-40 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="flex gap-3 overflow-x-auto px-4 no-scrollbar sm:px-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-56 w-44 shrink-0 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-700"
            />
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="inline-flex items-center gap-1.5 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            <Eye size={18} className="text-brand-700 dark:text-brand-300" />
            السيارات الأكثر مشاهدة
          </h2>
          <Link
            href="/listings?sort=views"
            className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
          >
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>

      <div
        className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it, idx) => (
          <CompactListingCard
            key={it.id}
            listing={it}
            priority={idx < 2}
            showStats
          />
        ))}
      </div>
    </section>
  );
}
