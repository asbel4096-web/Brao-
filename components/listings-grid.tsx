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
import { Sparkles } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { isListingFeatured } from "@/lib/utils";
import { ListingCard } from "./listing-card";

/**
 * أحدث الإعلانات على الصفحة الرئيسية.
 *
 * تحسينات:
 * - skeletons تحاكي البطاقة الجديدة (صورة + شريط معلومات + أزرار)
 * - 2 أعمدة على الجوال (بدلاً من 1) لمشاهدة أكثر بصرف نظر دون scroll طويل
 * - أيقونة في العنوان لتحسين الهرمية البصرية
 */

export function ListingsGrid() {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    /* ============================================================
     * استبدال onSnapshot بـgetDocs:
     * - الإعلانات لا تحتاج realtime (تتم الموافقة من الأدمن، فالظهور
     *   ليس فوري). تحديث كل دقيقتين أكثر من كافٍ.
     * - cache في sessionStorage يجعل العودة للرئيسية فورية.
     * - لا اشتراك مفتوح يستهلك بيانات الجوّال.
     * ============================================================ */
    const CACHE_KEY = "bratsho:home-listings:v1";
    const CACHE_TTL_MS = 2 * 60 * 1000; // دقيقتان

    // 1) عرض الـcache فوراً لو موجود (stale-while-revalidate).
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; list: Listing[] };
        if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS) {
          setItems(parsed.list);
          setLoading(false);
          return; // cache صالح، لا حاجة لـquery.
        }
        // cache منتهي - اعرضه مؤقتاً ثم اجلب جديداً.
        if (Array.isArray(parsed.list)) {
          setItems(parsed.list);
          setLoading(false);
        }
      }
    } catch {
      /* تجاهل أخطاء parsing */
    }

    let cancelled = false;
    const q = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(8)
    );

    void (async () => {
      try {
        const snap = await getDocs(q);
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
          /* تجاهل */
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.message || "تعذّر تحميل الإعلانات.");
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ترتيب المميزة أولاً ثم العادية - الترتيب داخل كل مجموعة محفوظ
  // من Firestore (orderBy createdAt desc). التمييز يُفحص client-side
  // بفترة الانتهاء أيضاً، فالمنتهي لا يبقى في القمة.
  const sortedItems = useMemo(() => {
    const featured: Listing[] = [];
    const regular: Listing[] = [];
    for (const it of items) {
      if (isListingFeatured(it)) featured.push(it);
      else regular.push(it);
    }
    return [...featured, ...regular];
  }, [items]);

  return (
    <section className="container py-7 sm:py-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="section-title inline-flex items-center gap-2">
            <Sparkles className="text-action-500" size={22} aria-hidden="true" />
            أحدث الإعلانات
          </h2>
          <p className="section-subtitle">
            آخر الإعلانات المعتمدة من فريق براتشو.
          </p>
        </div>
        <Link
          href="/listings"
          className="
            inline-flex items-center gap-1 text-sm font-bold
            text-brand-700 hover:text-brand-800
            dark:text-brand-300 dark:hover:text-brand-200
          "
        >
          المزيد ←
        </Link>
      </div>

      {loading ? (
        <ListingsGridSkeleton />
      ) : error ? (
        <div className="card mt-6 border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="card mt-6 p-8 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            لا توجد إعلانات حالياً. كن أوّل من يضيف إعلاناً!
          </p>
          <Link href="/add-listing" className="btn-action mt-4 inline-flex">
            أضف أول إعلان
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
          {sortedItems.map((it, idx) => (
            <ListingCard key={it.id} listing={it} priority={idx < 2} />
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
 * Skeleton يحاكي شكل البطاقة الفعلية
 * ============================================================ */
function ListingsGridSkeleton() {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="
            overflow-hidden rounded-3xl border border-slate-200/70
            bg-white shadow-card dark:border-slate-700/70 dark:bg-slate-900
          "
        >
          <div className="skeleton aspect-[4/3] !rounded-none" />
          <div className="space-y-2 p-3.5 sm:p-4">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
            <div className="skeleton h-9 w-full !rounded-2xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
