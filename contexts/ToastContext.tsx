"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

type ToastKind = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  duration: number;
}

interface ToastContextValue {
  show: (message: string, options?: { kind?: ToastKind; duration?: number }) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

const noop = () => {};
const ToastContext = createContext<ToastContextValue>({
  show: noop,
  success: noop,
  error: noop,
  info: noop,
  warning: noop,
});

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((arr) => arr.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, options?: { kind?: ToastKind; duration?: number }) => {
      const id = nextId++;
      const kind = options?.kind ?? "info";
      const duration = options?.duration ?? (kind === "error" ? 5000 : 3500);
      setToasts((arr) => [...arr, { id, kind, message, duration }]);
      if (duration > 0) {
        setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m, d) => show(m, { kind: "success", duration: d }),
      error: (m, d) => show(m, { kind: "error", duration: d }),
      info: (m, d) => show(m, { kind: "info", duration: d }),
      warning: (m, d) => show(m, { kind: "warning", duration: d }),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:top-5"
    >
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

const KIND_STYLES: Record<ToastKind, { bg: string; icon: typeof CheckCircle2; iconCls: string }> = {
  success: {
    bg: "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-100",
    icon: CheckCircle2,
    iconCls: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    bg: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-800 dark:bg-rose-950/80 dark:text-rose-100",
    icon: AlertCircle,
    iconCls: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    bg: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100",
    icon: AlertTriangle,
    iconCls: "text-amber-600 dark:text-amber-400",
  },
  info: {
    bg: "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-800 dark:bg-brand-950/80 dark:text-brand-100",
    icon: Info,
    iconCls: "text-brand-600 dark:text-brand-300",
  },
};

function Toast({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const [show, setShow] = useState(false);
  const style = KIND_STYLES[item.kind];
  const Icon = style.icon;

  useEffect(() => {
    const t = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      role="status"
      className={`
        pointer-events-auto flex w-full max-w-md items-start gap-3
        rounded-2xl border px-4 py-3 shadow-card backdrop-blur
        transition-all duration-300
        ${style.bg}
        ${show ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}
      `}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${style.iconCls}`} aria-hidden="true" />
      <p className="flex-1 text-sm font-bold leading-relaxed">{item.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="shrink-0 rounded-full p-1 opacity-60 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
        aria-label="إغلاق"
      >
        <X size={16} />
      </button>
    </div>
  );
}
