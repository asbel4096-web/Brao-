"use client";

import { useEffect, useRef, useState } from "react";
import {
  Shield,
  User as UserIcon,
  ListChecks,
  Flag,
  Megaphone,
  Settings,
  Ban,
  BadgeCheck,
  Trash2,
  Filter,
  type LucideIcon,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import {
  useActivityFeed,
  type ActivityFilter,
  type AdminLogEntry,
} from "@/hooks/admin/use-activity-feed";

/**
 * صفحة سجلّ النشاطات (Activity feed) - يعرض كل إجراءات الأدمن
 * المُسجَّلة في adminLogs collection.
 *
 * كل إجراء: من، ماذا، متى، السبب (إن وجد).
 * - الـbefore/after لا يُعرض هنا (مفصَّل) - ربما في الـrow expand لاحقاً.
 */

const FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "users", label: "المستخدمون" },
  { key: "listings", label: "الإعلانات" },
  { key: "reports", label: "البلاغات" },
  { key: "broadcast", label: "الإشعارات" },
];

const ACTION_META: Record<
  string,
  { label: string; icon: LucideIcon; tone: string }
> = {
  user_ban: { label: "حظر مستخدم", icon: Ban, tone: "rose" },
  user_unban: { label: "إلغاء حظر مستخدم", icon: UserIcon, tone: "emerald" },
  user_verify: { label: "توثيق مستخدم", icon: BadgeCheck, tone: "emerald" },
  user_unverify: { label: "إلغاء توثيق", icon: BadgeCheck, tone: "amber" },
  user_role_change: { label: "تغيير دور", icon: Settings, tone: "brand" },
  user_delete: { label: "حذف مستخدم", icon: Trash2, tone: "rose" },
  listing_approve: { label: "اعتماد إعلان", icon: ListChecks, tone: "emerald" },
  listing_reject: { label: "رفض إعلان", icon: ListChecks, tone: "rose" },
  report_handle: { label: "معالجة بلاغ", icon: Flag, tone: "amber" },
  broadcast_send: { label: "إرسال إشعار جماعي", icon: Megaphone, tone: "action" },
  banned_word_add: { label: "إضافة كلمة محظورة", icon: Filter, tone: "rose" },
  banned_word_remove: { label: "حذف كلمة محظورة", icon: Filter, tone: "slate" },
};

function getActionMeta(action: string) {
  return (
    ACTION_META[action] || {
      label: action,
      icon: Shield,
      tone: "slate",
    }
  );
}

const TONE_BG: Record<string, string> = {
  rose: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
  emerald:
    "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
  brand: "bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300",
  action:
    "bg-action-50 text-action-600 dark:bg-action-900/30 dark:text-action-300",
  slate:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

function formatDate(ts: any): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString("ar-LY", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ActivityLogsPage() {
  const { can } = useAdminRole();
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const { items, loading, loadingMore, error, hasMore, loadMore } =
    useActivityFeed(filter);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore || loading) return;
    if (typeof window === "undefined" || !("IntersectionObserver" in window))
      return;
    const observer = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && loadMore(),
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, loadMore]);

  if (!can("logs.view")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية سجلّ النشاطات.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Shield size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            سجلّ النشاطات
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            كل إجراءات الأدمن مُسجَّلة هنا (audit trail).
          </p>
        </div>
      </header>

      {/* Filter tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          خطأ: {error}
        </div>
      ) : loading && items.length === 0 ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Shield
            size={36}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            لا توجد نشاطات بعد
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}

      {/* Sentinel */}
      {!loading && items.length > 0 && (
        <div ref={sentinelRef} className="py-4 text-center">
          {hasMore ? (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-black text-slate-700 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 disabled:opacity-60"
            >
              {loadingMore ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                  جارٍ...
                </>
              ) : (
                "تحميل المزيد"
              )}
            </button>
          ) : (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              وصلتِ لنهاية السجلّ
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function LogRow({ log }: { log: AdminLogEntry }) {
  const meta = getActionMeta(log.action);
  const Icon = meta.icon;
  const bg = TONE_BG[meta.tone] || TONE_BG.slate;

  return (
    <article className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={16} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {meta.label}
          </h3>
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {formatDate(log.createdAt)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          <span>الأدمن:</span>
          <span className="font-mono text-[10px]" dir="ltr">
            {log.adminUid.slice(0, 12)}...
          </span>
          <span aria-hidden>·</span>
          <span>{log.targetType}:</span>
          <span className="font-mono text-[10px]" dir="ltr">
            {log.targetId.slice(0, 12)}...
          </span>
        </div>
        {log.reason && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-600 dark:text-slate-300">
            «{log.reason}»
          </p>
        )}
      </div>
    </article>
  );
}
