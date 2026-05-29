"use client";

import { useState } from "react";
import { Ban, X } from "lucide-react";

/**
 * Dialog لحظر مستخدم - مع حقل سبب اختياري.
 *
 * استخدام: controlled dialog. الأب يفتحه ويغلقه ويستقبل onConfirm.
 */

interface Props {
  open: boolean;
  userName?: string;
  busy?: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function BanUserDialog({
  open,
  userName,
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const [reason, setReason] = useState("");

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
        onClick={busy ? undefined : onCancel}
      />
      <div
        className="
          fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2
          rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl
          dark:border-slate-800 dark:bg-slate-950
        "
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
            <Ban size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              حظر المستخدم
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              سيُمنع {userName || "هذا المستخدم"} من تسجيل الدخول، وستُؤرشف كل
              إعلاناته المنشورة.
            </p>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onCancel}
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

        <label htmlFor="ban-reason" className="block text-xs font-black text-slate-700 dark:text-slate-300">
          السبب (اختياري)
        </label>
        <textarea
          id="ban-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          placeholder="مثلاً: محتوى مخالف، رسائل سبام، انتحال شخصية..."
          className="
            mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white
            px-3 py-2 text-sm outline-none transition focus:border-rose-400
            dark:border-slate-700 dark:bg-slate-900
            disabled:opacity-60
          "
        />
        <div className="mt-1 text-end text-[10px] text-slate-400">
          {reason.length}/500
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
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
            onClick={() => onConfirm(reason.trim())}
            disabled={busy}
            className="
              inline-flex h-10 items-center gap-1.5 rounded-2xl bg-rose-600 px-4
              text-xs font-black text-white shadow-sm transition
              hover:bg-rose-700 active:scale-95
              disabled:opacity-60
            "
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              <>
                <Ban size={14} />
                حظر المستخدم
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
