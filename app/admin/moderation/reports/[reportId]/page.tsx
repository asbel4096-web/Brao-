"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Flag,
  ListChecks,
  MessageCircle,
  User as UserIcon,
  Trash2,
  Ban,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  getReasonLabel,
  STATUS_LABELS,
  TARGET_TYPE_LABELS,
  RESOLUTIONS,
  type ReportDoc,
  type ResolutionKey,
} from "@/lib/moderation/types";

/**
 * صفحة تفاصيل بلاغ + الإجراءات.
 *
 * يعرض:
 *  - معلومات البلاغ (السبب، الوصف، المُبلِّغ)
 *  - معلومات الـtarget (لو موجود) + رابط لفتحه
 *  - 4 أزرار إجراء: رفض، تحذير، حذف المحتوى، حظر المالك
 *
 * المعالجة عبر POST /api/admin/reports/[reportId]
 */

function formatDate(ts: any): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleString("ar-LY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ReportDetailPage() {
  const params = useParams<{ reportId: string }>();
  const router = useRouter();
  const { can } = useAdminRole();
  const toast = useToast();
  const confirm = useConfirm();

  const [report, setReport] = useState<ReportDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState<ResolutionKey | null>(null);

  const reportId = params?.reportId;

  useEffect(() => {
    if (!reportId) return;
    setLoading(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "reports", reportId));
        if (!snap.exists()) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setReport({ id: snap.id, ...(snap.data() as any) });
        setLoading(false);
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[report-detail] error:", err?.code);
        setLoading(false);
        setNotFound(true);
      }
    })();
  }, [reportId]);

  if (!can("reports.view")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية تفاصيل البلاغ.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <Flag size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
          البلاغ غير موجود
        </p>
        <Link
          href="/admin/moderation/reports"
          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
        >
          العودة للقائمة
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const isPending = report.status === "pending" || report.status === "reviewing";

  // رابط فتح الـtarget
  let targetLink: string | null = null;
  let targetLinkLabel = "فتح المحتوى";
  if (report.targetType === "listing") {
    targetLink = `/listings/${report.targetId}`;
    targetLinkLabel = "فتح الإعلان";
  } else if (report.targetType === "comment" && report.targetMeta?.parentListingId) {
    targetLink = `/listings/${report.targetMeta.parentListingId}`;
    targetLinkLabel = "فتح الإعلان (للتعليق)";
  } else if (report.targetType === "user") {
    targetLink = `/admin/users/${report.targetId}`;
    targetLinkLabel = "فتح ملف المستخدم";
  }

  const handleAction = async (resolution: ResolutionKey) => {
    // confirm messages مخصّصة
    const messages: Record<ResolutionKey, { title: string; msg: string; tone: "danger" | "warning" | "info" }> = {
      dismiss: {
        title: "رفض البلاغ؟",
        msg: "ستوضع علامة 'مرفوض' دون اتخاذ أي إجراء على المحتوى.",
        tone: "info",
      },
      warn: {
        title: "تسجيل تحذير؟",
        msg: "سيُسجَّل البلاغ كمُنجَز مع تحذير (لا إجراء تلقائي حالياً).",
        tone: "warning",
      },
      delete_target: {
        title: "حذف المحتوى المُبلَّغ عنه؟",
        msg:
          report.targetType === "listing"
            ? "سيُؤرشف الإعلان (يختفي من الصفحات العامة)."
            : report.targetType === "comment"
            ? "سيُحذف التعليق نهائياً."
            : "يجب استخدام إجراء آخر للمستخدمين.",
        tone: "danger",
      },
      ban_target_owner: {
        title: "حظر صاحب المحتوى؟",
        msg: "سيُحظر المستخدم وتُؤرشف كل إعلاناته. يمكن إلغاء الحظر لاحقاً.",
        tone: "danger",
      },
    };
    const m = messages[resolution];
    const ok = await confirm({
      title: m.title,
      message: m.msg,
      confirmLabel: "تأكيد",
      tone: m.tone,
    });
    if (!ok) return;

    setBusy(resolution);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        toast.error("يجب تسجيل الدخول");
        return;
      }
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ resolution }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل تنفيذ الإجراء");
        return;
      }
      toast.success("تم تنفيذ الإجراء");
      router.push("/admin/moderation/reports");
    } catch (err: any) {
      toast.error(err?.message || "خطأ غير متوقع");
    } finally {
      setBusy(null);
    }
  };

  const TypeIcon =
    report.targetType === "listing"
      ? ListChecks
      : report.targetType === "comment"
      ? MessageCircle
      : UserIcon;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/moderation/reports"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
      >
        <ArrowRight size={12} />
        العودة للقائمة
      </Link>

      {/* Header */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/40 p-5 dark:border-rose-900/40 dark:bg-rose-900/10">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
            <TypeIcon size={22} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                بلاغ على {TARGET_TYPE_LABELS[report.targetType]}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                  report.status === "pending"
                    ? "bg-amber-500 text-white"
                    : report.status === "resolved"
                    ? "bg-emerald-500 text-white"
                    : report.status === "dismissed"
                    ? "bg-slate-400 text-white"
                    : "bg-brand-700 text-white"
                }`}
              >
                {STATUS_LABELS[report.status]}
              </span>
            </div>
            <h1 className="mt-1 text-lg font-black text-slate-900 dark:text-white">
              {getReasonLabel(report.targetType, report.reason)}
            </h1>
            {report.targetMeta?.title && (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {report.targetMeta.title}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        {report.description && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              تفاصيل المُبلِّغ
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
              {report.description}
            </p>
          </div>
        )}

        {/* Snapshot (comment text لو وُجد) */}
        {report.targetMeta?.snapshot && (
          <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              نص التعليق
            </p>
            <p className="mt-1 text-sm italic text-slate-700 dark:text-slate-200">
              «{report.targetMeta.snapshot}»
            </p>
          </div>
        )}

        {/* Reporter info */}
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
          {report.reporterName && <span>المُبلِّغ: {report.reporterName}</span>}
          {report.reporterEmail && (
            <span dir="ltr">{report.reporterEmail}</span>
          )}
          {report.createdAt && <span>{formatDate(report.createdAt)}</span>}
        </div>

        {/* Resolution info (لو معالَج) */}
        {!isPending && report.resolution && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900/40 dark:bg-emerald-900/20">
            <p className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              الإجراء المتخذ
            </p>
            <p className="mt-1 text-sm font-black text-emerald-900 dark:text-emerald-100">
              {RESOLUTIONS.find((r) => r.key === report.resolution)?.label || report.resolution}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] text-emerald-700 dark:text-emerald-300">
              {report.handledByEmail && <span dir="ltr">بواسطة: {report.handledByEmail}</span>}
              {report.handledAt && <span>{formatDate(report.handledAt)}</span>}
            </div>
          </div>
        )}
      </div>

      {/* Target link */}
      {targetLink && (
        <Link
          href={targetLink}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-sm font-black text-brand-700 transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:text-brand-300"
        >
          <ExternalLink size={14} />
          {targetLinkLabel}
        </Link>
      )}

      {/* Actions */}
      {isPending && can("reports.handle") && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
            الإجراءات
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionBtn
              icon={XCircle}
              label="رفض البلاغ"
              description="لا يوجد مشكلة في المحتوى"
              tone="slate"
              busy={busy === "dismiss"}
              disabled={busy !== null}
              onClick={() => handleAction("dismiss")}
            />
            <ActionBtn
              icon={AlertTriangle}
              label="تحذير"
              description="تسجيل تحذير دون إجراء فوري"
              tone="amber"
              busy={busy === "warn"}
              disabled={busy !== null}
              onClick={() => handleAction("warn")}
            />
            {report.targetType !== "user" && (
              <ActionBtn
                icon={Trash2}
                label={
                  report.targetType === "listing" ? "أرشفة الإعلان" : "حذف التعليق"
                }
                description={
                  report.targetType === "listing"
                    ? "يختفي من الصفحات العامة"
                    : "حذف نهائي للتعليق"
                }
                tone="rose"
                busy={busy === "delete_target"}
                disabled={busy !== null}
                onClick={() => handleAction("delete_target")}
              />
            )}
            <ActionBtn
              icon={Ban}
              label="حظر صاحب المحتوى"
              description="حظر المستخدم + أرشفة كل إعلاناته"
              tone="rose"
              busy={busy === "ban_target_owner"}
              disabled={busy !== null}
              onClick={() => handleAction("ban_target_owner")}
            />
          </div>
        </section>
      )}

      {/* Meta */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-[11px] dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-2 font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          معلومات تقنية
        </h3>
        <dl className="space-y-1.5 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between gap-2">
            <dt>معرّف البلاغ</dt>
            <dd className="truncate font-mono text-[10px]" dir="ltr">
              {report.id}
            </dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt>معرّف الـtarget</dt>
            <dd className="truncate font-mono text-[10px]" dir="ltr">
              {report.targetId}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function ActionBtn({
  icon: Icon,
  label,
  description,
  tone,
  busy,
  disabled,
  onClick,
}: {
  icon: any;
  label: string;
  description: string;
  tone: "slate" | "amber" | "rose";
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const tones = {
    slate: { icon: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", hover: "hover:border-slate-400" },
    amber: { icon: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300", hover: "hover:border-amber-300" },
    rose: { icon: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300", hover: "hover:border-rose-300" },
  };
  const t = tones[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-right transition ${t.hover} dark:border-slate-800 dark:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50 enabled:active:scale-[0.99]`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.icon}`}>
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <Icon size={16} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-slate-900 dark:text-white">{label}</p>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </button>
  );
}
