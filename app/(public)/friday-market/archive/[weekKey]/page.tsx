"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useMarketItems } from "@/hooks/friday-market/use-market-items";
import { MarketGrid } from "@/components/friday-market/market-grid";
import { CategoryChips } from "@/components/friday-market/category-chips";
import { formatNumber } from "@/lib/utils";

export default function ArchivedWeekPage() {
  const params = useParams<{ weekKey: string }>();
  const weekKey = params.weekKey;
  const router = useRouter();
  const [category, setCategory] = useState("all");
  const [label, setLabel] = useState<string>("");
  const [count, setCount] = useState<number | null>(null);

  const { items, loading, loadingMore, hasMore, loadMore } = useMarketItems({
    weekKey,
    category,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "fridayMarketWeeks", weekKey));
        if (cancelled) return;
        if (snap.exists()) {
          setLabel(snap.data()?.label || "");
          setCount(snap.data()?.count || 0);
        }
      } catch {
        /* تجاهل */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekKey]);

  return (
    <div className="pb-24" dir="rtl">
      <div className="container flex items-center gap-2 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={22} />
        </button>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            🛒 {label || "أرشيف الجمعة"}
          </h1>
          {count !== null && (
            <p className="text-xs font-semibold text-slate-400">
              {formatNumber(count)} إعلان
            </p>
          )}
        </div>
      </div>

      <section className="container">
        <CategoryChips value={category} onChange={setCategory} className="mb-4" />
        <MarketGrid
          items={items}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          onLoadMore={loadMore}
          hrefBase="/friday-market"
          emptyHint="لا إعلانات في هذا القسم لهذه الجلسة"
        />
      </section>
    </div>
  );
}
