"use client";

import { useState } from "react";
import {
  Wrench,
  Wallet,
  Users as UsersIcon,
  Star,
  Zap,
  BadgeCheck,
  BookOpen,
  Truck,
  UserPlus,
  Image,
  ShoppingCart,
  Store,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useAllFeatureFlags } from "@/hooks/features/use-feature-flag";
import {
  ALL_FEATURE_FLAGS,
  FLAG_METADATA,
  type FeatureFlagKey,
} from "@/lib/features/types";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { auth } from "@/lib/firebase";

const FLAG_ICONS: Record<FeatureFlagKey, any> = {
  wallet: Wallet,
  referrals: UsersIcon,
  vip: Star,
  boosts: Zap,
  verification_paid: BadgeCheck,
  stories: BookOpen,
  tow_service: Truck,
  registration: UserPlus,
  banners: Image,
  friday_market: ShoppingCart,
  maintenance: Wrench,
  dealers: Store,
  comments: MessageSquare,
  chat: MessageCircle,
};

export default function FeatureFlagsPage() {
  const { can } = useAdminRole();
  const { flags, loaded } = useAllFeatureFlags();
  const toast = useToast();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<string | null>(null);

  if (!can("features.toggle")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة Feature Flags.
      </div>
    );
  }

  const handleToggle = async (
    key: FeatureFlagKey,
    currentEnabled: boolean
  ) => {
    const newValue = !currentEnabled;
    const meta = FLAG_METADATA[key];

    const ok = await confirm({
      title: newValue
        ? `تفعيل "${meta.label}"؟`
        : `إيقاف "${meta.label}"؟`,
      message: newValue
        ? "سيظهر هذا النظام لكل المستخدمين فوراً."
        : "سيختفي هذا النظام من كل التطبيق فوراً. الكود يبقى لكن مخفياً.",
      confirmLabel: newValue ? "تفعيل" : "إيقاف",
      tone: newValue ? "info" : "warning",
    });

    if (!ok) return;

    setBusy(key);

    try {
      const idToken = await auth.currentUser?.getIdToken();

      const res = await fetch(`/api/admin/features/${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          enabled: newValue,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل التحديث");
        return;
      }

      toast.success(
        newValue
          ? `تم تفعيل ${meta.label}`
          : `تم إيقاف ${meta.label}`
      );
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Wrench size={20} strokeWidth={2.2} />
        </div>

        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            Feature Flags
          </h1>

          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            تشغيل/إيقاف ميزات كاملة بدون نشر جديد.
          </p>
        </div>
      </header>

      <div className="rounded-2xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-900/40 dark:bg-brand-900/10">
        <p className="text-[12px] leading-6 text-brand-900 dark:text-brand-200">
          <strong>كيف تعمل؟</strong> كل flag يتحكّم بميزة كاملة في التطبيق.
          إيقاف الـflag = الميزة تختفي تماماً من واجهة كل المستخدمين خلال
          ثوانٍ (realtime).
        </p>
      </div>

      {!loaded ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {ALL_FEATURE_FLAGS.map((key) => {
            const meta = FLAG_METADATA[key];
            const doc = flags.get(key);
            const enabled = doc?.enabled ?? meta.defaultEnabled;
            const Icon = FLAG_ICONS[key] ?? Wrench;

            return (
              <article
                key={key}
                className={`flex items-center gap-3 rounded-2xl border p-4 transition ${
                  enabled
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-900/10"
                    : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
                }`}
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    enabled
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  <Icon size={20} strokeWidth={2.2} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      {meta.label}
                    </h3>

                    {enabled ? (
                      <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-black text-white">
                        نشط
                      </span>
                    ) : (
                      <span className="rounded-full bg-slate-400 px-2 py-0.5 text-[9px] font-black text-white">
                        موقوف
                      </span>
                    )}
                  </div>

                  <p className="mt-0.5 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>

                  {doc?.updatedByEmail && (
                    <p
                      className="mt-1 text-[10px] text-slate-400 dark:text-slate-500"
                      dir="ltr"
                    >
                      آخر تحديث: {doc.updatedByEmail}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => handleToggle(key, enabled)}
                  disabled={busy === key}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                    enabled
                      ? "bg-emerald-500"
                      : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                      enabled
                        ? "-translate-x-6"
                        : "-translate-x-1"
                    }`}
                  />

                  {busy === key && (
                    <span className="absolute inset-0 grid place-items-center">
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </span>
                  )}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
