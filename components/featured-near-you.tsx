"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { ChevronLeft, MapPin } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { isListingFeatured } from "@/lib/utils";
import { CompactListingCard } from "./compact-listing-card";

/**
 * "سيارات مميزة قريبة منك" — صف أفقي من البطاقات المضغوطة.
 *
 * - يجلب الإعلانات featured=true ثم يفلتر المنتهية client-side.
 * - يستبعد الساحبات (لها صفحتها الخاصة).
 * - cache في sessionStorage (دقيقتان) لخفّة العودة للرئيسية.
 * - يبدأ بحالة فارغة ثابتة (سيرفر+عميل) ثم يقرأ الـcache داخل useEffect
 *   تفادياً لأخطاء الـhydration (#310/#418).
 * - يُخفي نفسه كلياً عند عدم وجود مميزة.
 */

const CACHE_KEY = "bratsho:featured-nearyou:v1";
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX = 10;

function readCache(): Listing[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts: number; list: Listing[] };
    if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return Array.isArray(parsed.list) ? parsed.list : null;
  } catch {
    return null;
  }
}

export function FeaturedNearYou() {
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
        // نقرأ الإعلانات المميّزة عبر حقلين محتملين (featured و isFeatured)
        // لأن Firestore لا يدعم OR على حقلين مختلفين في استعلام واحد بسهولة.
        // نُشغّل الاستعلامين بالتوازي ثم ندمج (مع إزالة التكرار).
        const [snapA, snapB] = await Promise.all([
          getDocs(
            query(
              collection(db, "listings"),
              where("featured", "==", true),
              limit(50)
            )
          ),
          getDocs(
            query(
              collection(db, "listings"),
              where("isFeatured", "==", true),
              limit(50)
            )
          ).catch(() => null),
        ]);
        if (cancelled) return;

        const byId = new Map<string, Listing>();
        snapA.docs.forEach((d) =>
          byId.set(d.id, { id: d.id, ...(d.data() as any) })
        );
        if (snapB) {
          snapB.docs.forEach((d) =>
            byId.set(d.id, { id: d.id, ...(d.data() as any) })
          );
        }
        const list: Listing[] = Array.from(byId.values());
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
        console.warn("[featured-nearyou] fetch failed:", (err as any)?.code);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    return items
      .filter((l) => isListingFeatured(l) && l.category !== "ساحبة سيارات")
      .slice(0, MAX);
  }, [items]);

  if (loading || visible.length === 0) return null;

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="inline-flex items-center gap-1.5 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            <MapPin size={18} className="text-action-500" />
            سيارات مميزة قريبة منك
          </h2>
          <Link
            href="/listings"
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
        {visible.map((it, idx) => (
          <CompactListingCard key={it.id} listing={it} priority={idx < 2} />
        ))}
      </div>
    </section>
  );
}
