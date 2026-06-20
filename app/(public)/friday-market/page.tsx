"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Archive, Plus, Search, ShoppingCart } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useMarketState } from "@/hooks/friday-market/use-market-state";
import { useMarketItems } from "@/hooks/friday-market/use-market-items";
import { useMarketFeatured } from "@/hooks/friday-market/use-market-featured";
import { MarketCountdown } from "@/components/friday-market/market-countdown";
import { CategoryChips } from "@/components/friday-market/category-chips";
import { MarketGrid } from "@/components/friday-market/market-grid";
import { MarketItemCard } from "@/components/friday-market/market-item-card";
import { PostSheet } from "@/components/friday-market/post-sheet";
import { formatNumber } from "@/lib/utils";

export default function FridayMarketPage() {
  const { user } = useAuth();
  const {
    settings,
    isLive,
    isOpen,
    msRemaining,
    msUntilOpen,
    weekKey,
    weekLabel,
    loading: stateLoading,
  } = useMarketState();

  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "popular">("newest");
  const [postOpen, setPostOpen] = useState(false);
  const [todayCount, setTodayCount] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const { items, loading, loadingMore, hasMore, loadMore } = useMarketItems({
    weekKey,
    category,
    sort,
    paused: stateLoading,
  });
  const { items: featured } = useMarketFeatured(weekKey, 8);

  // عدد إعلانات اليوم (من ملخّص الجلسة)
  useEffect(() => {
    let cancelled = false;
    if (!weekKey) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "fridayMarketWeeks", weekKey));
        if (!cancelled) setTodayCount(snap.exists() ? snap.data()?.count || 0 : 0);
      } catch {
        if (!cancelled) setTodayCount(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [weekKey, refreshKey]);

  // بحث client-side على الصفحات المحمّلة
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.title?.toLowerCase().includes(q));
  }, [items, search]);

  // السوق موقوف من الأدمن → إخفاء الصفحة عن الجميع
  if (!stateLoading && settings.enabled === false) {
    return (
      <div className="container flex min-h-[70vh] flex-col items-center justify-center text-center" dir="rtl">
        <div className="text-5xl">🛒</div>
        <h1 className="mt-4 text-lg font-black text-slate-800 dark:text-slate-100">
          سوق الجمعة غير متاح حالياً
        </h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          تابعنا — سيعود قريباً
        </p>
        <Link
          href="/"
          className="mt-5 rounded-full bg-action-500 px-6 py-2.5 text-sm font-bold text-white"
        >
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24" dir="rtl">
      {/* ===== الرأس: بانر + عدّاد + عدد ===== */}
      <section className="container pt-4">
        <div className="relative overflow-hidden rounded-[28px] border border-white/60 bg-white/70 p-5 shadow-[0_12px_34px_-10px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/55">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-action-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-14 -left-8 h-40 w-40 rounded-full bg-amber-300/15 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-2.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-action-400 to-action-600 text-white shadow-md shadow-action-500/30">
                <ShoppingCart size={24} strokeWidth={2.4} />
              </div>
              <div>
                <h1 className="text-xl font-black leading-tight text-slate-900 dark:text-white">
                  {settings.bannerTitle || "🛒 سوق الجمعة"}
                </h1>
                <p className="text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                  {weekLabel}
                </p>
              </div>
            </div>

            {/* العدّاد */}
            <div className="mt-4 rounded-2xl border border-slate-100 bg-white/60 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-800/40">
              <p className="mb-2 text-[12px] font-bold text-slate-500 dark:text-slate-400">
                {isLive ? "⏳ يُغلق السوق خلال" : "🗓️ يفتح السوق خلال"}
              </p>
              <MarketCountdown
                ms={isLive ? msRemaining : msUntilOpen}
                variant="boxes"
              />
            </div>

            {/* عدد الإعلانات اليوم */}
            <div className="mt-3 flex items-center gap-2 text-[13px] font-bold">
              <span className="rounded-full bg-action-50 px-3 py-1 text-action-700 dark:bg-action-500/10 dark:text-action-300">
                🔥 {todayCount === null ? "…" : formatNumber(todayCount)} إعلان اليوم
              </span>
              {settings.showArchive !== false && (
                <Link
                  href="/friday-market/archive"
                  prefetch={false}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Archive size={13} /> الأرشيف
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ===== البحث + الفلترة ===== */}
      <section className="container mt-4 space-y-3">
        <div className="relative">
          <Search
            size={18}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في عروض الجمعة..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pr-11 pl-4 text-[15px] font-semibold text-slate-800 outline-none focus:border-action-400 focus:ring-2 focus:ring-action-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
        <CategoryChips value={category} onChange={setCategory} />
      </section>

      {/* ===== إعلانات مميّزة ===== */}
      {featured.length > 0 && (
        <section className="mt-5">
          <div className="container mb-2 flex items-center gap-2">
            <span className="text-base font-black text-slate-900 dark:text-white">
              ⭐ عروض مميّزة
            </span>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((it) => (
              <div key={it.id} className="w-[150px] shrink-0">
                <MarketItemCard item={it} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== الشبكة ===== */}
      <section className="container mt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            {sort === "popular" ? "🔥 الأكثر رواجاً" : "أحدث العروض"}
          </h2>
          <div className="flex rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
            <button
              onClick={() => setSort("newest")}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-bold transition",
                sort === "newest"
                  ? "bg-white text-action-600 shadow-sm dark:bg-slate-700 dark:text-action-300"
                  : "text-slate-500",
              ].join(" ")}
            >
              الأحدث
            </button>
            <button
              onClick={() => setSort("popular")}
              className={[
                "rounded-full px-3 py-1.5 text-xs font-bold transition",
                sort === "popular"
                  ? "bg-white text-action-600 shadow-sm dark:bg-slate-700 dark:text-action-300"
                  : "text-slate-500",
              ].join(" ")}
            >
              🔥 الأكثر رواجاً
            </button>
          </div>
        </div>

        {!isOpen && !stateLoading ? (
          <ClosedNotice msUntilOpen={msUntilOpen} />
        ) : (
          <MarketGrid
            items={filtered}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore && !search}
            onLoadMore={loadMore}
            emptyHint={
              search ? "لا نتائج لبحثك" : "كن أول من ينشر في سوق هذا الأسبوع 🔥"
            }
          />
        )}
      </section>

      {/* ===== زر النشر العائم ===== */}
      {isLive && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            if (!user) {
              window.location.href = "/login?redirect=/friday-market";
              return;
            }
            setPostOpen(true);
          }}
          className="fixed bottom-24 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full bg-gradient-to-l from-orange-500 to-red-600 px-5 py-3.5 text-[15px] font-black text-white shadow-[0_12px_30px_-6px_rgba(234,88,12,0.6)]"
        >
          <Plus size={20} strokeWidth={2.8} /> نشر سريع
        </motion.button>
      )}

      <PostSheet
        open={postOpen}
        onClose={() => setPostOpen(false)}
        onPosted={() => setRefreshKey((k) => k + 1)}
        weekKey={weekKey}
        isLive={isLive}
      />
    </div>
  );
}

function ClosedNotice({ msUntilOpen }: { msUntilOpen: number }) {
  return (
    <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50 py-12 text-center dark:border-orange-900/40 dark:bg-orange-950/20">
      <div className="text-4xl">🛒</div>
      <p className="mt-3 text-base font-black text-slate-800 dark:text-slate-100">
        السوق مغلق حالياً
      </p>
      <p className="mt-1 text-sm font-semibold text-slate-500">
        سوق الجمعة يفتح يوم الجمعة فقط
      </p>
      <div className="mt-3">
        <MarketCountdown ms={msUntilOpen} variant="text" prefix="يفتح خلال" className="text-action-600 dark:text-action-400" />
      </div>
    </div>
  );
}
