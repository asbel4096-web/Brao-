"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
  documentId,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { ChevronLeft, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { isListingFeatured } from "@/lib/utils";
import { ListingCard } from "./listing-card";

/**
 * قسم الإعلانات المميزة في الصفحة الرئيسية.
 *
 * وضعَان:
 *  1. **manualIds (موصى)**: الأدمن يختار IDs من /admin/content/homepage.
 *     نجلب فقط الإعلانات المحدّدة (limit به Firestore حتى 30 ID per `in`).
 *     الترتيب يتبع ترتيب الـIDs (الأول من الأدمن = الأول هنا).
 *
 *  2. **auto (الفولباك)**: لو manualIds غير مُمرَّر أو فارغ، نستخدم
 *     المنطق القديم: featured=true + featuredUntil لم ينتهِ.
 *
 * - cache في sessionStorage لمدة دقيقتين.
 * - لو لا توجد مميزة → القسم مخفي كلياً.
 */

const CACHE_KEY = "bratsho:featured-listings:v1";
const CACHE_TTL_MS = 2 * 60 * 1000;
const MAX_FEATURED = 8;

interface CacheShape {
  ts: number;
  // نخزّن العنصر بدون Timestamps (لأنها مش serializable مباشرة).
  // لكن featuredUntil يأتي كـTimestamp - نحوّله لـms عند الحفظ/التحميل.
  list: Array<Omit<Listing, "featuredUntil" | "featuredAt" | "createdAt"> & {
    featuredUntilMs?: number;
    featuredAtMs?: number;
    createdAtMs?: number;
  }>;
}

function tsToMs(ts: any): number | undefined {
  if (!ts) return undefined;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  try {
    return new Date(ts).getTime();
  } catch {
    return undefined;
  }
}

function msToTs(ms?: number): Timestamp | null {
  if (ms == null || !Number.isFinite(ms)) return null;
  try {
    return Timestamp.fromMillis(ms);
  } catch {
    return null;
  }
}

function serializeForCache(list: Listing[]): CacheShape["list"] {
  return list.map((l) => ({
    ...l,
    featuredUntil: undefined,
    featuredAt: undefined,
    createdAt: undefined,
    featuredUntilMs: tsToMs(l.featuredUntil),
    featuredAtMs: tsToMs(l.featuredAt),
    createdAtMs: tsToMs(l.createdAt),
  })) as any;
}

function deserializeFromCache(arr: CacheShape["list"]): Listing[] {
  return arr.map((l) => {
    const { featuredUntilMs, featuredAtMs, createdAtMs, ...rest } = l;
    return {
      ...rest,
      featuredUntil: msToTs(featuredUntilMs),
      featuredAt: msToTs(featuredAtMs),
      createdAt: msToTs(createdAtMs),
    } as Listing;
  });
}

function readCache(): Listing[] | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return Array.isArray(parsed.list) ? deserializeFromCache(parsed.list) : null;
  } catch {
    return null;
  }
}

function writeCache(list: Listing[]) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), list: serializeForCache(list) })
    );
  } catch {
    /* تجاهل */
  }
}

