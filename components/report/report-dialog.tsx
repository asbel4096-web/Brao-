"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getReasonsFor,
  TARGET_TYPE_LABELS,
  type ReportTargetType,
} from "@/lib/moderation/types";

/**
 * Dialog إبلاغ يستخدمه أي مستخدم (في الموقع العام).
 *
 * Flow:
 *  1. المستخدم يضغط زر "إبلاغ" (موجود في الإعلان/التعليق/المستخدم).
 *  2. يفتح الـdialog مع reasons محدّدة حسب الـtargetType.
 *  3. يختار سبب + يكتب تفاصيل اختيارية.
 *  4. عند الإرسال: يُكتب وثيقة في reports/{id} مع status="pending".
 *  5. Toast نجاح. الأدمن يراه في `/admin/moderation/reports`.
 *
 * حماية ضد الإسبام:
 *  - يجب تسجيل دخول (الـrules تتحقق)
 *  - الـrules تمنع إعادة إرسال بلاغ على نفس الـtarget (تُنفَّذ في dialog)
 *
 * Note: لا فحص client-side لـduplicates. الـrules فحسب. لو الأدمن يرى
 * تكرار بلاغات، هذا مؤشّر مفيد على شعبية المشكلة.
 */

interface Props {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  /** بيانات وصفية اختيارية (تظهر للأدمن، تساعد في المراجعة). */
  targetMeta?: {
    title?: string;
    ownerId?: string;
    parentListingId?: string;
    snapshot?: string;
  };
}

export function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  targetMeta,
}: Props) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const reasons = getReasonsFor(targetType);
  const targetLabel = TARGET_TYPE_LABELS[targetType];

  const handleSubmit = async () => {
    if (!user) {
      toast.warning("يجب تسجيل الدخول للإبلاغ.");
      return;
    }
    if (!reason) {
      toast.warning("اختر سبب الإبلاغ.");
      return;
    }
    if (user.uid === targetMeta?.ownerId) {
      toast.warning("لا يمكنك الإبلاغ على محتواك الخاص.");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "reports"), {
        reporterId: user.uid,
        reporterEmail: profile?.email || "",
        reporterName: profile?.name || "",
        targetType,
        targetId,
        targetMeta: targetMeta || {},
        reason,
        description: description.trim().slice(0, 500),
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast.success("تم إرسال البلاغ. سيراجعه فريق الإدارة.");
      // إعادة تعيين النموذج وإغلاق
      setReason("");
      setDescription("");
      onClose();
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[report] submit failed:", err?.code, err?.message);
      toast.error("تعذّر إرسال البلاغ. حاول مجدداً.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="
          fixed inset-x-4 top-1/2 z-[60] mx-auto max-w-md -translate-y-1/2
          max-h-[90vh] overflow-y-auto
          rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl
          dark:border-slate-800 dark:bg-slate-950
        "
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <Flag size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              الإبلاغ عن {targetLabel}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              ساعدنا في الحفاظ على بيئة آمنة. سيُراجع فريق الإدارة بلاغك بسرعة.
            </p>
          </div>
          {!submitting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="
                grid h-7 w-7 place-items-center rounded-lg text-slate-400
                transition hover:bg-slate-100 hover:text-slate-700
                dark:hover:bg-slate-800
              "
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Reasons */}
        <div className="space-y-1.5">
          <p className="text-xs font-black text-slate-700 dark:text-slate-300">
            سبب الإبلاغ
          </p>
          {reasons.map((r) => (
            <label
              key={r.key}
              className={`
                flex cursor-pointer items-start gap-2.5 rounded-2xl border p-2.5 transition
                ${reason === r.key
                  ? "border-rose-400 bg-rose-50/60 dark:border-rose-600 dark:bg-rose-900/20"
                  : "border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700"
                }
              `}
            >
              <input
                type="radio"
                name="reason"
                value={r.key}
                checked={reason === r.key}
                onChange={() => setReason(r.key)}
                disabled={submitting}
                className="mt-1 h-3.5 w-3.5 accent-rose-600"
              />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {r.label}
                </span>
                {r.description && (
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {r.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Description */}
        <div className="mt-4">
          <label htmlFor="report-desc" className="block text-xs font-black text-slate-700 dark:text-slate-300">
            تفاصيل إضافية (اختياري)
          </label>
          <textarea
            id="report-desc"
            rows={3}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            placeholder="اشرح المشكلة بمزيد من التفصيل..."
            className="
              mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white
              px-3 py-2 text-sm outline-none transition focus:border-rose-400
              dark:border-slate-700 dark:bg-slate-900
              disabled:opacity-60
            "
          />
          <div className="mt-1 text-end text-[10px] text-slate-400">
            {description.length}/500
          </div>
        </div>

        {/* Submit */}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="
              h-10 rounded-2xl border border-slate-200 px-4 text-xs font-black
              text-slate-700 transition hover:bg-slate-50
              dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800
              disabled:opacity-60
            "
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !reason}
            className="
              inline-flex h-10 items-center gap-1.5 rounded-2xl bg-rose-600 px-4
              text-xs font-black text-white shadow-sm transition
              hover:bg-rose-700 active:scale-95
              disabled:opacity-60
            "
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ الإرسال...
              </>
            ) : (
              <>
                <Flag size={14} />
                إرسال البلاغ
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
