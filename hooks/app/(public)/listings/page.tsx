"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import {
  ChevronDown,
  Filter,
  MapPin,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  libyaCities,
  listingCategories,
  resolveCategoryName,
  resolveCategorySlug,
} from "@/lib/categories";
import { ListingCard } from "@/components/listing-card";
import { getBrandById, inferBrandId } from "@/lib/car-brands";
import type { Listing } from "@/lib/types";
import { isListingFeatured } from "@/lib/utils";
import { getPromotionTier } from "@/lib/wallet/boost";

const MAX_LISTINGS = 200;

type SortKey = "newest" | "price_asc" | "price_desc";

const SORT_LABELS: Record<SortKey, string> = {
  newest: "الأحدث",
  price_asc: "السعر: الأقل",
  price_desc: "السعر: الأعلى",
};

function ListingsContent() {
  const params = useSearchParams();
  const router = useRouter();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // قراءة الفلاتر الأولية من URL
  const q0 = params.get("q") || "";
  const cat0 = resolveCategoryName(params.get("category") || "");
  const city0 = params.get("city") || "";
  const sort0 = (params.get("sort") || "newest") as SortKey;
  const min0 = params.get("min") || "";
  const max0 = params.get("max") || "";
  // الماركة - id معياري (مثل "toyota"). يأتي من قسم "تصفح حسب الماركة".
  const brand0 = (params.get("brand") || "").toLowerCase();

  const [search, setSearch] = useState(q0);
  const [category, setCategory] = useState(cat0);
  const [city, setCity] = useState(city0);
  const [sort, setSort] = useState<SortKey>(sort0);
  const [minPrice, setMinPrice] = useState(min0);
  const [maxPrice, setMaxPrice] = useState(max0);
  const [brand, setBrand] = useState(brand0);

  const deferredSearch = useDeferredValue(search);

  // إعادة المزامنة عند تغيير URL
  useEffect(() => {
    setSearch(q0);
    setCategory(cat0);
    setCity(city0);
    setSort(sort0);
    setMinPrice(min0);
    setMaxPrice(max0);
    setBrand(brand0);
  }, [q0, cat0, city0, sort0, min0, max0, brand0]);

  // جلب الإعلانات - getDocs مرة واحدة + cache في sessionStorage.
  // الفلترة كلها client-side، فلا داعي لاشتراك realtime مفتوح يستهلك
  // قراءات Firestore عند كل تحديث في collection ضخمة.
  useEffect(() => {
    const CACHE_KEY = "bratsho:listings-page:v1";
    const CACHE_TTL_MS = 2 * 60 * 1000; // دقيقتان

    // 1) cache فوري إن وُجد.
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { ts: number; list: Listing[] };
        if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS) {
          setListings(parsed.list);
          setLoading(false);
          return;
        }
        if (Array.isArray(parsed.list)) {
          setListings(parsed.list);
          setLoading(false);
        }
      }
    } catch {
      /* تجاهل */
    }

    let cancelled = false;
    const qRef = query(
      collection(db, "listings"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc"),
      limit(MAX_LISTINGS)
    );

    void (async () => {
      try {
        const snap = await getDocs(qRef);
        if (cancelled) return;
        const list: Listing[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setListings(list);
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

  // فلترة محلية
  const filtered = useMemo(() => {
    let arr = listings;
    // استبعاد خدمات الساحبات من قائمة الإعلانات العامة - لها صفحة
    // مخصّصة /tow-trucks. الاستثناء: لو المستخدم *اختار* صراحة قسم
    // ساحبة سيارات من الفلتر، نسمح بظهورها (للأدمن أو لاستكشاف يدوي).
    if (category !== "ساحبة سيارات") {
      arr = arr.filter((it) => it.category !== "ساحبة سيارات");
    }
    const s = deferredSearch.trim().toLowerCase();
    if (s) {
      arr = arr.filter((it) => {
        const t = `${it.title || ""} ${it.description || ""} ${
          it.sellerName || ""
        } ${it.brand || ""} ${it.model || ""}`.toLowerCase();
        return t.includes(s);
      });
    }
    if (category) arr = arr.filter((it) => it.category === category);
    if (city) arr = arr.filter((it) => it.city === city);
    if (minPrice) {
      const min = Number(minPrice);
      arr = arr.filter((it) => Number(it.price) >= min);
    }
    if (maxPrice) {
      const max = Number(maxPrice);
      arr = arr.filter((it) => Number(it.price) <= max);
    }
    // فلتر الماركة - يستخدم inferBrandId كي يطابق إعلانات قديمة
    // قد تكون مخزَّنة بـ"Toyota" أو "تويوتا" بدل id المعياري "toyota".
    if (brand) {
      arr = arr.filter((it) => inferBrandId(it.brand) === brand);
    }

    if (sort === "price_asc" || sort === "price_desc") {
      arr = [...arr];
      const factor = sort === "price_asc" ? 1 : -1;
      arr.sort((a, b) => (Number(a.price) - Number(b.price)) * factor);
    }

    // ترتيب حسب مستوى الترقية: VIP > ممول > مميز > عادي.
    // stable: نوزّع على 4 مجموعات مع الحفاظ على الترتيب الداخلي.
    const vipArr: Listing[] = [];
    const boostArr: Listing[] = [];
    const featuredArr: Listing[] = [];
    const regularArr: Listing[] = [];
    for (const it of arr) {
      const tier = getPromotionTier(it as any);
      if (tier === 3) vipArr.push(it);
      else if (tier === 2) boostArr.push(it);
      else if (tier === 1) featuredArr.push(it);
      else regularArr.push(it);
    }
    return [...vipArr, ...boostArr, ...featuredArr, ...regularArr];
  }, [listings, deferredSearch, category, city, sort, minPrice, maxPrice, brand]);

  /**
   * تطبيق الفلاتر مباشرة + تحديث الـ URL.
   * نطبّقها فوراً بدلاً من زر "تطبيق" (تجربة أفضل).
   */
  const updateUrl = useCallback(
    (overrides?: {
      search?: string;
      category?: string;
      city?: string;
      sort?: SortKey;
      minPrice?: string;
      maxPrice?: string;
      brand?: string;
    }) => {
      const sp = new URLSearchParams();
      const next = {
        search: overrides?.search ?? search,
        category: overrides?.category ?? category,
        city: overrides?.city ?? city,
        sort: overrides?.sort ?? sort,
        minPrice: overrides?.minPrice ?? minPrice,
        maxPrice: overrides?.maxPrice ?? maxPrice,
        brand: overrides?.brand ?? brand,
      };
      if (next.search) sp.set("q", next.search);
      if (next.category) {
        const slug = resolveCategorySlug(next.category);
        sp.set("category", slug || next.category);
      }
      if (next.city) sp.set("city", next.city);
      if (next.sort && next.sort !== "newest") sp.set("sort", next.sort);
      if (next.minPrice) sp.set("min", next.minPrice);
      if (next.maxPrice) sp.set("max", next.maxPrice);
      if (next.brand) sp.set("brand", next.brand);
      router.push(`/listings${sp.toString() ? "?" + sp.toString() : ""}`, {
        scroll: false,
      });
    },
    [search, category, city, sort, minPrice, maxPrice, brand, router]
  );

  const clearAll = useCallback(() => {
    setSearch("");
    setCategory("");
    setCity("");
    setSort("newest");
    setMinPrice("");
    setMaxPrice("");
    setBrand("");
    router.push("/listings", { scroll: false });
    setShowFilters(false);
  }, [router]);

  const handleApply = () => {
    updateUrl();
    setShowFilters(false);
  };

  const activeFilters: { key: string; label: string; clear: () => void }[] = [];
  if (brand) {
    const b = getBrandById(brand);
    activeFilters.push({
      key: "brand",
      label: b ? b.nameAr : brand,
      clear: () => {
        setBrand("");
        updateUrl({ brand: "" });
      },
    });
  }
  if (category)
    activeFilters.push({
      key: "category",
      label: category,
      clear: () => {
        setCategory("");
        updateUrl({ category: "" });
      },
    });
  if (city)
    activeFilters.push({
      key: "city",
      label: city,
      clear: () => {
        setCity("");
        updateUrl({ city: "" });
      },
    });
  if (minPrice || maxPrice) {
    const label = `${minPrice || "—"} - ${maxPrice || "∞"} د.ل`;
    activeFilters.push({
      key: "price",
      label,
      clear: () => {
        setMinPrice("");
        setMaxPrice("");
        updateUrl({ minPrice: "", maxPrice: "" });
      },
    });
  }
  if (search)
    activeFilters.push({
      key: "search",
      label: `"${search}"`,
      clear: () => {
        setSearch("");
        updateUrl({ search: "" });
      },
    });

  return (
    <section className="container py-4 sm:py-6">
      {/* ============== العنوان + شريط النتائج ============== */}
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
            الإعلانات
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            {loading ? (
              "جارٍ التحميل..."
            ) : (
              <>
                <span className="font-bold text-brand-700 dark:text-brand-300">
                  {filtered.length.toLocaleString("ar-LY")}
                </span>{" "}
                نتيجة
                {category && ` في ${category}`}
                {city && ` بمدينة ${city}`}
              </>
            )}
          </p>
        </div>

        {/* sort dropdown - مدمج في الـ header */}
        <div className="flex items-center gap-2">
          <SortDropdown
            value={sort}
            onChange={(v) => {
              setSort(v);
              updateUrl({ sort: v });
            }}
          />
        </div>
      </div>

      {/* ============== شريط chips الفلاتر ============== */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {/* زر فتح كل الفلاتر */}
        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className="
            relative inline-flex shrink-0 items-center gap-1.5
            rounded-full border border-slate-200 bg-white px-3 py-2
            text-xs font-bold text-slate-700 transition
            hover:border-brand-300 hover:text-brand-700
            active:scale-95
            dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
            dark:hover:border-brand-700 dark:hover:text-brand-300
          "
        >
          <SlidersHorizontal size={13} />
          فلاتر
          {activeFilters.length > 0 && (
            <span
              className="
                inline-flex h-4 min-w-[16px] items-center justify-center
                rounded-full bg-action-500 px-1
                text-[9px] font-black text-white
              "
            >
              {activeFilters.length}
            </span>
          )}
        </button>

        {/* فلاتر سريعة - chips للقسم */}
        <QuickCategoryChip
          label="السيارات"
          slug="cars"
          active={category === "سيارات"}
          onClick={() => {
            const newCat = category === "سيارات" ? "" : "سيارات";
            setCategory(newCat);
            updateUrl({ category: newCat });
          }}
        />
        <QuickCategoryChip
          label="قطع غيار"
          slug="car-parts"
          active={category === "قطع غيار سيارات"}
          onClick={() => {
            const newCat =
              category === "قطع غيار سيارات" ? "" : "قطع غيار سيارات";
            setCategory(newCat);
            updateUrl({ category: newCat });
          }}
        />
        <QuickCategoryChip
          label="حافلات"
          slug="buses"
          active={category === "حافلات"}
          onClick={() => {
            const newCat = category === "حافلات" ? "" : "حافلات";
            setCategory(newCat);
            updateUrl({ category: newCat });
          }}
        />
        <QuickCategoryChip
          label="شاحنات"
          slug="trucks"
          active={category === "شاحنات"}
          onClick={() => {
            const newCat = category === "شاحنات" ? "" : "شاحنات";
            setCategory(newCat);
            updateUrl({ category: newCat });
          }}
        />

        {/* فلاتر نشطة (chips قابلة للإزالة) */}
        {activeFilters.length > 0 && (
          <>
            <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
            {activeFilters.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={f.clear}
                className="
                  inline-flex shrink-0 items-center gap-1
                  rounded-full bg-brand-100 px-3 py-1.5
                  text-xs font-bold text-brand-800 transition
                  hover:bg-brand-200
                  dark:bg-brand-900/40 dark:text-brand-200
                  dark:hover:bg-brand-900/60
                "
              >
                {f.label}
                <X size={11} />
              </button>
            ))}
            <button
              type="button"
              onClick={clearAll}
              className="
                shrink-0 text-xs font-bold text-rose-600 hover:underline
                dark:text-rose-400
              "
            >
              مسح الكل
            </button>
          </>
        )}
      </div>

      {/* ============== المحتوى الرئيسي ============== */}
      <div className="grid gap-5 lg:grid-cols-[280px_1fr] lg:gap-6">
        {/* فلاتر sidebar - ديسكتوب فقط */}
        <FilterSidebar
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={(v) => {
            setCategory(v);
            updateUrl({ category: v });
          }}
          city={city}
          setCity={(v) => {
            setCity(v);
            updateUrl({ city: v });
          }}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          onPriceApply={() => updateUrl()}
          clear={clearAll}
          className="hidden lg:block"
        />

        {/* قائمة النتائج */}
        <div>
          {loading ? (
            <ListingsSkeleton />
          ) : error ? (
            <div
              className="
                card border-rose-200 bg-rose-50 p-5 text-sm font-bold
                text-rose-700 dark:border-rose-800 dark:bg-rose-950/30
                dark:text-rose-300
              "
            >
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState onClear={clearAll} />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((it, idx) => (
                <ListingCard key={it.id} listing={it} priority={idx < 4} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============== Filter sheet للجوال ============== */}
      {showFilters && (
        <FilterSheet
          search={search}
          setSearch={setSearch}
          category={category}
          setCategory={setCategory}
          city={city}
          setCity={setCity}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          activeCount={activeFilters.length}
          onApply={handleApply}
          onClose={() => setShowFilters(false)}
          onClear={clearAll}
        />
      )}
    </section>
  );
}

/* ============================================================
 * Quick chips
 * ============================================================ */

function QuickCategoryChip({
  label,
  active,
  onClick,
}: {
  label: string;
  slug: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`
        inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-2
        text-xs font-bold transition active:scale-95
        ${
          active
            ? "bg-brand-700 text-white shadow-blue"
            : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:text-brand-300"
        }
      `}
    >
      {label}
    </button>
  );
}

/* ============================================================
 * Sort dropdown
 * ============================================================ */
function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        aria-label="ترتيب النتائج"
        className="
          appearance-none rounded-2xl border border-slate-200 bg-white
          py-2 pr-3 pl-8 text-xs font-bold text-slate-700 outline-none
          transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100
          dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
          sm:text-sm
        "
      >
        {Object.entries(SORT_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="
          pointer-events-none absolute left-2 top-1/2 -translate-y-1/2
          text-slate-400
        "
        aria-hidden="true"
      />
    </div>
  );
}

/* ============================================================
 * Filter sidebar (desktop)
 * ============================================================ */
function FilterSidebar({
  search,
  setSearch,
  category,
  setCategory,
  city,
  setCity,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  onPriceApply,
  clear,
  className = "",
}: {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  onPriceApply: () => void;
  clear: () => void;
  className?: string;
}) {
  return (
    <aside
      className={`card sticky top-24 self-start space-y-4 p-5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <h2 className="inline-flex items-center gap-2 text-base font-black text-slate-950 dark:text-white">
          <Filter size={16} className="text-brand-700 dark:text-brand-300" />
          تصفية
        </h2>
        <button
          type="button"
          onClick={clear}
          className="text-xs font-bold text-rose-600 hover:underline dark:text-rose-400"
        >
          مسح
        </button>
      </div>

      <FilterField label="القسم" icon={Tag}>
        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">كل الأقسام</option>
          {listingCategories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="المدينة" icon={MapPin}>
        <select
          className="input"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        >
          <option value="">كل المدن</option>
          {libyaCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label="نطاق السعر">
        <div className="grid grid-cols-2 gap-2">
          <input
            className="input !py-2.5"
            type="number"
            inputMode="numeric"
            placeholder="من"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={onPriceApply}
          />
          <input
            className="input !py-2.5"
            type="number"
            inputMode="numeric"
            placeholder="إلى"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={onPriceApply}
          />
        </div>
      </FilterField>
    </aside>
  );
}

function FilterField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Tag;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
        {Icon && (
          <Icon
            size={12}
            className="text-slate-400 dark:text-slate-500"
            aria-hidden="true"
          />
        )}
        {label}
      </label>
      {children}
    </div>
  );
}

/* ============================================================
 * Filter sheet (mobile bottom-sheet)
 * ============================================================ */
function FilterSheet({
  search,
  setSearch,
  category,
  setCategory,
  city,
  setCity,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  activeCount,
  onApply,
  onClose,
  onClear,
}: {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  activeCount: number;
  onApply: () => void;
  onClose: () => void;
  onClear: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-end bg-black/60 backdrop-blur-sm lg:hidden"
      onClick={onClose}
    >
      <div
        className="
          w-full max-h-[88vh] overflow-y-auto rounded-t-3xl
          border-t border-slate-200 bg-white shadow-2xl animate-slide-up
          dark:border-slate-700 dark:bg-slate-900
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sheet handle */}
        <div className="sticky top-0 bg-white pb-3 pt-2 dark:bg-slate-900">
          <div className="mx-auto h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="mt-3 flex items-center justify-between px-5">
            <h3 className="text-base font-black text-slate-950 dark:text-white">
              تصفية الإعلانات
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="
                inline-flex h-9 w-9 items-center justify-center rounded-full
                bg-slate-100 text-slate-500
                dark:bg-slate-800 dark:text-slate-300
              "
              aria-label="إغلاق"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="space-y-4 px-5 pb-5">
          <FilterField label="البحث">
            <input
              className="input"
              placeholder="عنوان أو وصف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FilterField>

          <FilterField label="القسم" icon={Tag}>
            <select
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">كل الأقسام</option>
              {listingCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="المدينة" icon={MapPin}>
            <select
              className="input"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="">كل المدن</option>
              {libyaCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="نطاق السعر (د.ل)">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="من"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <input
                className="input"
                type="number"
                inputMode="numeric"
                placeholder="إلى"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </div>
          </FilterField>
        </div>

        {/* Footer ثابت */}
        <div
          className="
            sticky bottom-0 grid grid-cols-2 gap-2 border-t
            border-slate-200 bg-white p-4
            dark:border-slate-700 dark:bg-slate-900
          "
        >
          <button
            type="button"
            onClick={onClear}
            className="btn-secondary !py-3"
          >
            مسح ({activeCount})
          </button>
          <button
            type="button"
            onClick={onApply}
            className="btn-primary !py-3"
          >
            عرض النتائج
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */
function ListingsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
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

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
        <Filter size={26} />
      </div>
      <div>
        <p className="text-base font-black text-slate-950 dark:text-white">
          لا توجد نتائج مطابقة
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          جرّب تعديل أو مسح الفلاتر للحصول على نتائج أوسع.
        </p>
      </div>
      <button onClick={onClear} className="btn-secondary mt-2">
        مسح الفلاتر
      </button>
    </div>
  );
}

export default function ListingsPage() {
  return (
    <Suspense
      fallback={
        <section className="container py-10">
          <div className="card p-8 text-center text-slate-500">جارٍ التحميل...</div>
        </section>
      }
    >
      <ListingsContent />
    </Suspense>
  );
}
