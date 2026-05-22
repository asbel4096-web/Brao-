"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Timestamp,
  collection,
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
 * - يجلب فقط الإعلانات المميزة (featured=true) - استعلام رخيص.
 * - يفلتر client-side بـisListingFeatured للتأكد من عدم انتهاء الـfeaturedUntil.
 * - cache في sessionStorage لمدة دقيقتين.
 * - لو لا توجد مميزة → القسم مخفي كلياً (لا فراغ بصري).
 * - الإعلانات المميزة تظهر هنا + أيضاً ضمن "أحدث الإعلانات" (نمط OpenSooq/dubizzle).
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

export function FeaturedListingsSection() {
  const [items, setItems] = useState<Listing[]>(() => {
    if (typeof window === "undefined") return [];
    return readCache() || [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window === "undefined") return true;
    return readCache() === null;
  });

  useEffect(() => {
    // لو cache صالح، تخطّى الجلب.
    if (readCache() !== null) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        // استعلام بسيط بحقل واحد - لا يحتاج فهرس مركّب.
        // الترتيب client-side حسب featuredAt لاحقاً.
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("featured", "==", true),
            limit(50)
          )
        );
        if (cancelled) return;

        const list: Listing[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        setItems(list);
        setLoading(false);
        writeCache(list);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // فلترة المنتهي client-side + ترتيب حسب آخر تمييز + قص للحدّ الأقصى.
  // الساحبات مستبعدة - لها صفحتها المخصّصة /tow-trucks.
  const visible = useMemo(() => {
    const active = items.filter(
      (l) => isListingFeatured(l) && l.category !== "ساحبة سيارات"
    );
    active.sort((a, b) => {
      const ta = tsToMs(a.featuredAt) || 0;
      const tb = tsToMs(b.featuredAt) || 0;
      return tb - ta; // الأحدث تمييزاً أولاً
    });
    return active.slice(0, MAX_FEATURED);
  }, [items]);

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
