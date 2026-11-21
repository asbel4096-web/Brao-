"use client";

import { useEffect, useState } from "react";
import { CirclePause, CirclePlay, Crown, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import {
  CONTENT_NOUN,
  MODERATION_REASONS,
  type ContentType,
  type ModAction,
} from "@/lib/moderation/content";
import {
  describeModerationError,
  moderateContent,
  moderationSuccessMessage,
  type ModerateContentInput,
  type ModerateContentResult,
} from "@/lib/moderation/moderate-content";

/**
 * حوار إجراء «إدارة المحتوى» (حذف قابل للاستعادة / إيقاف مؤقت / استعادة / استئناف) مع السبب.
 * يستدعي moderateContent، ويعرض أخطاء الخادم بالعربية، ويحمي المحتوى المدفوع:
 * الحذف يتطلّب تأكيداً صريحاً (confirmPaid)، والمشرف (moderator) يُنصح بالإيقاف المؤقت.
 * مستخدم في /admin/content وفي صفحات الإدارة القديمة (الإعلانات/القصص/المنشورات).
 */

export interface ModerationTarget {
  type: ContentType;
  id: string;
  title: string;
  /** نفس شرط الخادم isPaidContent — يُكتشف أيضاً من رد الخادم (paid-content). */
  paid: boolean;
}

interface Props {
  target: ModerationTarget;
  action: ModAction;
  reportId?: string | null;
  onClose: () => void;
  onDone: (result: ModerateContentResult) => void;
}

const META: Record<ModAction, { title: (noun: string) => string; Icon: typeof Trash2; iconCls: string; btn: string; cta: string }> = {
  remove: {
    title: (n) => `حذف ${n} (قابل للاستعادة)`,
    Icon: Trash2,
    iconCls: "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300",
    btn: "bg-rose-600 hover:bg-rose-700",
    cta: "حذف",
  },
  pause: {
    title: (n) => `إيقاف ${n} مؤقتاً`,
    Icon: CirclePause,
    iconCls: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300",
    btn: "bg-amber-500 hover:bg-amber-600",
    cta: "إيقاف مؤقت",
  },
  restore: {
    title: (n) => `استعادة ${n}`,
    Icon: RotateCcw,
    iconCls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    cta: "استعادة",
  },
  resume: {
    title: (n) => `استئناف ${n}`,
    Icon: CirclePlay,
    iconCls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300",
    btn: "bg-emerald-600 hover:bg-emerald-700",
    cta: "استئناف",
  },
};

function explain(type: ContentType, action: ModAction): string {
  switch (action) {
    case "remove":
      return type === "story"
        ? "تختفي القصة فوراً من التطبيق والموقع، وتبقى محفوظة ويمكن استعادتها لاحقاً بالمدة التي كانت متبقية لها."
        : "يختفي المحتوى فوراً من التطبيق والموقع، ويبقى محفوظاً ويمكن استعادته لاحقاً من «إدارة المحتوى».";
    case "pause":
      return "يُخفى المحتوى مؤقتاً عن العموم حتى تستأنفه. أي مدة ترويج مدفوعة تتجمّد وتُعاد كاملة عند الاستئناف.";
    case "restore":
      return "يعود المحتوى إلى حالته قبل الحذف، وتُعاد المدة المدفوعة المتبقية (إن وُجدت).";
    default:
      return "يعود المحتوى للظهور بحالته السابقة، وتُعاد المدة المدفوعة المجمّدة.";
  }
}

export function ModerationActionDialog({ target, action: initialAction, reportId, onClose, onDone }: Props) {
  const { role } = useAdminRole();
  const toast = useToast();
  const [action, setAction] = useState<ModAction>(initialAction);
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [paidMode, setPaidMode] = useState(target.paid);
  const [confirmPaid, setConfirmPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsReason = action === "remove" || action === "pause";
  const paidRemove = action === "remove" && paidMode;
  const moderatorBlocked = paidRemove && role === "moderator";
  const noun = CONTENT_NOUN[target.type];
  const meta = META[action];

  // قفل التمرير + ESC للإغلاق.
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  const submit = async () => {
    setError(null);
    const trimmed = note.trim();
    if (needsReason && !reasonCode) {
      setError("اختر سبب الإجراء.");
      return;
    }
    if (needsReason && reasonCode === "other" && trimmed.length < 3) {
      setError("اكتب السبب في الملاحظة عند اختيار «سبب آخر» (3 أحرف على الأقل).");
      return;
    }
    if (paidRemove && !confirmPaid) {
      setError("أكّد حذف المحتوى المدفوع، أو استخدم الإيقاف المؤقت.");
      return;
    }
    const input: ModerateContentInput = {
      contentType: target.type,
      contentId: target.id,
      action,
      notifyOwner: notify,
      ...(needsReason ? { reasonCode } : {}),
      ...(trimmed ? { note: trimmed } : {}),
      ...(paidRemove && confirmPaid ? { confirmPaid: true } : {}),
      ...(reportId ? { reportId } : {}),
    };
    setBusy(true);
    try {
      const res = await moderateContent(input);
      toast.success(moderationSuccessMessage(target.type, res, !!reportId));
      onDone(res);
    } catch (e) {
      const d = describeModerationError(e);
      if (d.kind === "paid-content") {
        setPaidMode(true);
        setConfirmPaid(false);
      }
      setError(d.message);
    } finally {
      setBusy(false);
    }
  };

  const Icon = meta.Icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mod-dialog-title"
      dir="rtl"
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={busy ? undefined : onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* الرأس */}
        <div className="flex items-start gap-3 border-b border-slate-100 p-5 dark:border-slate-800">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${meta.iconCls}`}>
            <Icon size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="mod-dialog-title" className="text-base font-black text-slate-900 dark:text-white">
              {meta.title(noun)}
            </h2>
            <p className="mt-0.5 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{target.title}</p>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-[13px] leading-6 text-slate-600 dark:text-slate-300">{explain(target.type, action)}</p>

          {reportId && (
            <p className="rounded-2xl bg-brand-50 px-3 py-2 text-[12px] font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              سيُغلق البلاغ المرتبط تلقائياً بعد تنفيذ الإجراء.
            </p>
          )}

          {needsReason && (
            <div>
              <p className="mb-2 text-xs font-black text-slate-700 dark:text-slate-300">السبب (مطلوب)</p>
              <div className="flex flex-wrap gap-2">
                {MODERATION_REASONS.map((r) => (
                  <button
                    key={r.code}
                    type="button"
                    disabled={busy}
                    onClick={() => setReasonCode(r.code)}
                    aria-pressed={reasonCode === r.code}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition disabled:opacity-60 ${
                      reasonCode === r.code
                        ? "bg-brand-700 text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="mod-note" className="block text-xs font-black text-slate-700 dark:text-slate-300">
              {needsReason
                ? reasonCode === "other"
                  ? "اكتب السبب (يظهر لصاحب المحتوى)"
                  : "ملاحظة (اختيارية — تظهر لصاحب المحتوى)"
                : "رسالة لصاحب المحتوى (اختيارية)"}
            </label>
            <textarea
              id="mod-note"
              rows={3}
              maxLength={500}
              value={note}
              disabled={busy}
              onChange={(e) => setNote(e.target.value)}
              placeholder={needsReason ? "مثال: الصور منسوخة من إعلان آخر." : "مثال: تمت المراجعة ويمكنك المتابعة."}
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-1 text-end text-[10px] text-slate-400">{note.length}/500</div>
          </div>

          <label className="flex cursor-pointer items-start gap-2 text-[13px] font-bold text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 accent-brand-700"
              checked={notify}
              disabled={busy}
              onChange={(e) => setNotify(e.target.checked)}
            />
            <span>
              إشعار صاحب المحتوى
              <span className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                يصله إشعار داخل التطبيق (وPush) مع السبب.
              </span>
            </span>
          </label>

          {paidRemove && (
            <div className="space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[12px] leading-6 text-amber-900 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-100">
              <p className="flex items-center gap-1.5 font-black">
                <Crown size={14} /> محتوى مدفوع أو مميّز
              </p>
              <p>
                لهذا المحتوى ترويج مدفوع فعّال. ننصح بـ<b>الإيقاف المؤقت</b> بدل الحذف: يجمّد المدة المتبقية وتُعاد
                كاملة عند الاستئناف. (الحذف أيضاً يجمّد المدة وتُعاد عند الاستعادة.)
              </p>
              {target.type !== "story" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAction("pause");
                    setError(null);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-1.5 text-[12px] font-black text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  <CirclePause size={13} /> إيقاف مؤقت بدلاً من الحذف
                </button>
              )}
              {moderatorBlocked ? (
                <p className="font-black text-rose-700 dark:text-rose-300">
                  حذف المحتوى المدفوع يتطلّب دور «أدمن» أو «مدير عام».
                  {target.type === "story" ? " اطلب ذلك من مدير." : " يمكنك إيقافه مؤقتاً."}
                </p>
              ) : (
                <label className="flex cursor-pointer items-start gap-2 font-black">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 accent-rose-600"
                    checked={confirmPaid}
                    disabled={busy}
                    onChange={(e) => setConfirmPaid(e.target.checked)}
                  />
                  <span>أؤكد حذف محتوى مدفوع رغم وجود ترويج فعّال.</span>
                </label>
              )}
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-2xl bg-rose-50 px-3 py-2 text-[13px] font-bold text-rose-700 dark:bg-rose-900/25 dark:text-rose-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 p-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || moderatorBlocked}
            className={`inline-flex h-10 items-center gap-1.5 rounded-2xl px-4 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:opacity-50 ${meta.btn}`}
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
            {busy ? "جارٍ التنفيذ…" : meta.cta}
          </button>
        </div>
      </div>
    </div>
  );
}
