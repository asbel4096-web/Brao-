"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Filter, X } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  libyaCities,
  listingCategories,
  resolveCategoryName,
  resolveCategorySlug,
} from "@/lib/categories";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/types";

function ListingsContent() {
  const params = useSearchParams();
  const router = useRouter();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const q0 = params.get("q") || "";
  // ندعم slug إنجليزي أو اسم عربي في URL ونحوّله للاسم العربي للفلترة
  const catRaw = params.get("category") || "";
  const cat0 = resolveCategoryName(catRaw);
  const city0 = params.get("city") || "";
  const sort0 = (params.get("sort") || "newest") as "newest" | "price_asc" | "price_desc";
  const min0 = params.get("min") || "";
  const max0 = params.get("max") || "";

  const [search, setSearch] = useState(q0);
  const [category, setCategory] = useState(cat0);
  const [city, setCity] = useState(city0);
  const [sort, setSort] = useState(sort0);
  const [minPrice, setMinPrice] = useState(min0);
  const [maxPrice, setMaxPrice] = useState(max0);

  // مزامنة الحالة المحلية مع URL
  useEffect(() => {
    setSearch(q0); setCategory(cat0); setCity(city0);
    setSort(sort0); setMinPrice(min0); setMaxPrice(max0);
  }, [q0, cat0, city0, sort0, min0, max0]);

  useEffect(() => {
    const qRef = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setListings(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      (err) => {
        setError(err.message || "تعذّر تحميل الإعلانات.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    let arr = listings.slice();
    const s = search.trim().toLowerCase();
    if (s) {
      arr = arr.filter((it) => {
        const t = `${it.title || ""} ${it.description || ""} ${it.sellerName || ""} ${it.brand || ""} ${it.model || ""}`.toLowerCase();
        return t.includes(s);
      });
    }
    if (category) arr = arr.filter((it) => it.category === category);
    if (city) arr = arr.filter((it) => it.city === city);
    if (minPrice) arr = arr.filter((it) => Number(it.price) >= Number(minPrice));
    if (maxPrice) arr = arr.filter((it) => Number(it.price) <= Number(maxPrice));

    if (sort === "price_asc") arr.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") arr.sort((a, b) => Number(b.price) - Number(a.price));
    return arr;
  }, [listings, search, category, city, sort, minPrice, maxPrice]);

  const applyToUrl = () => {
    const sp = new URLSearchParams();
    if (search) sp.set("q", search);
    // نحفظ القسم في URL كـ slug للحصول على روابط نظيفة
    if (category) {
      const slug = resolveCategorySlug(category);
      sp.set("category", slug || category);
    }
    if (city) sp.set("city", city);
    if (sort && sort !== "newest") sp.set("sort", sort);
    if (minPrice) sp.set("min", minPrice);
    if (maxPrice) sp.set("max", maxPrice);
    router.push(`/listings${sp.toString() ? "?" + sp.toString() : ""}`);
    setShowFilters(false);
  };

  const clearAll = () => {
    setSearch(""); setCategory(""); setCity("");
    setSort("newest"); setMinPrice(""); setMaxPrice("");
    router.push("/listings");
    setShowFilters(false);
  };

  const activeFiltersCount = [category, city, minPrice, maxPrice, search]
    .filter(Boolean).length;

  return (
    <section className="container py-6 sm:py-10">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">الإعلانات</h1>
          <p className="section-subtitle">
            {category || "كل الأقسام"}
            {city ? ` - ${city}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters(true)}
            className="btn-secondary lg:hidden relative"
          >
            <Filter size={16} />
            تصفية
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-action-500 text-[10px] font-black text-white">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            {filtered.length} نتيجة
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Filters - desktop */}
        <FilterPanel
          search={search} setSearch={setSearch}
          category={category} setCategory={setCategory}
          city={city} setCity={setCity}
          sort={sort} setSort={setSort}
          minPrice={minPrice} setMinPrice={setMinPrice}
          maxPrice={maxPrice} setMaxPrice={setMaxPrice}
          apply={applyToUrl} clear={clearAll}
          className="hidden lg:block sticky top-24 self-start"
        />

        {/* Filters - mobile drawer */}
        {showFilters && (
          <div className="lg:hidden fixed inset-0 z-50 flex items-end bg-black/50">
            <div className="w-full bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black dark:text-white">تصفية</h3>
                <button
                  type="button"
                  onClick={() => setShowFilters(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                  aria-label="إغلاق"
                >
                  <X size={18} />
                </button>
              </div>
              <FilterPanel
                search={search} setSearch={setSearch}
                category={category} setCategory={setCategory}
                city={city} setCity={setCity}
                sort={sort} setSort={setSort}
                minPrice={minPrice} setMinPrice={setMinPrice}
                maxPrice={maxPrice} setMaxPrice={setMaxPrice}
                apply={applyToUrl} clear={clearAll}
              />
            </div>
          </div>
        )}

        {/* Results */}
        <div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => <div key={i} className="skeleton h-80" />)}
            </div>
          ) : error ? (
            <div className="card border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-slate-600 dark:text-slate-300">
                لا توجد نتائج مطابقة. جرّب تعديل الفلاتر.
              </p>
              <button onClick={clearAll} className="btn-secondary mt-4 inline-flex">
                مسح الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((it) => (
                <ListingCard key={it.id} listing={it} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterPanel({
  search, setSearch, category, setCategory, city, setCity, sort, setSort,
  minPrice, setMinPrice, maxPrice, setMaxPrice, apply, clear, className = "",
}: any) {
  return (
    <aside className={`card p-5 ${className}`}>
      <h2 className="text-lg font-black mb-4 dark:text-white">تصفية الإعلانات</h2>
      <div className="space-y-3">
        <div>
          <label className="label">بحث</label>
          <input
            className="input"
            placeholder="عنوان أو وصف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div>
          <label className="label">القسم</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">كل الأقسام</option>
            {listingCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">المدينة</label>
          <select className="input" value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">كل المدن</option>
            {libyaCities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">السعر</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input"
              type="number"
              placeholder="من"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              className="input"
              type="number"
              placeholder="إلى"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">ترتيب</label>
          <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">الأحدث</option>
            <option value="price_asc">السعر: الأقل</option>
            <option value="price_desc">السعر: الأعلى</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button onClick={clear} className="btn-secondary !py-2.5">إعادة تعيين</button>
          <button onClick={apply} className="btn-primary !py-2.5">تطبيق</button>
        </div>
      </div>
    </aside>
  );
}

export default function ListingsPage() {
  return (
    <Suspense fallback={
      <section className="container py-10">
        <div className="card p-8 text-center text-slate-500">جارٍ التحميل...</div>
      </section>
    }>
      <ListingsContent />
    </Suspense>
  );
}
