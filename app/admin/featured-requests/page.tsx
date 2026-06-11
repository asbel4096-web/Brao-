"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Timestamp,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { formatDateTime } from "@/lib/utils";
import type { FeaturedRequest } from "@/lib/types";

type StatusFilter = "pending" | "approved" | "rejected" | "all";
const DURATION_OPTIONS = [3, 7, 14] as const;
type Duration = (typeof DURATION_OPTIONS)[number];

/**
 * صفحة الأدمن: مراجعة طلبات تمييز الإعلانات.
 * تدفّق العمل:
 *  1) جلب الطلبات في realtime (الأدمن يحتاج تحديث فوري).
 *  2) فلتر حسب الحالة.
 *  3) موافقة → اختيار مدة (3/7/14) → تحديث الإعلان نفسه بـfeatured=true.
 *  4) رفض → فقط تحديث الطلب بـstatus="rejected" (الإعلان لا يتغيّر).
 */
export default function AdminFeaturedRequestsPage() {
  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [requests, setRequests] = useState<(FeaturedRequest & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("pending");

  // مودال اختيار المدة عند الموافقة.
  const [approveTarget, setApproveTarget] = useState<
    (FeaturedRequest & { id: string }) | null
  >(null);
  const [duration, setDuration] = useState<Duration>(7);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const qRef = query(
      collection(db, "featuredRequests"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setRequests(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "تعذّر تحميل الطلبات.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [toast]);

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  const counts = useMemo(
    () => ({
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      rejected: requests.filter((r) => r.status === "rejected").length,
      all: requests.length,
    }),
    [requests]
  );

  const handleApprove = async () => {
    if (!approveTarget || !profile) return;
    setSubmitting(true);
    try {
      // 1) تحديث الإعلان نفسه - يضع featured=true ومدّة الانتهاء.
      const untilMs = Date.now() + duration * 24 * 60 * 60 * 1000;
      await updateDoc(doc(db, "listings", approveTarget.listingId), {
        featured: true,
        featuredAt: serverTimestamp(),
        featuredUntil: Timestamp.fromMillis(untilMs),
        featuredBy: profile.uid,
      });

      // 2) تحديث وثيقة الطلب - status="approved" + المدة المختارة.
      await updateDoc(doc(db, "featuredRequests", approveTarget.id), {
        status: "approved",
        durationDays: duration,
        reviewedBy: profile.uid,
        reviewedAt: serverTimestamp(),
      });

      toast.success(`تمت الموافقة على التمييز لمدة ${duration} أيام.`);
      setApproveTarget(null);
      setDuration(7);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر الموافقة على الطلب.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async (req: FeaturedRequest & { id: string }) => {
    if (!profile) return;
    const ok = await confirm({
      title: "رفض طلب التمييز؟",
      message: `سيتم رفض طلب تمييز "${req.listingTitle || "هذا الإعلان"}". يمكن للمستخدم إرسال طلب جديد لاحقاً.`,
      confirmLabel: "رفض",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await updateDoc(doc(db, "featuredRequests", req.id), {
        status: "rejected",
        reviewedBy: profile.uid,
        reviewedAt: serverTimestamp(),
      });
      toast.success("تم رفض الطلب.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر رفض الطلب.");
    }
  };

  if (authLoading) {
    return (
      <div className="container py-10 text-center text-slate-500">
        جارٍ التحميل...
      </div>
    );
  }

  if (!profile?.isAdmin) {
    return (
      <div className="container py-10 text-center text-slate-500">
        لا تملك صلاحية الوصول إلى هذه الصفحة.
      </div>
    );
  }

  return (
    <section className="container py-4 pb-24 sm:py-6">
      {/* العنوان */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
          <Sparkles size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            طلبات تمييز الإعلانات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            مراجعة طلبات المستخدمين لتمييز إعلاناتهم.
          </p>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="mb-4 flex flex-wrap gap-2">
        <FilterChip
          label="قيد المراجعة"
          count={counts.pending}
          active={filter === "pending"}
          onClick={() => setFilter("pending")}
        />
        <FilterChip
          label="مقبول"
          count={counts.approved}
          active={filter === "approved"}
          onClick={() => setFilter("approved")}
        />
        <FilterChip
          label="مرفوض"
          count={counts.rejected}
          active={filter === "rejected"}
          onClick={() => setFilter("rejected")}
        />
        <FilterChip
          label="الكل"
          count={counts.all}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="card p-8 text-center text-slate-500">
          جارٍ تحميل الطلبات...
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            لا توجد طلبات في هذا التصنيف.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((req) => (
            <RequestRow
              key={req.id}
              request={req}
              onApprove={() => setApproveTarget(req)}
              onReject={() => handleReject(req)}
            />
          ))}
        </div>
      )}

      {/* مودال الموافقة - اختيار مدة */}
      {approveTarget && (
        <ApproveModal
          request={approveTarget}
          duration={duration}
          submitting={submitting}
          onDurationChange={setDuration}
          onConfirm={() => void handleApprove()}
          onClose={() => {
            setApproveTarget(null);
            setDuration(7);
          }}
        />
      )}
    </section>
  );
}

/* ============================================================
 * FilterChip
 * ============================================================ */
function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black transition ${
        active
          ? "bg-brand-700 text-white shadow-blue"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {label}
      <span
        className={`inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
          active
            ? "bg-white/20 text-white"
            : "bg-white text-slate-600 dark:bg-slate-900 dark:text-slate-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

/* ============================================================
 * RequestRow - صف طلب واحد.
 * ============================================================ */
function RequestRow({
  request,
  onApprove,
  onReject,
}: {
  request: FeaturedRequest & { id: string };
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = request.status === "pending";
  const isApproved = request.status === "approved";
  const isRejected = request.status === "rejected";

  return (
    <div className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      {/* المعلومات */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/listings/${request.listingId}`}
            target="_blank"
            rel="noreferrer"
            className="group flex min-w-0 items-center gap-1.5"
          >
            <h3 className="truncate text-sm font-black text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-300">
              {request.listingTitle || "إعلان بدون عنوان"}
            </h3>
            <ExternalLink
              size={12}
              className="shrink-0 text-slate-400 group-hover:text-brand-700 dark:group-hover:text-brand-300"
            />
          </Link>
          <StatusBadge status={request.status} />
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {request.ownerName && <span>{request.ownerName}</span>}
          {request.ownerEmail && (
            <>
              <span aria-hidden="true">·</span>
              <span dir="ltr">{request.ownerEmail}</span>
            </>
          )}
          {request.createdAt && (
            <>
              <span aria-hidden="true">·</span>
              <span>{formatDateTime(request.createdAt as any)}</span>
            </>
          )}
          {isApproved && request.durationDays && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-black text-action-700 dark:text-action-300">
                {request.durationDays} أيام
              </span>
            </>
          )}
        </div>
      </div>

      {/* أزرار العمليات */}
      {isPending ? (
        <div className="flex gap-2 sm:shrink-0">
          <button
            type="button"
            onClick={onApprove}
            className="
              inline-flex h-9 flex-1 items-center justify-center gap-1
              rounded-2xl bg-emerald-600 px-3 text-xs font-black text-white
              transition hover:bg-emerald-700 active:scale-95 sm:flex-none
            "
          >
            <CheckCircle2 size={14} />
            موافقة
          </button>
          <button
            type="button"
            onClick={onReject}
            className="
              inline-flex h-9 flex-1 items-center justify-center gap-1
              rounded-2xl border border-rose-200 bg-white px-3 text-xs
              font-black text-rose-600 transition hover:bg-rose-50
              active:scale-95
              dark:border-rose-900/40 dark:bg-slate-900 dark:hover:bg-rose-900/20
              sm:flex-none
            "
          >
            <XCircle size={14} />
            رفض
          </button>
        </div>
      ) : null}
    </div>
  );
}

/* ============================================================
 * StatusBadge - شارة الحالة المُلوّنة.
 * ============================================================ */
function StatusBadge({ status }: { status: FeaturedRequest["status"] }) {
  if (status === "pending") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <Clock size={10} />
        قيد المراجعة
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
        <CheckCircle2 size={10} />
        مقبول
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-black text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
      <XCircle size={10} />
      مرفوض
    </span>
  );
}

/* ============================================================
 * ApproveModal - اختيار مدة الإبراز عند الموافقة.
 * ============================================================ */
function ApproveModal({
  request,
  duration,
  submitting,
  onDurationChange,
  onConfirm,
  onClose,
}: {
  request: FeaturedRequest & { id: string };
  duration: Duration;
  submitting: boolean;
  onDurationChange: (d: Duration) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-md rounded-t-3xl bg-white p-5
          dark:bg-slate-900
          sm:rounded-3xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              الموافقة على التمييز
            </h2>
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {request.listingTitle || "إعلان بدون عنوان"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-black text-slate-700 dark:text-slate-200">
            اختر مدة التمييز
          </label>
          <div className="grid grid-cols-3 gap-2">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onDurationChange(opt)}
                className={`rounded-2xl border p-3 text-center text-sm font-black transition ${
                  duration === opt
                    ? "border-brand-700 bg-brand-50 text-brand-700 dark:border-brand-300 dark:bg-brand-900/30 dark:text-brand-300"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {opt} أيام
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 text-sm font-black text-white shadow-blue transition active:scale-95 hover:bg-brand-600 disabled:opacity-60"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            تأكيد التمييز
          </button>
        </div>
      </div>
    </div>
  );
}
