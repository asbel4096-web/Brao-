"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  Wallet,
  Eye,
  EyeOff,
  Check,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useWalletEnabled } from "@/hooks/use-wallet-enabled";

/**
 * صفحة تحكم الأدمن بالمحفظة - /admin/wallet-settings
 *
 * Toggle بسيط لإظهار/إخفاء نظام المحفظة على مستوى التطبيق كله:
 *  - زر المحفظة في الـheader
 *  - صفحة /wallet
 *  - كل خدمات BC
 *
 * متاح للأدمن فقط.
 */

export default function WalletSettingsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const { enabled } = useWalletEnabled();

  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  // مزامنة الحالة المحلية مع القيمة الفعلية
  useEffect(() => {
    if (localEnabled === null) {
      setLocalEnabled(enabled);
    }
  }, [enabled, localEnabled]);

  // حماية: الأدمن فقط
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (profile && (profile as any).isAdmin !== true) {
      router.replace("/");
    }
  }, [authLoading, user, profile, router]);

  const handleToggle = async (newValue: boolean) => {
    if (!user) return;
    setSaving(true);
    setLocalEnabled(newValue); // تحديث فوري للواجهة

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/wallet-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletEnabled: newValue }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل الحفظ");
      }
      toast.success(
        newValue ? "تم إظهار المحفظة للجميع" : "تم إخفاء المحفظة عن الجميع"
      );
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
      setLocalEnabled(!newValue); // تراجع
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || !profile || localEnabled === null) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if ((profile as any).isAdmin !== true) {
    return null;
  }

  return (
    <section className="container max-w-2xl py-5" dir="rtl">
      {/* Header */}
      <header className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => router.back()}
          className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
          aria-label="رجوع"
        >
          <ChevronRight size={16} />
        </button>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">
            إعدادات المحفظة
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            تحكّم بإظهار نظام المحفظة (BC) للمستخدمين
          </p>
        </div>
      </header>

      {/* Main toggle card */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div
            className={`
              flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl
              transition-colors
              ${localEnabled
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30"
                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
              }
            `}
          >
            <Wallet size={26} strokeWidth={2} />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              نظام المحفظة (BC)
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {localEnabled
                ? "ظاهر حالياً لكل المستخدمين"
                : "مخفي حالياً عن كل المستخدمين"}
            </p>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            onClick={() => handleToggle(!localEnabled)}
            disabled={saving}
            className={`
              relative h-8 w-14 shrink-0 rounded-full transition-colors
              disabled:opacity-60
              ${localEnabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"}
            `}
            aria-label="تبديل المحفظة"
          >
            <motion.span
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className={`
                absolute top-1 grid h-6 w-6 place-items-center rounded-full
                bg-white shadow
                ${localEnabled ? "right-1" : "right-7"}
              `}
            >
              {saving ? (
                <Loader2 size={12} className="animate-spin text-blue-600" />
              ) : localEnabled ? (
                <Check size={12} className="text-blue-600" />
              ) : null}
            </motion.span>
          </button>
        </div>

        {/* Status banner */}
        <div
          className={`
            mt-4 flex items-center gap-2 rounded-2xl p-3 text-[12px] font-bold
            ${localEnabled
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            }
          `}
        >
          {localEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
          {localEnabled
            ? "المستخدمون يرون زر المحفظة وصفحتها وكل خدمات BC"
            : "المحفظة مخفية تماماً - لن يراها أي مستخدم"}
        </div>
      </div>

      {/* What gets hidden */}
      <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
        <p className="text-[12px] font-black text-slate-700 dark:text-slate-200">
          عند الإخفاء، يختفي:
        </p>
        <ul className="mt-2 space-y-1.5 text-[11px] text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            زر المحفظة (BC) في الشريط العلوي
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            صفحة /wallet بالكامل
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            خدمات BC (إعلان مميز، رفع، توثيق، تحويل)
          </li>
        </ul>
        <p className="mt-3 text-[10px] text-slate-400">
          ملاحظة: أرصدة المستخدمين تبقى محفوظة، فقط الواجهة تختفي.
        </p>
      </div>
    </section>
  );
}
