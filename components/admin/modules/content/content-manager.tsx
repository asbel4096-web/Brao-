"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  Clapperboard,
  Crown,
  Gavel,
  ListChecks,
  Loader2,
  MessagesSquare,
  RefreshCw,
  Search,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  contentAdminHref,
  isContentType,
  type ContentItem,
  type ContentType,
} from "@/lib/moderation/content";
import {
  STATUS_FILTERS,
  applyClientFilters,
  fetchContentPage,
  fetchPromotedListings,
  fillOwnerNames,
  searchContent,
  type Cursor,
  type DateRange,
  type SearchResult,
  type StatusFilter,
} from "./content-data";
import { ContentRow } from "./content-row";
import { ContentPreviewDrawer } from "./content-preview-drawer";

type Tab = ContentType | "promoted";
type DateKey = "all" | "today" | "7d" | "30d" | "custom";

const TABS: { key: Tab; label: string; Icon: LucideIcon }[] = [
  { key: "listing", label: "الإعلانات", Icon: ListChecks },
  { key: "post", label: "المنشورات", Icon: MessagesSquare },
  { key: "story", label: "القصص", Icon: Clapperboard },
  { key: "promoted", label: "الإعلانات الترويجية", Icon: Crown },
];

const DATE_OPTIONS: { key: DateKey; label: string }[] = [
  { key: "all", label: "كل الأوقات" },
  { key: "today", label: "اليوم" },
  { key: "7d", label: "آخر 7 أيام" },
  { key: "30d", label: "آخر 30 يوماً" },
  { key: "custom", label: "مخصص" },
];

const DAY = 24 * 60 * 60 * 1000;

function computeRange(key: DateKey, from: string, to: string): DateRange {
  const now = Date.now();
  switch (key) {
    case "today": {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return { fromMs: d.getTime(), toMs: null };
    }
    case "7d":
      return { fromMs: now - 7 * DAY, toMs: null };
    case "30d":
      return { fromMs: now - 30 * DAY, toMs: null };
    case "custom": {
      const f = from ? new Date(`${from}T00:00:00`).getTime() : NaN;
      const t = to ? new Date(`${to}T00:00:00`).getTime() + DAY : NaN;
      return { fromMs: Number.isFinite(f) ? f : null, toMs: Number.isFinite(t) ? t : null };
    }
    default:
      return { fromMs: null, toMs: null };
  }
}

const keyOf = (i: { type: ContentType; id: string }) => `${i.type}:${i.id}`;

function inTab(item: ContentItem, tab: Tab): boolean {
  if (tab === "promoted") return item.type === "listing" && (item.paid || item.promotions.length > 0);
  return item.type === tab;
}

interface Selected {
  type: ContentType;
  id: string;
  reportId: string | null;
}

