"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { Clock, ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { getRecentlyViewed } from "@/lib/recently-viewed";
import { CompactListingCard } from "./compact-listing-card";

/**
 * "شاهدت مؤخراً" — صف أفقي للإعلانات التي زارها المستخدم (من localStorage).
 * يختفي تماماً إن لم توجد مشاهدات سابقة. يجلب كل إعلان بمعرّفه ويُبقي المعتمد
 * المتاح فقط (يتخطّى المحذوف/غير المعتمد بصمت).
 */
export function RecentlyViewedSection() {
  const [items, setItems] = useState<Listing[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const ids = getRecentlyViewed();
    if (ids.length === 0) {
      setItems([]);
      return;
    }
    void (async () => {
      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const snap = await getDoc(doc(db, "listings", id));
            if (!snap.exists()) return null;
            const data = { id: snap.id, ...(snap.data() as any) } as Listing;
            if ((data as any).status !== "approved") return null;
            return data;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setItems(results.filter(Boolean) as Listing[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // لا نعرض القسم إن لم تكتمل بعد، أو لا توجد نتائج.
  if (!items || items.length === 0) return null;

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="inline-flex items-center gap-1.5 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            <Clock size={18} className="text-brand-600 dark:text-brand-300" />
            شاهدت مؤخراً
          </h2>
          <Link
            href="/listings"
            className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
          >
            تصفّح المزيد
            <ChevronLeft size={14} />
          </Link>
        </div>
      </div>

      <div
        className="flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar sm:px-6"
        style={{ scrollbarWidth: "none" }}
      >
        {items.map((it, idx) => (
          <CompactListingCard key={it.id} listing={it} priority={idx < 2} />
        ))}
      </div>
    </section>
  );
}
