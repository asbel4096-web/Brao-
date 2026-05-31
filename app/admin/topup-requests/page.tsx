"use client";

import { useState } from "react";
import {
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Coins,
  Phone,
  Send,
  X,
  Check,
  ArrowUpRight,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useAdminTopupRequests } from "@/hooks/wallet/use-topup-requests";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  TOPUP_STATUS_META,
  type TopupRequest,
  type TopupStatus,
} from "@/lib/wallet/topup";
import { formatBC } from "@/lib/wallet/types";
import Link from "next/link";

/**
 * Admin dashboard لطلبات الشحن.
 *
 * 4 tabs: قيد المراجعة (default) / موافق عليها / مرفوضة / الكل
 * كل طلب يُعرض كبطاقة موسَّعة مع أزرار الموافقة والرفض المباشرة.
 */

const TABS: { key: TopupStatus | "all"; label: string; icon: any }[] = [
  { key: "pending", label: "قيد المراجعة", icon: Clock },
  { key: "approved", label: "موافق عليها", icon: CheckCircle2 },
  { key: "rejected", label: "مرفوضة", icon: XCircle },
  { key: "all", label: "الكل", icon: CreditCard },
];

export default function AdminTopupRequestsPage() {
  const { can } = useAdminRole();
  const [tab, setTab] = useState<TopupStatus | "all">("pending");
  const { requests, loading, stats } = useAdminTopupRequests(tab);
  const [rejectDialog, setRejectDialog] = useState<TopupRequest | null>(null);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة طلبات الشحن.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <CreditCard size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            طلبات الشحن
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            {stats.pending} قيد المراجعة · {stats.approved} موافق عليها
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox
          label="قيد المراجعة"
          value={String(stats.pending)}
          icon={Clock}
          tone="amber"
          highlight={stats.pending > 0}
        />
        <StatBox
          label="موافق عليها"
          value={String(stats.approved)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatBox
          label="مرفوضة"
          value={String(stats.rejected)}
          icon={XCircle}
          tone="rose"
        />
        <StatBox
          label="إجمالي المشحون"
          value={formatBC(stats.totalApproved)}
          icon={Coins}
          tone="brand"
        />
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`
                shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-black transition
                ${active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }
              `}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <CreditCard
            size={36}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            {tab === "pending"
              ? "لا توجد طلبات قيد المراجعة"
              : "لا توجد طلبات في هذه الفئة"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={r.id}
              req={r}
              onReject={() => setRejectDialog(r)}
            />
          ))}
        </div>
      )}

      {rejectDialog && (
        <RejectDialog
          request={rejectDialog}
          onClose={() => setRejectDialog(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Request Card
// ============================================================
function RequestCard({
  req,
  onReject,
}: {
  req: TopupRequest;
  onReject: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [approving, setApproving] = useState(false);
  const isPending = req.status === "pending";
  const meta = TOPUP_STATUS_META[req.status];

  const handleApprove = async () => {
    const ok = await confirm({
      title: `الموافقة على شحن ${formatBC(req.amount)}؟`,
      message: `سيُضاف المبلغ فوراً لرصيد ${req.userName || req.userEmail}.`,
      confirmLabel: "موافقة",
      tone: "info",
    });
    if (!ok) return;

    setApproving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/topup/${req.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشلت الموافقة");
        return;
      }
      toast.success(
        `تمت الإضافة. الرصيد الجديد: ${formatBC(data.balanceAfter)}`
      );
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setApproving(false);
    }
  };

  const date = req.createdAt?.toMillis?.()
    ? new Date(req.createdAt.toMillis()).toLocaleString("ar-LY", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <article
      className={`rounded-2xl border bg-white p-4 dark:bg-slate-900 ${
        isPending
          ? "border-amber-200 dark:border-amber-900/40"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${
            req.status === "approved"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
              : req.status === "rejected"
              ? "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
              : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
          }`}
        >
          {req.status === "approved" ? (
            <CheckCircle2 size={20} />
          ) : req.status === "rejected" ? (
            <XCircle size={20} />
          ) : (
            <Clock size={20} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-xl font-black tabular-nums text-slate-900 dark:text-white">
              {formatBC(req.amount)}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                req.status === "approved"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : req.status === "rejected"
                  ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {meta.label}
            </span>
          </div>
          <Link
            href={`/admin/wallet/${req.userId}`}
            className="mt-0.5 inline-flex items-center gap-1 truncate text-[12px] font-black text-brand-700 hover:underline dark:text-brand-300"
          >
            {req.userName || req.userEmail || req.userId.slice(0, 10)}
            <ArrowUpRight size={11} />
          </Link>
          <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
            {date}
          </p>
        </div>
      </div>

      {/* Details grid */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">
            طريقة الدفع
          </p>
          <p className="mt-0.5 text-[12px] font-black text-slate-700 dark:text-slate-200">
            {req.paymentMethodLabel || req.paymentMethod}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">
            رقم التواصل
          </p>
          <a
            href={`tel:${req.contactNumber}`}
            className="mt-0.5 inline-flex items-center gap-1 font-mono text-[12px] font-black text-brand-700 hover:underline dark:text-brand-300"
            dir="ltr"
          >
            <Phone size={10} />
            {req.contactNumber}
          </a>
        </div>
      </div>

      {/* User note */}
      {req.note && (
        <div className="mt-2 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/50">
          <p className="text-[10px] font-black uppercase text-slate-400">
            ملاحظة المستخدم
          </p>
          <p className="mt-0.5 text-[12px] leading-5 text-slate-700 dark:text-slate-200">
            «{req.note}»
          </p>
        </div>
      )}

      {/* Admin reviewer info */}
      {!isPending && req.reviewedByEmail && (
        <p className="mt-2 text-[10px] text-slate-400 dark:text-slate-500">
          روجعت بواسطة <span dir="ltr">{req.reviewedByEmail}</span>
          {req.reviewNote && (
            <span className="mt-1 block rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              {req.status === "rejected" ? "السبب: " : "ملاحظة: "}
              {req.reviewNote}
            </span>
          )}
        </p>
      )}

      {/* Actions */}
      {isPending && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReject}
            disabled={approving}
            className="
              inline-flex items-center justify-center gap-1.5 rounded-2xl
              border border-rose-300 bg-rose-50 px-4 py-2.5 text-xs font-black
              text-rose-700 transition hover:bg-rose-100 active:scale-95
              disabled:opacity-50
              dark:bg-rose-900/20 dark:text-rose-300
            "
          >
            <XCircle size={14} />
            رفض
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={approving}
            className="
              inline-flex items-center justify-center gap-1.5 rounded-2xl
              bg-emerald-600 px-4 py-2.5 text-xs font-black text-white
              shadow-sm transition hover:bg-emerald-700 active:scale-95
              disabled:opacity-50
            "
          >
            {approving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              <>
                <Check size={14} />
                موافقة
              </>
            )}
          </button>
        </div>
      )}
    </article>
  );
}

// ============================================================
// Reject Dialog
// ============================================================
function RejectDialog({
  request,
  onClose,
}: {
  request: TopupRequest;
  onClose: () => void;
}) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim() || reason.trim().length < 3) {
      toast.warning("اكتب سبب الرفض");
      return;
    }
    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/topup/${request.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل الرفض");
        return;
      }
      toast.success("تم رفض الطلب وإشعار المستخدم");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              رفض طلب الشحن؟
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {formatBC(request.amount)} ·{" "}
              {request.userName || request.userEmail}
            </p>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
            سبب الرفض (يُرسَل للمستخدم)
          </label>
          <textarea
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={busy}
            placeholder="مثلاً: لم يتم تأكيد الدفع، رقم تواصل غير صحيح، ..."
            className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            تراجع
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !reason.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-rose-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              <>
                <Send size={12} />
                تأكيد الرفض
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Stat Box
// ============================================================
function StatBox({
  label,
  value,
  icon: Icon,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  icon: any;
  tone: "amber" | "emerald" | "rose" | "brand";
  highlight?: boolean;
}) {
  const tones: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300",
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300",
  };
  return (
    <div
      className={`rounded-2xl border bg-white p-3 dark:bg-slate-900 ${
        highlight
          ? "border-amber-300 ring-1 ring-amber-200 dark:border-amber-700 dark:ring-amber-900/40"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
