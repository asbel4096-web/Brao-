"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { DynamicListingCard } from "@/components/cards/dynamic-listing-card";
import {
  categoryNamesForBucket,
} from "@/lib/category-mapping";
import type { HomeBucket } from "@/lib/category-config";

/**
 * ============================================================
 *  LatestByBucket — أقسام الرئيسية المنفصلة (المرحلة 4)
 * ============================================================
 *
 * قسم رئيسية عام يعرض "أحدث X" لدلو فئات معيّن:
 *   bucket="cars"     → أحدث السيارات
 *   bucket="parts"    → أحدث قطع الغيار
 *   bucket="tow"      → أحدث الساحبات
 *   bucket="services" → أحدث خدمات الصيانة
 *
 * - يستعلم status=="approved" (مطلوب من القواعد) + orderBy(createdAt desc)،
 *   ثم يفلتر فئات الدلو client-side (يتجنّب فهرساً مركّباً لكل دلو).
 * - يعرض البطاقة الديناميكية (DynamicListingCard) من المرحلة 3.
 * - يختفي تماماً لو لا توجد عناصر (return null).
 * - Skeleton أثناء التحميل، كاش جلسة قصير.
 *
 * Auto Mapping: أسماء الفئات تأتي من categoryNamesForBucket (المرحلة 1)،
 * فأي قسم جديد يُضاف يظهر تلقائياً في دلوه الصحيح.
 */

const MAX = 10;
const POOL = 60; // نقرأ مجموعة ثم نفلتر الدلو منها

interface Props {
  bucket: HomeBucket;
  title: string;
  /** رابط "عرض الكل" (اختياري). */
  seeAllHref?: string;
  priority?: boolean;
}

export function LatestByBucket({ bucket, title, seeAllHref, priority }: Props) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `bratsho:latest:${bucket}:v1`;
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < 3 * 60 * 1000) {
          setItems(parsed.list as Listing[]);
          setLoading(false);
          return;
        }
      }
    } catch {}

    let cancelled = false;
    void (async () => {
      try {
        const names = new Set(categoryNamesForBucket(bucket));
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc"),
            limit(POOL)
          )
        );
        if (cancelled) return;
        const list: Listing[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((l: Listing) => names.has(l.category))
          .slice(0, MAX);
        setItems(list);
        setLoading(false);
        try {
          sessionStorage.setItem(
            cacheKey,
            JSON.stringify({ ts: Date.now(), list })
          );
        } catch {}
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(`[latest:${bucket}] fetch failed:`, (err as any)?.code);
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bucket]);

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
              className="h-56 w-[210px] shrink-0 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700 sm:w-[230px]"
            />
          ))}
        </div>
      </section>
    );
  }

  // إخفاء كامل لو لا عناصر
  if (items.length === 0) return null;

  return (
    <section className="py-4 sm:py-5">
      <div className="container">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h2 className="text-base font-black text-slate-900 dark:text-white sm:text-lg">
            {title}
          </h2>
          <Link
            href={seeAllHref || "/listings"}
            className="inline-flex items-center gap-0.5 text-xs font-black text-brand-700 transition hover:text-brand-800 dark:text-brand-300"
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
          <DynamicListingCard
            key={it.id}
            listing={it}
            priority={Boolean(priority) && idx < 2}
          />
        ))}
      </div>
    </section>
  );
}

/* ---------- مكوّنات جاهزة لكل دلو (للاستخدام المباشر في الرئيسية) ---------- */

export function LatestCars() {
  return (
    <LatestByBucket
      bucket="cars"
      title="أحدث السيارات"
      seeAllHref="/listings?group=vehicles"
      priority
    />
  );
}

export function LatestParts() {
  return (
    <LatestByBucket
      bucket="parts"
      title="أحدث قطع الغيار"
      seeAllHref="/listings?group=parts"
    />
  );
}

export function LatestServices() {
  return (
    <LatestByBucket
      bucket="services"
      title="أحدث خدمات الصيانة"
      seeAllHref="/listings?group=services"
    />
  );
}

export function LatestTowTrucks() {
  return (
    <LatestByBucket
      bucket="tow"
      title="أحدث الساحبات"
      seeAllHref="/tow-trucks"
    />
  );
}
