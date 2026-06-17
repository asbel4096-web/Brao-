"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Moon,
  ChevronLeft,
  User as UserIcon,
  LogOut,
  Bell,
  Shield,
  Trash2,
  Wallet,
  Receipt,
  BadgeCheck,
  Car,
  Phone,
  FileText,
  Lock,
  Info,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { PushPermissionBanner } from "@/components/push-permission-banner";
import { CredentialsManager } from "@/components/settings/credentials-manager";

const APP_VERSION = "2.0.0";

export default function SettingsPage() {
  const router = useRouter();
  const { user, profile, loading, isAdmin } = useAuth();
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
      <section className="container py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <div className="h-24 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </section>
    );
  }

  const name = (profile as any)?.name || "حسابي";
  const phone = (profile as any)?.phone || "";
  const photo = (profile as any)?.photoURL || "";

  return (
    <section className="container py-5 pb-28 sm:py-8" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-5">
        <h1 className="px-1 text-2xl font-black text-slate-900 dark:text-white">
          الإعدادات
        </h1>

        {/* رأس الملف الشخصي */}
        <Link
          href="/profile"
          className="group flex items-center gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#0a1d55] to-[#1c389c] ring-2 ring-brand-100 dark:ring-brand-900/40">
            {photo ? (
              <Image src={photo} alt={name} fill sizes="56px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-black text-white">
                {name.charAt(0)}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-black text-slate-900 dark:text-white">
              {name}
            </div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {phone || "عرض الملف الشخصي وتعديله"}
            </div>
          </div>
          <ChevronLeft
            size={18}
            className="shrink-0 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600"
          />
        </Link>

        <PushPermissionBanner variant="settings" showWhenGranted />

        {/* التفضيلات */}
        <Group title="التفضيلات">
          <ToggleRow
            icon={Moon}
            title="الوضع الليلي"
            desc={theme === "dark" ? "مفعّل" : "مغلق"}
            on={theme === "dark"}
            onToggle={toggle}
          />
          <LinkRow icon={Bell} title="الإشعارات" desc="استعرض وأدر إشعاراتك" href="/notifications" />
          <LinkRow icon={Car} title="تنبيهات سياراتي" desc="نبّهني عند توفّر سيارة" href="/alerts" />
        </Group>

        {/* الحساب والأمان */}
        <Group title="الحساب والأمان">
          <LinkRow icon={UserIcon} title="الملف الشخصي" desc="الاسم والصورة والمعلومات" href="/profile" />
          <CredentialsManager />
          <LinkRow icon={BadgeCheck} title="توثيق المعرض" desc="احصل على شارة الموثَّق" href="/dealer-verification" />
        </Group>

        {/* المحفظة */}
        <Group title="المحفظة">
          <LinkRow icon={Wallet} title="محفظتي" desc="الرصيد والشحن والباقات" href="/wallet" />
          <LinkRow icon={Receipt} title="سجلّ المعاملات" desc="كل عمليات الشحن والإنفاق" href="/wallet/transactions" />
        </Group>

        {/* الإدارة */}
        {isAdmin && (
          <Group title="الإدارة">
            <LinkRow
              icon={Shield}
              title="لوحة الإدارة"
              desc="مراجعة الإعلانات والمستخدمين"
              href="/admin"
              accent
            />
          </Group>
        )}

        {/* الدعم والمعلومات */}
        <Group title="الدعم والمعلومات">
          <LinkRow icon={Phone} title="تواصل معنا" desc="الدعم والاستفسارات" href="/contact" />
          <LinkRow icon={FileText} title="الشروط والأحكام" href="/terms" />
          <LinkRow icon={Lock} title="سياسة الخصوصية" href="/privacy" />
          <div className="flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Info size={18} />
              </span>
              <div className="text-sm font-black text-slate-900 dark:text-white">
                عن التطبيق
              </div>
            </div>
            <span className="shrink-0 text-xs font-bold text-slate-400">
              براتشو كار · v{APP_VERSION}
            </span>
          </div>
        </Group>

        {/* تسجيل الخروج */}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white py-4 text-sm font-black text-rose-600 shadow-sm transition active:scale-[0.99] hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-900/20"
        >
          <LogOut size={17} />
          تسجيل الخروج
        </button>

        {/* حذف الحساب */}
        <div className="rounded-3xl border border-rose-200 bg-rose-50/60 p-4 dark:border-rose-900/40 dark:bg-rose-900/15">
          <div className="flex items-start gap-3">
            <Trash2 size={18} className="mt-0.5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div>
              <h3 className="text-sm font-black text-rose-700 dark:text-rose-300">
                حذف الحساب
              </h3>
              <p className="mt-1 text-xs text-rose-600/90 dark:text-rose-200/80">
                لحذف حسابك نهائياً مع كل بياناتك، تواصل مع الدعم.
              </p>
              <Link
                href="/contact"
                className="mt-2 inline-block text-xs font-black text-rose-700 underline dark:text-rose-300"
              >
                تواصل مع الدعم
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============== مكوّنات ============== */
function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="mb-2 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </div>
  );
}

function RowShell({
  icon: Icon,
  title,
  desc,
  children,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  children?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            accent
              ? "bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300"
              : "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300"
          }`}
        >
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <div className="text-sm font-black text-slate-900 dark:text-white">{title}</div>
          {desc && <div className="truncate text-xs text-slate-500 dark:text-slate-400">{desc}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function LinkRow({
  icon,
  title,
  desc,
  href,
  accent,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link href={href} className="group block transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
      <RowShell icon={icon} title={title} desc={desc} accent={accent}>
        <ChevronLeft
          size={18}
          className="text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600"
        />
      </RowShell>
    </Link>
  );
}

function ToggleRow({
  icon,
  title,
  desc,
  on,
  onToggle,
}: {
  icon: LucideIcon;
  title: string;
  desc?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <RowShell icon={icon} title={title} desc={desc}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={onToggle}
        className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
          on ? "bg-brand-600" : "bg-slate-300 dark:bg-slate-600"
        }`}
      >
        <span
          className={`absolute h-5 w-5 rounded-full bg-white shadow transition-all ${
            on ? "right-1" : "right-6"
          }`}
        />
      </button>
    </RowShell>
  );
}
