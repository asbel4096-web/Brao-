"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { ChevronLeft } from "lucide-react";
import { db } from "@/lib/firebase";
import type { Listing } from "@/lib/types";
import { formatPrice } from "@/lib/utils";

/**
 * إعلانات مشابهة - شريط أفقي قابل للتمرير.
 *
 * يجلب إعلانات من نفس الفئة (category)، يستبعد الإعلان الحالي،
 * ويُفضّل نفس المدينة. بطاقات مصغّرة (صورة + عنوان + سعر + مدينة).
 *
 * - يختفي تماماً لو لا توجد نتائج (لا يشوّش الصفحة).
 * - استعلام بسيط (category فقط) لتجنّب الحاجة لـ composite index.
 */

const FALLBACK = "/icons/car-card.svg";

interface Props {
  listing: Pick<Listing, "id" | "category" | "city">;
}

export function SimilarListings({ listing }: Props) {
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // نجلب من نفس الفئة - status==approved مطلوب من القواعد
        // (يتجنّب 403). يستخدم فهرس status+category الموجود.
        const snap = await getDocs(
          query(
            collection(db, "listings"),
            where("status", "==", "approved"),
            where("category", "==", listing.category),
            limit(12)
          )
        );
        if (cancelled) return;

        let list: Listing[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((it: any) => it.id !== listing.id);

        // ترتيب: نفس المدينة أولاً
        list.sort((a: any, b: any) => {
          const am = a.city === listing.city ? 0 : 1;
          const bm = b.city === listing.city ? 0 : 1;
          return am - bm;
        });

        setItems(list.slice(0, 8));
        setLoading(false);
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listing.id, listing.category, listing.city]);

  // لا نعرض القسم إطلاقاً لو لا نتائج
  if (!loading && items.length === 0) return null;

  return (
    <section dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-base font-black text-slate-900 dark:text-white">
          إعلانات مشابهة
        </h3>
        <Link
          href={`/listings?category=${encodeURIComponent(listing.category)}`}
          className="inline-flex items-center gap-0.5 text-[12px] font-black text-brand-700 dark:text-brand-300"
        >
          عرض الكل
          <ChevronLeft size={13} />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-44 w-40 shrink-0 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar">
          {items.map((it) => (
            <SimilarCard key={it.id} item={it} />
          ))}
        </div>
      )}
    </section>
  );
}

function SimilarCard({ item }: { item: Listing }) {
  const img = item.images?.[0] || FALLBACK;
  return (
    <Link
      href={`/listings/${item.id}`}
      className="
        group w-40 shrink-0 overflow-hidden rounded-2xl border border-slate-200/70
        bg-white transition hover:shadow-md
        dark:border-slate-800 dark:bg-slate-900
      "
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800">
        <Image
          src={img}
          alt={item.title || ""}
          fill
          className="object-cover transition group-hover:scale-105"
          sizes="160px"
        />
      </div>
      <div className="p-2.5">
        <h4 className="line-clamp-1 text-[12px] font-black text-slate-900 dark:text-white">
          {item.title}
        </h4>
        <p className="mt-1 text-[13px] font-black text-brand-700 dark:text-brand-300">
          {formatPrice(item.price)} د.ل
        </p>
        {item.city && (
          <p className="mt-0.5 text-[10px] text-slate-400">{item.city}</p>
        )}
      </div>
    </Link>
  );
}
