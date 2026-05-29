"use client";

import { Settings, X } from "lucide-react";
import { ALL_ROLES, ROLE_METADATA, type AdminRole } from "@/lib/admin/roles";

/**
 * Dialog لتعيين دور أدمن. Super Admin فقط يستطيع فتحه (الـguard في الـparent).
 *
 * يعرض كل الأدوار + خيار "إزالة الأدمن" (role = null).
 */

interface Props {
  open: boolean;
  userName?: string;
  currentRole: AdminRole | null;
  busy?: boolean;
  onSelect: (role: AdminRole | null) => void;
  onCancel: () => void;
}

export function RoleSelectorDialog({
  open,
  userName,
  currentRole,
  busy = false,
  onSelect,
  onCancel,
}: Props) {
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
          max-h-[90vh] overflow-y-auto
        "
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <Settings size={20} strokeWidth={2.2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              تعيين دور الأدمن
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              اختر الدور المناسب لـ{userName || "هذا المستخدم"}.
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

        <div className="space-y-2">
          {ALL_ROLES.map((role) => {
            const meta = ROLE_METADATA[role];
            const isCurrent = currentRole === role;
            return (
              <button
                key={role}
                type="button"
                disabled={busy || isCurrent}
                onClick={() => onSelect(role)}
                className={`
                  group flex w-full items-start gap-3 rounded-2xl border p-3 text-right transition
                  ${isCurrent
                    ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-900/30"
                    : "border-slate-200 bg-white hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
                  }
                  disabled:cursor-default disabled:opacity-100
                  enabled:active:scale-[0.98]
                `}
              >
                <span
                  className={`mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full ${meta.color}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      {meta.label}
                    </span>
                    {isCurrent && (
                      <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[9px] font-black text-white">
                        الحالي
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>
              </button>
            );
          })}

          {/* إزالة الأدمن */}
          <button
            type="button"
            disabled={busy || currentRole === null}
            onClick={() => onSelect(null)}
            className="
              flex w-full items-start gap-3 rounded-2xl border border-dashed border-slate-300
              bg-slate-50 p-3 text-right transition
              hover:border-rose-300 hover:bg-rose-50
              dark:border-slate-700 dark:bg-slate-900/50
              dark:hover:border-rose-700 dark:hover:bg-rose-900/10
              disabled:cursor-default disabled:opacity-50
              enabled:active:scale-[0.98]
            "
          >
            <span className="mt-0.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-slate-400" />
            <div className="min-w-0 flex-1">
              <span className="text-sm font-black text-slate-700 dark:text-slate-300">
                إزالة دور الأدمن
              </span>
              <p className="mt-0.5 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                يصبح المستخدم عادياً، ويفقد كل صلاحيات الإدارة.
              </p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
