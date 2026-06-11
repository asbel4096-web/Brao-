"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { Bookmark, ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { CompactListingCard } from "./compact-listing-card";

/**
 * "الأكثر حفظاً" — صف أفقي يعرض الإعلانات الأكثر حفظاً من المستخدمين.
 *
 * لتجنّب الحاجة لفهرس مركّب جديد في Firestore (status + orderBy favoritesCount)،
 * نجلب دفعة من أحدث الإعلانات المعتمدة (بفهرس createdAt الموجود) ثم نُرتّب
 * client-side حسب عدد الحفظ ثم المشاهدات. دقيق بما يكفي للصفحة الرئيسية،
 * وبدون أي تعديل على فهارس/قواعد Firestore.
 *
 * - cache في sessionStorage (3 دقائق).
 * - يبدأ بحالة فارغة ثابتة ثم يقرأ الـcache داخل useEffect (تفادي hydration).
 * - يُخفي نفسه إن لم توجد إعلانات بها حفظ فعلي.
 */

const CACHE_KEY = "bratsho:most-saved:v1";
const CACHE_TTL_MS = 3 * 60 * 1000;
const FETCH_LIMIT = 24;
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

export function MostSavedSection() {
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
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc"),
            limit(FETCH_LIMIT)
          )
        );
        if (cancelled) return;
        const list: Listing[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
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
        console.warn("[most-saved] fetch failed:", (err as any)?.code);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const scored = items
      .filter((l) => l.category !== "ساحبة سيارات")
      .map((l) => ({
        l,
        saves: (l as any).favoritesCount || 0,
        views: (l as any).views || 0,
      }))
      // نعرض فقط ما له حفظ أو مشاهدات فعلية (وإلا القسم بلا معنى)
      .filter((x) => x.saves > 0 || x.views > 0)
      .sort((a, b) => {
        if (b.saves !== a.saves) return b.saves - a.saves;
        return b.views - a.views;
      });
    return scored.slice(0, MAX).map((x) => x.l);
  }, [items]);

  if (loading || visible.length === 0) return null;

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="inline-flex items-center gap-1.5 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            <Bookmark size={17} className="text-brand-700 dark:text-brand-300" />
            الأكثر حفظاً
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
          <CompactListingCard
            key={it.id}
            listing={it}
            showStats
            priority={idx < 2}
          />
        ))}
      </div>
    </section>
  );
}
