"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  Gift,
  X,
  Send,
  Sparkles,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  VERIFICATION_PLANS,
  type VerificationPlanKey,
} from "@/lib/wallet/types";
import {
  daysUntilExpiry,
  findPlan,
  formatRemainingDays,
  isVerifiedNow,
  type VerificationStatus,
} from "@/lib/wallet/verification";

/**
 * تفاصيل اشتراك توثيق لمستخدم.
 *
 * actions:
 *  - منح توثيق مجاني (any plan, any duration)
 *  - تمديد (نفس الخطة، مدّة إضافية)
 *  - إلغاء (مع/بدون استرداد)
 */

interface UserDoc {
  id: string;
  businessName?: string;
  name?: string;
  email?: string;
  phone?: string;
  balance?: number;
  verifiedUntil?: any;
  verificationPlan?: VerificationPlanKey;
  verificationStatus?: VerificationStatus;
  verifiedSince?: any;
}

export default function AdminSubscriptionDetailPage() {
  const params = useParams<{ uid: string }>();
  const uid = params?.uid;
  const { can } = useAdminRole();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"grant" | "cancel" | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...(snap.data() as any) } as UserDoc);
        }
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة الاشتراكات.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-black text-slate-700">المستخدم غير موجود</p>
      </div>
    );
  }

  const isActive = isVerifiedNow(user);
  const days = daysUntilExpiry(user);
  const plan = user.verificationPlan ? findPlan(user.verificationPlan) : null;
  const expiresDate = user.verifiedUntil?.toMillis?.()
    ? new Date(user.verifiedUntil.toMillis()).toLocaleDateString("ar-LY", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="space-y-4">
      <Link
        href="/admin/subscriptions"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-700 dark:text-slate-400"
      >
        <ArrowRight size={12} />
        العودة للقائمة
      </Link>

      {/* User card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-white ${
              isActive
                ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                : "bg-slate-400 dark:bg-slate-700"
            }`}
          >
            {(user.businessName || user.name || user.email || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="truncate text-lg font-black text-slate-900 dark:text-white">
                {user.businessName || user.name || user.email || user.id}
              </h1>
              {isActive && (
                <BadgeCheck size={18} className="shrink-0 text-emerald-500" />
              )}
            </div>
            {user.email && (
              <p
                className="truncate text-[12px] text-slate-500 dark:text-slate-400"
                dir="ltr"
              >
                {user.email}
              </p>
            )}
            <p
              className="mt-0.5 truncate font-mono text-[9px] text-slate-400"
              dir="ltr"
            >
              {user.id}
            </p>
          </div>
        </div>
      </div>

      {/* Status card */}
      <div
        className={`relative overflow-hidden rounded-3xl p-5 shadow-xl ${
          isActive
            ? "bg-gradient-to-br from-emerald-600 to-emerald-700"
            : "bg-gradient-to-br from-slate-700 to-slate-800"
        }`}
      >
        <div className="absolute -right-4 -top-4 opacity-20">
          {isActive ? (
            <BadgeCheck size={120} className="text-white" />
          ) : (
            <XCircle size={120} className="text-white" />
          )}
        </div>

        <p className="text-[11px] font-bold text-white/80">حالة التوثيق</p>
        <div className="mt-2 flex items-center gap-2">
          {isActive ? (
            <CheckCircle2 size={20} className="text-white" />
          ) : (
            <XCircle size={20} className="text-white" />
          )}
          <p className="text-xl font-black text-white">
            {!user.verificationStatus
              ? "غير موثَّق"
              : user.verificationStatus === "active"
              ? "نشط"
              : user.verificationStatus === "granted"
              ? "نشط (مجاني)"
              : user.verificationStatus === "expired"
              ? "منتهي"
              : "ملغى"}
          </p>
        </div>

        {plan && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-3 backdrop-blur-sm">
            <div>
              <p className="text-[10px] text-white/70">الخطة</p>
              <p className="mt-0.5 text-sm font-black text-white">
                {plan.label}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/70">الباقي</p>
              <p className="mt-0.5 text-sm font-black text-white">
                {formatRemainingDays(days)}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-white/70">ينتهي في</p>
              <p className="mt-0.5 text-sm font-black text-white">{expiresDate}</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDialog("grant")}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-emerald-500 bg-emerald-50 px-4 py-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 active:scale-95 dark:bg-emerald-900/20 dark:text-emerald-300"
        >
          <Gift size={14} />
          {isActive ? "تمديد / منح" : "إعطاء توثيق مجاني"}
        </button>
        <button
          type="button"
          onClick={() => setDialog("cancel")}
          disabled={!isActive}
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-black text-rose-700 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-900/20 dark:text-rose-300"
        >
          <XCircle size={14} />
          إلغاء الاشتراك
        </button>
      </div>

      {/* Quick info */}
      {user.verifiedSince && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400">
            <Calendar size={14} />
            <span>
              مشترك منذ:{" "}
              {new Date(user.verifiedSince.toMillis()).toLocaleDateString(
                "ar-LY",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}
            </span>
          </div>
        </div>
      )}

      {dialog === "grant" && (
        <GrantDialog uid={user.id} onClose={() => setDialog(null)} />
      )}
      {dialog === "cancel" && (
        <CancelDialog uid={user.id} onClose={() => setDialog(null)} />
      )}
    </div>
  );
}