export function FeaturedListingsSection({
  manualIds,
}: {
  /** قائمة IDs مُختارة يدوياً من /admin/content/homepage.
   *  إن مُرّرت وتحوي عناصر، نستخدمها بدل المنطق التلقائي. */
  manualIds?: string[];
} = {}) {
  // Manual mode → key مختلف للـcache (لا نخلط بين الوضعين)
  const useManual = Array.isArray(manualIds) && manualIds.length > 0;
  const cacheKey = useManual ? `${CACHE_KEY}:manual:${manualIds.join(",")}` : CACHE_KEY;

  const readManualCache = (): Listing[] | null => {
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheShape;
      if (!parsed || Date.now() - parsed.ts > CACHE_TTL_MS) return null;
      return Array.isArray(parsed.list)
        ? deserializeFromCache(parsed.list)
        : null;
    } catch {
      return null;
    }
  };

  const [items, setItems] = useState<Listing[]>(() => {
    if (typeof window === "undefined") return [];
    return (useManual ? readManualCache() : readCache()) || [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return (useManual ? readManualCache() : readCache()) === null;
  });

  useEffect(() => {
    const cached = useManual ? readManualCache() : readCache();
    if (cached !== null) {
      setItems(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        let list: Listing[] = [];

        if (useManual) {
          // وضع الاختيار اليدوي: نجلب فقط الـIDs المحدّدة.
          // Firestore يدعم where(documentId(), "in", [...]) بحد 30 ID.
          // لو الأدمن وضع أكثر، نقصّ على 30 (نادر).
          const ids = manualIds!.slice(0, 30);
          const chunks: string[][] = [];
          for (let i = 0; i < ids.length; i += 30) {
            chunks.push(ids.slice(i, i + 30));
          }
          const results = await Promise.all(
            chunks.map((chunk) =>
              getDocs(
                query(
                  collection(db, "listings"),
                  where(documentId(), "in", chunk)
                )
              )
            )
          );
          if (cancelled) return;

          const docMap = new Map<string, Listing>();
          for (const snap of results) {
            for (const d of snap.docs) {
              docMap.set(d.id, { id: d.id, ...(d.data() as any) });
            }
          }
          // الترتيب يتبع manualIds (الأدمن قرّره)
          list = ids
            .map((id) => docMap.get(id))
            .filter((x): x is Listing => Boolean(x))
            // نُسقط الإعلانات المؤرشفة/المرفوضة
            .filter((l) => {
              const status = (l as any).status;
              return !status || status === "approved";
            });
        } else {
          // الوضع التلقائي القديم
          const snap = await getDocs(
            query(
              collection(db, "listings"),
              where("featured", "==", true),
              limit(50)
            )
          );
          if (cancelled) return;
          list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
        }

        setItems(list);
        setLoading(false);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ ts: Date.now(), list: serializeForCache(list) })
          );
        } catch {
          /* ignore */
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[featured-listings] fetch failed:", (err as any)?.code);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useManual, useManual ? manualIds?.join(",") : null]);

  // فلترة المنتهي client-side + ترتيب حسب آخر تمييز + قص للحدّ الأقصى.
  // الساحبات مستبعدة - لها صفحتها المخصّصة /tow-trucks.
  //
  // في الوضع اليدوي: لا نفلتر بـisListingFeatured (الأدمن قرّر الاختيار،
  // نحترم قراره حتى لو الإعلان لا يحمل featured=true). لكن نحافظ على
  // استبعاد الساحبات لأنها قسم مستقل.
  const visible = useMemo(() => {
    let active: Listing[];
    if (useManual) {
      active = items.filter((l) => l.category !== "ساحبة سيارات");
    } else {
      active = items.filter(
        (l) => isListingFeatured(l) && l.category !== "ساحبة سيارات"
      );
      active.sort((a, b) => {
        const ta = tsToMs(a.featuredAt) || 0;
        const tb = tsToMs(b.featuredAt) || 0;
        return tb - ta; // الأحدث تمييزاً أولاً
      });
    }
    return active.slice(0, MAX_FEATURED);
  }, [items, useManual]);

  // إخفاء القسم كلياً عند عدم وجود مميزة فعلية.
  if (loading) {
    return (
      <section className="container py-6">
        <div className="mb-3 h-6 w-44 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(2)].map((_, i) => (
            <div
              key={i}
              className="
                overflow-hidden rounded-3xl border border-slate-200/70
                bg-white shadow-card dark:border-slate-700/70 dark:bg-slate-900
              "
            >
              <div className="skeleton aspect-[4/3] !rounded-none" />
              <div className="space-y-2 p-3">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (visible.length === 0) return null;

  return (
    <section className="container py-6 sm:py-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 className="inline-flex items-center gap-2 text-base font-black text-slate-900 dark:text-white sm:text-lg">
            <Sparkles
              size={18}
              className="text-action-500"
              aria-hidden="true"
            />
            إعلانات مميزة
          </h2>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
            إعلانات راجعها فريق براتشو وأبرزها لك.
          </p>
        </div>
        <Link
          href="/listings"
          className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-600 dark:text-brand-300 dark:hover:text-brand-200"
        >
          عرض الكل
          <ChevronLeft size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((it, idx) => (
          <ListingCard key={it.id} listing={it} priority={idx < 2} />
        ))}
      </div>
    </section>
  );
}
