"use client";

import { useState } from "react";
import { Bell, BellOff, Smartphone, X, Check } from "lucide-react";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

/**
 * بانر يطلب إذن الإشعارات + يعرض حالات مختلفة.
 *
 * متى يظهر؟
 *  - "default": المستخدم لم يُسأل بعد - يعرض زر التفعيل.
 *  - "needs-pwa": iPhone Safari - يعرض تعليمات التثبيت.
 *  - "denied": رفض المستخدم - يعرض تعليمات إعادة التفعيل من إعدادات المتصفح.
 *  - "granted": مفعّلة - يعرض حالة + زر إيقاف (لو showWhenGranted=true).
 *  - "unsupported": لا يعرض شيئاً (إخفاء كامل).
 *
 * variant:
 *  - "compact": كرت صغير (للظهور أعلى /notifications)
 *  - "settings": تصميم أكبر للظهور في صفحة الإعدادات
 */

interface Props {
  variant?: "compact" | "settings";
  /** عرض حالة "مفعّل" أيضاً (مع زر إيقاف). default: false في compact. */
  showWhenGranted?: boolean;
  /** يخفي البانر بالضغط على X (يحفظ تفضيل المستخدم في localStorage). */
  dismissible?: boolean;
}

const DISMISS_KEY = "bratsho:push-banner-dismissed";