export function ContentManager() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [tab, setTab] = useState<Tab>(() => {
    const t = searchParams.get("type");
    return t === "promoted" || isContentType(t) ? t : "listing";
  });
  const [status, setStatus] = useState<StatusFilter>("all");
  const [dateKey, setDateKey] = useState<DateKey>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [reloadToken, setReloadToken] = useState(0);

  // القائمة العادية (مقسّمة صفحات من الخادم)
  const [items, setItems] = useState<ContentItem[]>([]);
  const [cursor, setCursor] = useState<Cursor>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const reqId = useRef(0);

  // الإعلانات الترويجية (تُجلب مرة وتُصفّى في العميل)
  const [promo, setPromo] = useState<ContentItem[] | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const promoReq = useRef(0);

  // البحث
  const [searchInput, setSearchInput] = useState("");
  const [searchQ, setSearchQ] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Selected | null>(null);

  const range = useMemo(
    () => computeRange(dateKey, customFrom, customTo),
    // «7 أيام» تُحسب عند تغيير المرشّح أو التحديث فقط (لا في كل رسم).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dateKey, customFrom, customTo, reloadToken]
  );

  // ---------------- رابط مباشر: /admin/content?type=listing&id=XYZ&report=RID ----------------
  const handledQuery = useRef<string | null>(null);
  const qs = searchParams.toString();
  useEffect(() => {
    if (handledQuery.current === qs) return;
    handledQuery.current = qs;
    const t = searchParams.get("type");
    const id = (searchParams.get("id") || "").trim();
    const report = (searchParams.get("report") || "").trim();
    if (t === "promoted") setTab("promoted");
    else if (isContentType(t)) {
      setTab(t);
      if (id && !id.includes("/")) setSelected({ type: t, id, reportId: report || null });
    }
  }, [qs, searchParams]);

  // ---------------- تحميل القائمة ----------------
  const fillNames = useCallback((list: ContentItem[], my: number) => {
    void fillOwnerNames(list).then((filled) => {
      if (my !== reqId.current) return;
      const byKey = new Map(filled.map((i) => [keyOf(i), i]));
      setItems((prev) => prev.map((i) => byKey.get(keyOf(i)) ?? i));
    });
  }, []);

  useEffect(() => {
    if (tab === "promoted") return;
    const my = ++reqId.current;
    setLoading(true);
    setError(null);
    setNote(null);
    setItems([]);
    setCursor(null);
    setHasMore(false);
    fetchContentPage(tab, status, range, null)
      .then((page) => {
        if (my !== reqId.current) return;
        setItems(page.items);
        setCursor(page.cursor);
        setHasMore(page.hasMore);
        setNote(page.note ?? null);
        fillNames(page.items, my);
      })
      .catch(() => {
        if (my !== reqId.current) return;
        setError("تعذّر تحميل المحتوى. تحقّق من الاتصال أو الصلاحيات ثم أعد المحاولة.");
      })
      .finally(() => {
        if (my === reqId.current) setLoading(false);
      });
  }, [tab, status, range, fillNames]);

  // promo === null يعني «قيد التحميل»؛ آخر طلب فقط يكتب النتيجة.
  useEffect(() => {
    if (tab !== "promoted" || promo !== null) return;
    const my = ++promoReq.current;
    setPromoError(null);
    fetchPromotedListings()
      .then((list) => fillOwnerNames(list))
      .then((filled) => {
        if (my === promoReq.current) setPromo(filled);
      })
      .catch(() => {
        if (my !== promoReq.current) return;
        setPromo([]);
        setPromoError("تعذّر تحميل الإعلانات الترويجية.");
      });
  }, [tab, promo]);

  const loadMore = async () => {
    if (!cursor || loadingMore || tab === "promoted") return;
    const my = reqId.current;
    setLoadingMore(true);
    try {
      const page = await fetchContentPage(tab, status, range, cursor);
      if (my !== reqId.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map(keyOf));
        return [...prev, ...page.items.filter((i) => !seen.has(keyOf(i)))];
      });
      setCursor(page.cursor);
      setHasMore(page.hasMore);
      fillNames(page.items, my);
    } catch {
      setError("تعذّر تحميل المزيد.");
    } finally {
      setLoadingMore(false);
    }
  };

  const reload = () => {
    setPromo(null);
    setReloadToken((x) => x + 1);
    if (searchQ) void runSearch(searchQ);
  };

  // ---------------- البحث ----------------
  const searchReq = useRef(0);
  const runSearch = async (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const my = ++searchReq.current;
    setSearchQ(q);
    setSearching(true);
    setSearchError(null);
    setSearchResult(null);
    try {
      const res = await searchContent(q);
      const filled = await fillOwnerNames(res.items);
      if (my === searchReq.current) setSearchResult({ ...res, items: filled });
    } catch {
      if (my === searchReq.current) setSearchError("تعذّر البحث. تحقّق من الاتصال ثم أعد المحاولة.");
    } finally {
      if (my === searchReq.current) setSearching(false);
    }
  };

  const onSubmitSearch = (e: FormEvent) => {
    e.preventDefault();
    void runSearch(searchInput);
  };

  const clearSearch = () => {
    searchReq.current++; // تجاهل أي بحث جارٍ.
    setSearchInput("");
    setSearchQ(null);
    setSearchResult(null);
    setSearchError(null);
    setSearching(false);
  };

  // ---------------- العرض ----------------
  const visible: ContentItem[] = useMemo(() => {
    if (searchQ) {
      return applyClientFilters((searchResult?.items ?? []).filter((i) => inTab(i, tab)), status, range);
    }
    if (tab === "promoted") return applyClientFilters(promo ?? [], status, range);
    return items;
  }, [searchQ, searchResult, tab, status, range, promo, items]);

  const searchCounts = useMemo(() => {
    const all = searchResult ? applyClientFilters(searchResult.items, status, range) : [];
    return Object.fromEntries(TABS.map((t) => [t.key, all.filter((i) => inTab(i, t.key)).length])) as Record<Tab, number>;
  }, [searchResult, status, range]);

  const busy = searchQ ? searching : tab === "promoted" ? promo === null : loading;
  const listError = searchQ ? searchError : tab === "promoted" ? promoError : error;

  const openItem = (it: ContentItem) => setSelected({ type: it.type, id: it.id, reportId: null });

  const closeDrawer = () => {
    const sel = selected;
    setSelected(null);
    // إزالة id/report من الرابط كي لا تُفتح المعاينة مجدداً عند التحديث.
    if (sel && searchParams.get("id")) router.replace(contentAdminHref(sel.type));
  };

  const onChanged = (type: ContentType, id: string, fresh: ContentItem | null) => {
    const k = `${type}:${id}`;
    const patch = (list: ContentItem[]) =>
      fresh ? list.map((i) => (keyOf(i) === k ? { ...fresh, ownerName: fresh.ownerName || i.ownerName } : i)) : list.filter((i) => keyOf(i) !== k);
    setItems(patch);
    setPromo((p) => (p ? patch(p) : p));
    setSearchResult((r) => (r ? { ...r, items: patch(r.items) } : r));
  };

  const searchOwner = (uid: string) => {
    closeDrawer();
    setSearchInput(uid);
    void runSearch(uid);
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* الرأس */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
          <Gavel size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">إدارة المحتوى</h1>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            حذف (قابل للاستعادة) وإيقاف مؤقت واستعادة الإعلانات والمنشورات والقصص مع السبب — كل إجراء يُسجَّل ويُبلَّغ صاحبه.
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          disabled={busy}
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw size={15} className={busy ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2 text-sm font-black transition ${
                active
                  ? "bg-brand-700 text-white shadow-blue"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              <t.Icon size={15} />
              {t.label}
              {searchQ && searchResult && (
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                    active ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                  }`}
                >
                  {searchCounts[t.key].toLocaleString("ar-LY")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* البحث */}
      <form onSubmit={onSubmitSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="معرّف المحتوى، اسم المستخدم، رقم الهاتف أو UID صاحب الحساب"
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-3 pr-9 text-sm outline-none transition focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <button type="submit" disabled={!searchInput.trim() || searching} className="btn-primary !h-11 !px-4 !py-0">
          {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
          بحث
        </button>
      </form>

      {/* المرشّحات */}
      <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                status === f.key
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <CalendarRange size={16} className="text-slate-400" />
          <select
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value as DateKey)}
            className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] font-bold text-slate-700 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            aria-label="تاريخ النشر"
          >
            {DATE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {dateKey === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                aria-label="من تاريخ"
                className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
              <span className="text-[12px] text-slate-400">إلى</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                aria-label="إلى تاريخ"
                className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-[12px] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              />
            </>
          )}
        </div>
      </div>

      {/* شريط البحث النشط */}
      {searchQ && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 px-3 py-2 text-[13px] font-bold text-brand-800 dark:bg-brand-900/30 dark:text-brand-200">
          <Search size={14} />
          <span>
            نتائج البحث عن «<span dir="auto">{searchQ}</span>»
            {searchResult && searchResult.owners.length > 0 && (
              <span className="font-semibold">
                {" "}— صاحب الحساب:{" "}
                {searchResult.owners.map((o) => `${o.name || o.uid} (${o.via})`).join("، ")}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={clearSearch}
            className="ms-auto inline-flex items-center gap-1 rounded-xl px-2 py-1 text-[12px] font-black hover:bg-brand-100 dark:hover:bg-brand-900/50"
          >
            <X size={13} /> مسح البحث
          </button>
        </div>
      )}

      {/* القائمة */}
      {busy ? (
        <div className="space-y-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          ))}
        </div>
      ) : listError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {listError}{" "}
          <button type="button" onClick={reload} className="underline">
            إعادة المحاولة
          </button>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          {note && !searchQ ? note : searchQ ? "لا نتائج مطابقة في هذا القسم." : "لا يوجد محتوى بهذه المرشّحات."}
        </div>
      ) : (
        <div className="space-y-2.5">
          {visible.map((it) => (
            <ContentRow key={keyOf(it)} item={it} showType={!!searchQ} onOpen={openItem} />
          ))}
          {!searchQ && tab !== "promoted" && hasMore && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="mx-auto flex h-10 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 transition hover:border-brand-300 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {loadingMore && <Loader2 size={15} className="animate-spin" />}
              تحميل المزيد
            </button>
          )}
          {tab === "promoted" && !searchQ && (
            <p className="text-center text-[11px] text-slate-400">
              تُعرض الإعلانات ذات الترويج الفعّال (مميز/تعزيز/VIP/عاجل/مثبّت/ممول) — حتى 100 لكل نوع ترويج.
            </p>
          )}
        </div>
      )}

      {selected && (
        <ContentPreviewDrawer
          key={`${selected.type}:${selected.id}`}
          type={selected.type}
          id={selected.id}
          reportId={selected.reportId}
          onClose={closeDrawer}
          onChanged={onChanged}
          onSearchOwner={searchOwner}
        />
      )}
    </div>
  );
}
