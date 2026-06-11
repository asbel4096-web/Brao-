"use client";

import { useEffect, useRef, useState } from "react";
import { Search, Users as UsersIcon, RefreshCw } from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import {
  useUsersList,
  type UserFilter,
} from "@/hooks/admin/use-users-list";
import { UsersTable } from "@/components/admin/modules/users/users-table";

/**
 * صفحة قائمة المستخدمين للأدمن.
 *
 * - Tabs للفلترة (الكل / أدمن / محظور / موثَّق / محذوف)
 * - حقل بحث (client-side في النتائج المحمَّلة)
 * - Infinite scroll: زر "تحميل المزيد" + IntersectionObserver للـauto-load
 * - زر refresh يدوي بعد الإجراءات
 *
 * صلاحية مطلوبة: users.view (يفحصها الـlayout أيضاً، لكن نُكرّر).
 */

const FILTERS: { key: UserFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "admins", label: "الإدارة" },
  { key: "verified", label: "موثَّقون" },
  { key: "banned", label: "محظورون" },
  { key: "deleted", label: "محذوفون" },
];

export default function AdminUsersPage() {
  const { can } = useAdminRole();
  const [filter, setFilter] = useState<UserFilter>("all");
  const [search, setSearch] = useState("");

  const {
    items,
    rawItems,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useUsersList(filter, search);

  // IntersectionObserver للـauto-load عند الوصول لنهاية القائمة
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore || loading) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  if (!can("users.view")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية قائمة المستخدمين.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <UsersIcon size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
              المستخدمون
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              إدارة كل مستخدمي المنصة، تعيين الأدوار، الحظر والتوثيق.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="تحديث"
          className="
            grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200
            text-slate-500 transition
            hover:border-brand-300 hover:text-brand-700
            dark:border-slate-700 dark:text-slate-400
            dark:hover:border-brand-700 dark:hover:text-brand-300
            disabled:opacity-50
          "
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filters */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`
                shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition
                ${active
                  ? "bg-brand-700 text-white shadow-sm dark:bg-brand-600"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700"
                }
              `}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* بحث */}
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث بالاسم، البريد، الهاتف، أو الـID..."
          className="
            h-10 w-full rounded-2xl border border-slate-200 bg-white pe-10 ps-3
            text-sm outline-none transition focus:border-brand-400
            dark:border-slate-700 dark:bg-slate-900
          "
        />
        {search && (
          <p className="mt-1 px-1 text-[11px] text-slate-500 dark:text-slate-400">
            عرض {items.length} من {rawItems.length} محمَّل
          </p>
        )}
      </div>

      {/* محتوى */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          خطأ: {error}
        </div>
      ) : (
        <UsersTable items={items} loading={loading} />
      )}

      {/* Sentinel + load more */}
      {!loading && items.length > 0 && (
        <div ref={sentinelRef} className="py-4 text-center">
          {hasMore ? (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="
                inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white
                px-5 py-2 text-xs font-black text-slate-700 transition
                hover:border-brand-300
                dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300
                disabled:opacity-60
              "
            >
              {loadingMore ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  جارٍ التحميل...
                </>
              ) : (
                "تحميل المزيد"
              )}
            </button>
          ) : (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              وصلتِ لنهاية القائمة
            </p>
          )}
        </div>
      )}
    </div>
  );
}