export function PushPermissionBanner({
  variant = "compact",
  showWhenGranted = false,
  dismissible = false,
}: Props) {
  const { user } = useAuth();
  const { status, requestPermission, disable } = usePushNotifications();
  const toast = useToast();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined" || !dismissible) return false;
    try {
      return window.localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [busy, setBusy] = useState(false);

  // ============================================================
  // فلترة الظهور
  // ============================================================
  if (!user) return null; // المستخدمون غير المسجَّلين لا يحتاجون الإذن
  if (status === "loading") return null;
  if (status === "unsupported") return null;
  if (dismissed) return null;
  if (status === "granted" && !showWhenGranted) return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      const ok = await requestPermission();
      if (ok) {
        toast.success("تم تفعيل الإشعارات. ستصلك التنبيهات المهمة.");
      } else {
        // الـstatus سيتحدّث تلقائياً إلى denied/error - نعتمد عليه.
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await disable();
      toast.success("تم إيقاف الإشعارات.");
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // ============================================================
  // عرض حسب الحالة
  // ============================================================

  // iPhone Safari خارج PWA
  if (status === "needs-pwa") {
    return (
      <BannerShell variant={variant} icon={<Smartphone />} tone="info">
        <BannerTitle>فعّل الإشعارات بتثبيت التطبيق</BannerTitle>
        <BannerBody>
          لتلقّي الإشعارات على iPhone، افتح القائمة في Safari واختر «إضافة إلى
          الشاشة الرئيسية»، ثم افتح التطبيق من الأيقونة الجديدة.
        </BannerBody>
        {dismissible && <DismissButton onClick={handleDismiss} />}
      </BannerShell>
    );
  }

  // رفض المستخدم
  if (status === "denied") {
    return (
      <BannerShell variant={variant} icon={<BellOff />} tone="warning">
        <BannerTitle>الإشعارات معطّلة</BannerTitle>
        <BannerBody>
          لتفعيلها مجدداً، افتح إعدادات الموقع في المتصفح واسمح بالإشعارات.
        </BannerBody>
        {dismissible && <DismissButton onClick={handleDismiss} />}
      </BannerShell>
    );
  }

  // خطأ تقني
  if (status === "error") {
    return (
      <BannerShell variant={variant} icon={<BellOff />} tone="warning">
        <BannerTitle>تعذّر إعداد الإشعارات</BannerTitle>
        <BannerBody>
          هناك خطأ في الإعدادات. يرجى المحاولة لاحقاً أو التواصل مع الإدارة.
        </BannerBody>
        {dismissible && <DismissButton onClick={handleDismiss} />}
      </BannerShell>
    );
  }

  // مفعّلة (showWhenGranted=true)
  if (status === "granted") {
    return (
      <BannerShell variant={variant} icon={<Check />} tone="success">
        <BannerTitle>الإشعارات مفعّلة</BannerTitle>
        <BannerBody>
          ستصلك تنبيهات على التعليقات والرسائل والإعلانات الجديدة المطابقة
          لتنبيهاتك.
        </BannerBody>
        <button
          type="button"
          onClick={handleDisable}
          disabled={busy}
          className="
            mt-3 inline-flex h-9 items-center gap-1.5 rounded-2xl
            border border-slate-300 bg-white px-4 text-xs font-black
            text-slate-700 transition hover:bg-slate-50
            disabled:opacity-60
            dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200
            dark:hover:bg-slate-800
          "
        >
          <BellOff size={14} />
          إيقاف الإشعارات
        </button>
      </BannerShell>
    );
  }

  // default - الحالة الأهم: طلب الإذن
  return (
    <BannerShell variant={variant} icon={<Bell />} tone="brand">
      <BannerTitle>لا تفوّت أي تنبيه</BannerTitle>
      <BannerBody>
        فعّل الإشعارات لتصلك التعليقات الجديدة، الرسائل، والإعلانات المطابقة
        لتنبيهاتك مباشرة على جهازك.
      </BannerBody>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleEnable}
          disabled={busy}
          className="
            inline-flex h-10 items-center gap-1.5 rounded-2xl
            bg-action-500 px-5 text-sm font-black text-white shadow-action
            transition hover:bg-action-600 active:scale-95
            disabled:opacity-60
          "
        >
          <Bell size={15} />
          {busy ? "جارٍ التفعيل..." : "تفعيل الإشعارات"}
        </button>
        {dismissible && (
          <button
            type="button"
            onClick={handleDismiss}
            className="
              text-xs font-bold text-slate-500 underline-offset-4 hover:underline
              dark:text-slate-400
            "
          >
            ليس الآن
          </button>
        )}
      </div>
    </BannerShell>
  );
}

// ============================================================
// مكوّنات داخلية صغيرة (لا re-export - استخدام داخلي فقط)
// ============================================================

type Tone = "brand" | "info" | "warning" | "success";

const TONE_STYLES: Record<Tone, { bg: string; border: string; iconBg: string }> = {
  brand: {
    bg: "bg-brand-50 dark:bg-brand-900/20",
    border: "border-brand-200 dark:border-brand-800/40",
    iconBg: "bg-brand-700 text-white",
  },
  info: {
    bg: "bg-slate-50 dark:bg-slate-900/40",
    border: "border-slate-200 dark:border-slate-800",
    iconBg: "bg-slate-700 text-white",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800/40",
    iconBg: "bg-amber-500 text-white",
  },
  success: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800/40",
    iconBg: "bg-emerald-600 text-white",
  },
};

function BannerShell({
  variant,
  icon,
  tone,
  children,
}: {
  variant: "compact" | "settings";
  icon: React.ReactNode;
  tone: Tone;
  children: React.ReactNode;
}) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className={`
        relative rounded-3xl border p-4 sm:p-5
        ${t.bg} ${t.border}
        ${variant === "settings" ? "" : "mb-4"}
      `}
    >
      <div className="flex items-start gap-3">
        <div
          className={`
            grid h-10 w-10 shrink-0 place-items-center rounded-2xl shadow-sm
            ${t.iconBg}
          `}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function BannerTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-black text-slate-900 dark:text-white sm:text-base">
      {children}
    </h3>
  );
}

function BannerBody({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
      {children}
    </p>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="إخفاء"
      className="
        absolute left-3 top-3 grid h-7 w-7 place-items-center rounded-full
        text-slate-400 transition hover:bg-black/5 hover:text-slate-700
        dark:hover:bg-white/5 dark:hover:text-slate-200
      "
    >
      <X size={14} />
    </button>
  );
}
