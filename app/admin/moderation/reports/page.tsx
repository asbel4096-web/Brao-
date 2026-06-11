"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Flag,
  RefreshCw,
  ListChecks,
  MessageCircle,
  User as UserIcon,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  EyeOff,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import {
  useReportsList,
  type StatusFilter,
  type TypeFilter,
} from "@/hooks/admin/use-reports-list";
import {
  getReasonLabel,
  STATUS_LABELS,
  TARGET_TYPE_LABELS,
  type ReportDoc,
  type ReportStatus,
  type ReportTargetType,
} from "@/lib/moderation/types";

/**
 * صفحة قائمة البلاغات.
 *
 * Tabs: status filter
 * Pills: type filter (client-side)
 * Infinite scroll
 */

const STATUS_FILTERS: { key: StatusFilter; label: string; tone: string }[] = [
  { key: "pending", label: "معلَّقة", tone: "amber" },
  { key: "reviewing", label: "قيد المراجعة", tone: "brand" },
  { key: "resolved", label: "مُنجَزة", tone: "emerald" },
  { key: "dismissed", label: "مرفوضة", tone: "slate" },
  { key: "all", label: "الكل", tone: "slate" },
];

const TYPE_FILTERS: { key: TypeFilter; label: string }[] = [
  { key: "all", label: "كل الأنواع" },
  { key: "listing", label: "إعلانات" },
  { key: "comment", label: "تعليقات" },
  { key: "user", label: "مستخدمون" },
];

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

export default function ReportsListPage() {
  const { can } = useAdminRole();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useReportsList(statusFilter, typeFilter);

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

  if (!can("reports.view")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية البلاغات.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <Flag size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
              البلاغات
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              راجعي البلاغات الواردة من المستخدمين واتخذي إجراءً.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          aria-label="تحديث"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:text-slate-400 dark:hover:border-brand-700 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Status tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STATUS_FILTERS.map((f) => {
          const active = statusFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-black transition ${
                active
                  ? "bg-brand-700 text-white shadow-sm dark:bg-brand-600"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-700"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Type pills */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold transition ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "border border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400"
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
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Flag
            size={36}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            لا توجد بلاغات تطابق التصفية
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <ReportRow key={r.id} report={r} />
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
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-black text-slate-700 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 disabled:opacity-60"
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

function ReportRow({ report }: { report: ReportDoc }) {
  const TypeIcon =
    report.targetType === "listing"
      ? ListChecks
      : report.targetType === "comment"
      ? MessageCircle
      : UserIcon;

  return (
    <Link
      href={`/admin/moderation/reports/${report.id}`}
      className="group flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-rose-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:hover:border-rose-700"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <TypeIcon size={16} strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
            {TARGET_TYPE_LABELS[report.targetType]}
          </span>
          <StatusBadge status={report.status} />
        </div>

        <h3 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white">
          {getReasonLabel(report.targetType, report.reason)}
        </h3>

        {report.targetMeta?.title && (
          <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
            {report.targetMeta.title}
          </p>
        )}

        {report.description && (
          <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-slate-600 dark:text-slate-300">
            {report.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
          {report.reporterName && <span>من: {report.reporterName}</span>}
          {report.createdAt && <span>{formatDate(report.createdAt)}</span>}
        </div>
      </div>

      <div className="shrink-0 text-slate-400 transition group-hover:text-rose-600 dark:text-slate-500 dark:group-hover:text-rose-400">
        <ArrowLeft size={16} />
      </div>
    </Link>
  );
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const tones: Record<ReportStatus, { bg: string; icon: any }> = {
    pending: { bg: "bg-amber-500 text-white", icon: Clock },
    reviewing: { bg: "bg-brand-700 text-white", icon: EyeOff },
    resolved: { bg: "bg-emerald-500 text-white", icon: CheckCircle2 },
    dismissed: { bg: "bg-slate-400 text-white", icon: XCircle },
  };
  const t = tones[status];
  const Icon = t.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black ${t.bg}`}
    >
      <Icon size={9} />
      {STATUS_LABELS[status]}
    </span>
  );
}
