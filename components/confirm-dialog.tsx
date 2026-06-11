"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";
import { AlertTriangle, X } from "lucide-react";

type ConfirmTone = "danger" | "warning" | "info";

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue>({
  confirm: async () => false,
});

interface QueueItem {
  options: ConfirmOptions;
  resolve: (v: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<QueueItem | null>(null);
  const queueRef = useRef<QueueItem[]>([]);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    setCurrent(next ?? null);
  }, []);

  const confirm = useCallback(
    (options: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        const item: QueueItem = { options, resolve };
        if (!current) setCurrent(item);
        else queueRef.current.push(item);
      });
    },
    [current]
  );

  const handle = useCallback(
    (result: boolean) => {
      if (current) current.resolve(result);
      showNext();
    },
    [current, showNext]
  );

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {current && <ConfirmDialog options={current.options} onResult={handle} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext).confirm;
}

const TONE_STYLES: Record<ConfirmTone, { confirmBtn: string; iconBg: string; iconCls: string }> = {
  danger: {
    confirmBtn: "btn-danger",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconCls: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    confirmBtn: "btn-action",
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconCls: "text-amber-600 dark:text-amber-400",
  },
  info: {
    confirmBtn: "btn-primary",
    iconBg: "bg-brand-50 dark:bg-brand-900/30",
    iconCls: "text-brand-700 dark:text-brand-300",
  },
};

function ConfirmDialog({
  options,
  onResult,
}: {
  options: ConfirmOptions;
  onResult: (v: boolean) => void;
}) {
  const tone = options.tone ?? "danger";
  const style = TONE_STYLES[tone];
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  // إغلاق بـ Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResult(false);
      if (e.key === "Enter") onResult(true);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onResult]);

  // قفل scroll عند فتح الحوار
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => onResult(false)}
    >
      <div
        className="
          w-full max-w-md overflow-hidden
          rounded-t-3xl border border-slate-200 bg-white
          shadow-2xl
          animate-slide-up
          dark:border-slate-700 dark:bg-slate-900
          sm:rounded-3xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.iconBg}`}
            >
              <AlertTriangle size={24} className={style.iconCls} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                id="confirm-title"
                className="text-lg font-black text-slate-900 dark:text-white"
              >
                {options.title}
              </h3>
              {options.message && (
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {options.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onResult(false)}
              className="-mt-1 -mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="إغلاق"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onResult(false)}
              className="btn-secondary"
            >
              {options.cancelLabel ?? "إلغاء"}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => onResult(true)}
              className={style.confirmBtn}
            >
              {options.confirmLabel ?? "تأكيد"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