// ============================================================
// Grant Dialog
// ============================================================
function GrantDialog({ uid, onClose }: { uid: string; onClose: () => void }) {
  const toast = useToast();
  const [plan, setPlan] = useState<VerificationPlanKey>("basic");
  const [days, setDays] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const customDays = days.trim() ? Number(days) : undefined;
    if (customDays !== undefined && (!Number.isFinite(customDays) || customDays <= 0)) {
      toast.warning("عدد أيام غير صالح");
      return;
    }

    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/subscriptions/${uid}/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          plan,
          days: customDays,
          reason: reason.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل المنح");
        return;
      }
      toast.success(data.extended ? "تم تمديد التوثيق" : "تم منح التوثيق");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setBusy(false);
    }
  };

  const planObj = findPlan(plan);

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
              منح توثيق مجاني
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              لا يخصم رصيد، يُسجّل كـ"granted"
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

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              الخطة
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as VerificationPlanKey)}
              disabled={busy}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
            >
              {VERIFICATION_PLANS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label} ({p.durationDays} يوم)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              عدد الأيام (اختياري)
            </label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              disabled={busy}
              placeholder={`الافتراضي: ${planObj?.durationDays || 30} يوم`}
              dir="ltr"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
            />
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              اتركيه فاضياً لاستخدام مدّة الخطة الافتراضية
            </p>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              السبب
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              placeholder="مثلاً: شريك مميز، حملة ترويجية..."
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              <>
                <Send size={12} />
                منح
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Cancel Dialog
// ============================================================
function CancelDialog({ uid, onClose }: { uid: string; onClose: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const [refund, setRefund] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/subscriptions/${uid}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          reason: reason.trim() || undefined,
          refund,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل الإلغاء");
        return;
      }
      toast.success(
        data.refunded
          ? `تم الإلغاء واسترداد ${data.refundAmount} BC`
          : "تم إلغاء الاشتراك"
      );
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
              إلغاء الاشتراك؟
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              ستختفي شارة التوثيق فوراً
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

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              السبب
            </label>
            <textarea
              rows={2}
              maxLength={300}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              placeholder="مثلاً: مخالفة شروط، طلب المستخدم..."
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/50">
            <input
              type="checkbox"
              checked={refund}
              onChange={(e) => setRefund(e.target.checked)}
              disabled={busy}
              className="h-4 w-4 cursor-pointer rounded text-rose-600"
            />
            <div className="flex-1">
              <p className="text-xs font-black text-slate-900 dark:text-white">
                استرداد الرصيد
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                يعيد BC المخصومة من آخر عملية شراء
              </p>
            </div>
          </label>
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
            disabled={busy}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-rose-600 px-4 text-xs font-black text-white shadow-sm transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              "تأكيد الإلغاء"
            )}
          </button>
        </div>
      </div>
    </>
  );
}
