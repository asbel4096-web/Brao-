"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, User as UserIcon, LogOut, Bell, Shield, Trash2 } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { PushPermissionBanner } from "@/components/push-permission-banner";
import { CredentialsManager } from "@/components/settings/credentials-manager";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();
  const { theme, toggle } = useTheme();
  const toast = useToast();
  const confirm = useConfirm();

  useEffect(() => {
    if (!loading && !user) router.replace("/login?redirect=/settings");
  }, [user, loading, router]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: "تسجيل الخروج؟",
      message: "ستحتاج لتسجيل الدخول مرة أخرى للوصول إلى حسابك.",
      confirmLabel: "تسجيل الخروج",
      tone: "warning",
    });
    if (!ok) return;
    try {
      await signOut(auth);
      router.replace("/");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تسجيل الخروج.");
    }
  };

  if (loading || !user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  return (
    <section className="container py-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="section-title">الإعدادات</h1>
          <p className="section-subtitle">إدارة تفضيلاتك في براتشو كار.</p>
        </div>

        {/* بانر تفعيل/إدارة Push Notifications. يظهر بصيغة مختلفة حسب الحالة:
            - default: زر "تفعيل الإشعارات" بارز
            - granted: حالة + زر إيقاف
            - denied/needs-pwa/error: تعليمات مناسبة
            - unsupported: مخفي تماماً */}
        <PushPermissionBanner variant="settings" showWhenGranted />

        <div className="card divide-y divide-slate-200 dark:divide-slate-700">
          <Row
            icon={theme === "dark" ? Sun : Moon}
            title="الوضع الليلي"
            desc={theme === "dark" ? "مفعّل" : "مغلق"}
            action={
              <button onClick={toggle} className="btn-secondary">
                تبديل
              </button>
            }
          />
          <Row
            icon={UserIcon}
            title="الحساب الشخصي"
            desc="تعديل الاسم والصورة والمعلومات."
            action={<Link href="/profile" className="btn-secondary">فتح</Link>}
          />
          <CredentialsManager />
          <Row
            icon={Bell}
            title="الإشعارات"
            desc="استعرض وأدر الإشعارات."
            action={<Link href="/notifications" className="btn-secondary">فتح</Link>}
          />
          {isAdmin && (
            <Row
              icon={Shield}
              title="لوحة الإدارة"
              desc="مراجعة الإعلانات والمستخدمين."
              action={<Link href="/admin" className="btn-action">دخول</Link>}
            />
          )}
          <Row
            icon={LogOut}
            title="تسجيل الخروج"
            desc="إنهاء الجلسة الحالية."
            action={
              <button onClick={handleLogout} className="btn-danger">
                خروج
              </button>
            }
          />
        </div>

        <div className="card border-rose-200 bg-rose-50 p-5 dark:bg-rose-900/10 dark:border-rose-700/40">
          <div className="flex items-start gap-3">
            <Trash2 size={20} className="text-rose-600 mt-0.5" />
            <div>
              <h3 className="font-black text-rose-700 dark:text-rose-300">حذف الحساب</h3>
              <p className="mt-1 text-sm text-rose-600 dark:text-rose-200">
                لحذف حسابك نهائياً مع كل بياناتك، تواصل مع الدعم.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ icon: Icon, title, desc, action }: any) {
  return (
    <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-black dark:text-white">{title}</div>
          <div className="truncate text-xs text-slate-500">{desc}</div>
        </div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
