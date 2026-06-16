"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, type ReactNode } from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ListChecks,
  Eye,
  AlertTriangle,
  Sparkles,
  Flag,
  TrendingUp,
  Ban,
  ArrowLeft,
  BarChart3,
  Megaphone,
  History,
  Building2,
  Phone,
  FileText,
  Home,
  ToggleRight,
  Wallet,
  ArrowDownToLine,
  ArrowLeftRight,
  BadgeCheck,
  ScrollText,
  Gift,
  Rocket,
  ShieldAlert,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useAdminStats } from "@/hooks/admin/use-admin-stats";
import { useAnalyticsData } from "@/hooks/admin/use-analytics-data";
import { useAllFeatureFlags } from "@/hooks/features/use-feature-flag";
import {
  ALL_FEATURE_FLAGS,
  FLAG_METADATA,
  type FeatureFlagKey,
} from "@/lib/features/types";
import { StatCard } from "@/components/admin/ui/stat-card";

const GrowthChart = dynamic(
  () =>
    import("@/components/admin/charts/growth-chart").then((m) => m.GrowthChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[260px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
    ),
  }
);

/**
 * مركز تحكّم براتشو كار — لوحة الأدمن الرئيسية.
 *
 *  1. هيرو ترحيبي بهوية المنصّة + شارة الدور + نبض حالة النظام.
 *  2. تنبيهات تستدعي إجراء.
 *  3. مؤشرات الأداء (KPIs).
 *  4. التحكّم بالمزايا (تشغيل/إيقاف فوري لأي ميزة في التطبيق).
 *  5. مركز التحكّم — كل أقسام الإدارة في شبكة منظّمة.
 *  6. نظرة على النمو (رسوم).
 */
export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const { can, role } = useAdminRole();
  const stats = useAdminStats();
  const analytics = useAnalyticsData();

  const firstName = profile?.name?.split(" ")[0] || "أيها الأدمن";

  return (
    <div className="space-y-6">
      {/* ===== الهيرو ===== */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] p-5 text-white shadow-blue sm:p-6">
        <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-action-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-14 -right-6 h-44 w-44 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/55">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              النظام يعمل
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">مرحباً، {firstName}</h1>
            <p className="mt-1.5 text-sm font-bold text-white/70">
              مركز التحكّم الكامل في براتشو كار.
            </p>
          </div>
          {role && (
            <span className="shrink-0 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-black backdrop-blur">
              {role}
            </span>
          )}
        </div>
      </div>

      {/* ===== تنبيهات ===== */}
      {stats.alertsCount > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/20">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <AlertTriangle size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black text-amber-900 dark:text-amber-100">
              يوجد {stats.alertsCount} عنصراً يحتاج المراجعة
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] font-bold">
              {stats.listingsPending > 0 && can("listings.approve") && (
                <Link
                  href="/admin/listings?status=pending"
                  className="inline-flex items-center gap-1 text-amber-800 hover:underline dark:text-amber-200"
                >
                  <Clock size={12} />
                  {stats.listingsPending} إعلان معلَّق
                  <ArrowLeft size={12} />
                </Link>
              )}
              {stats.featuredRequestsPending > 0 && can("listings.feature") && (
                <Link
                  href="/admin/featured-requests"
                  className="inline-flex items-center gap-1 text-amber-800 hover:underline dark:text-amber-200"
                >
                  <Sparkles size={12} />
                  {stats.featuredRequestsPending} طلب تمييز
                  <ArrowLeft size={12} />
                </Link>
              )}
              {stats.reportsPending > 0 && can("reports.view") && (
                <Link
                  href="/admin/moderation/reports"
                  className="inline-flex items-center gap-1 text-amber-800 hover:underline dark:text-amber-200"
                >
                  <Flag size={12} />
                  {stats.reportsPending} بلاغ جديد
                  <ArrowLeft size={12} />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== مؤشرات الأداء ===== */}
      <section>
        <SectionTitle>أرقام رئيسية</SectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {can("listings.view") && (
            <>
              <StatCard label="إجمالي الإعلانات" value={stats.listingsTotal} icon={ListChecks} tone="brand" href="/admin/listings" />
              <StatCard
                label="معلَّقة"
                value={stats.listingsPending}
                icon={Clock}
                tone="amber"
                alertCount={stats.listingsPending}
                href={can("listings.approve") ? "/admin/listings?status=pending" : undefined}
              />
              <StatCard label="معتمدة" value={stats.listingsApproved} icon={CheckCircle2} tone="emerald" />
              <StatCard label="مرفوضة" value={stats.listingsRejected} icon={XCircle} tone="rose" />
            </>
          )}
          {can("users.view") && (
            <>
              <StatCard label="المستخدمون" value={stats.usersTotal} icon={Users} tone="brand" href="/admin/users" />
              <StatCard label="جدد (7 أيام)" value={stats.usersNewLast7Days} icon={TrendingUp} tone="emerald" />
              {stats.usersBanned > 0 && (
                <StatCard label="محظورون" value={stats.usersBanned} icon={Ban} tone="rose" />
              )}
            </>
          )}
          <StatCard label="إجمالي المشاهدات" value={stats.listingsViews} icon={Eye} tone="slate" />
        </div>
      </section>

      {/* ===== التحكّم بالمزايا ===== */}
      {can("features.toggle") && <FeatureControl />}

      {/* ===== مركز التحكّم (كل الأقسام) ===== */}
      <ControlCenter can={can} stats={stats} />

      {/* ===== نظرة على النمو ===== */}
      {can("analytics.view") && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle className="mb-0">نظرة على النمو</SectionTitle>
            <Link
              href="/admin/analytics"
              prefetch={false}
              className="inline-flex items-center gap-1 text-[11px] font-black text-brand-700 hover:underline dark:text-brand-300"
            >
              <BarChart3 size={12} />
              التحليلات الكاملة
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <GrowthChart title="نمو المستخدمين" description="آخر 30 يوم" data={analytics.usersDaily} total={analytics.usersInPeriod} color="brand" loading={analytics.loading} />
            <GrowthChart title="نمو الإعلانات" description="آخر 30 يوم" data={analytics.listingsDaily} total={analytics.listingsInPeriod} color="action" loading={analytics.loading} />
          </div>
        </section>
      )}

      {role && (
        <p className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
          أنت مسجَّل دخول كـ <strong>{role}</strong>. لو احتجت صلاحيات إضافية، تواصل مع المدير العام.
        </p>
      )}
    </div>
  );
}

/* ============== التحكّم بالمزايا ============== */
function FeatureControl() {
  const toast = useToast();
  const { flags, loaded } = useAllFeatureFlags();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  async function toggle(key: FeatureFlagKey, current: boolean) {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/features/${key}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ enabled: !current }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "تعذّر التحديث");
      }
      toast.success(!current ? "تم تفعيل الميزة" : "تم إيقاف الميزة");
      // الحالة تتحدّث تلقائياً عبر onSnapshot في useAllFeatureFlags.
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تحديث الميزة");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <section>
      <SectionTitle>التحكّم بالمزايا</SectionTitle>
      <div className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300">
            <ToggleRight size={17} />
          </span>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
            شغّل أو أوقف أي ميزة فوراً لكل المستخدمين — بدون إعادة نشر.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {ALL_FEATURE_FLAGS.map((key) => {
            const meta = FLAG_METADATA[key];
            const doc = flags.get(key);
            const enabled = doc?.enabled ?? meta.defaultEnabled;
            const isBusy = busyKey === key;
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                      }`}
                    />
                    <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                      {meta.label}
                    </h3>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {meta.description}
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={enabled}
                  disabled={!loaded || isBusy}
                  onClick={() => toggle(key, enabled)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60 ${
                    enabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                  }`}
                >
                  {isBusy ? (
                    <Loader2
                      size={14}
                      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin text-white"
                    />
                  ) : (
                    <span
                      className={`absolute h-5 w-5 rounded-full bg-white shadow transition-all ${
                        enabled ? "right-1" : "right-6"
                      }`}
                    />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <Link
          href="/admin/settings/features"
          prefetch={false}
          className="mt-3 inline-flex items-center gap-1 px-1 text-[11px] font-black text-brand-700 hover:underline dark:text-brand-300"
        >
          إدارة المزايا بالتفصيل
          <ArrowLeft size={12} />
        </Link>
      </div>
    </section>
  );
}

/* ============== مركز التحكّم (شبكة الأقسام) ============== */
type CanFn = (action: string) => boolean;

function ControlCenter({
  can,
  stats,
}: {
  can: CanFn;
  stats: ReturnType<typeof useAdminStats>;
}) {
  const groups: {
    title: string;
    items: {
      href: string;
      label: string;
      desc: string;
      Icon: LucideIcon;
      tone: Tone;
      show: boolean;
      badge?: number;
    }[];
  }[] = [
    {
      title: "المحتوى",
      items: [
        { href: "/admin/listings", label: "الإعلانات", desc: "مراجعة واعتماد الإعلانات", Icon: ListChecks, tone: "brand", show: can("listings.view"), badge: stats.listingsPending },
        { href: "/admin/featured-requests", label: "طلبات التمييز", desc: "اعتماد طلبات تمييز الإعلانات", Icon: Sparkles, tone: "amber", show: can("listings.feature"), badge: stats.featuredRequestsPending },
        { href: "/admin/dealer-stories", label: "قصص المعارض", desc: "إدارة قصص المعارض", Icon: Rocket, tone: "brand", show: can("content.edit") },
        { href: "/admin/brands", label: "شعارات الماركات", desc: "شعارات وأسماء الماركات", Icon: Building2, tone: "slate", show: can("content.edit") },
      ],
    },
    {
      title: "المستخدمون والإشراف",
      items: [
        { href: "/admin/users", label: "المستخدمون", desc: "إدارة الحسابات والصلاحيات", Icon: Users, tone: "brand", show: can("users.view") },
        { href: "/admin/moderation/reports", label: "البلاغات", desc: "مراجعة البلاغات الواردة", Icon: Flag, tone: "rose", show: can("reports.view"), badge: stats.reportsPending },
        { href: "/admin/moderation/banned-words", label: "الكلمات المحظورة", desc: "فلترة المحتوى غير اللائق", Icon: ShieldAlert, tone: "rose", show: can("reports.handle") },
      ],
    },
    {
      title: "المال والاشتراكات",
      items: [
        { href: "/admin/wallet", label: "إدارة المحافظ", desc: "أرصدة المستخدمين والمعاملات", Icon: Wallet, tone: "emerald", show: true },
        { href: "/admin/topup-requests", label: "طلبات الشحن", desc: "مراجعة طلبات شحن الرصيد", Icon: ArrowDownToLine, tone: "amber", show: true },
        { href: "/admin/transfers", label: "التحويلات", desc: "تحويلات الرصيد بين المستخدمين", Icon: ArrowLeftRight, tone: "brand", show: true },
        { href: "/admin/subscriptions", label: "الاشتراكات", desc: "اشتراكات توثيق المعارض", Icon: BadgeCheck, tone: "emerald", show: true },
        { href: "/admin/referrals", label: "الإحالات", desc: "نظام الدعوات والمكافآت", Icon: Gift, tone: "action", show: true },
        { href: "/admin/wallet-settings", label: "إعدادات المحفظة", desc: "أسعار الباقات والرصيد", Icon: Wallet, tone: "slate", show: true },
      ],
    },
    {
      title: "الاتصال والموقع",
      items: [
        { href: "/admin/broadcast", label: "إشعار جماعي", desc: "أرسل تنبيهاً لكل المستخدمين", Icon: Megaphone, tone: "action", show: can("broadcast.send") },
        { href: "/admin/broadcast/history", label: "سجلّ البث", desc: "الإشعارات المُرسَلة سابقاً", Icon: History, tone: "slate", show: can("broadcast.send") },
        { href: "/admin/content/homepage", label: "الصفحة الرئيسية", desc: "ترتيب أقسام الواجهة", Icon: Home, tone: "brand", show: can("homepage.edit") },
        { href: "/admin/content/pages", label: "صفحات الموقع", desc: "الشروط والخصوصية والمحتوى", Icon: FileText, tone: "slate", show: can("content.edit") },
        { href: "/admin/contact-info", label: "معلومات التواصل", desc: "أرقام وروابط التواصل", Icon: Phone, tone: "emerald", show: can("content.edit") },
      ],
    },
    {
      title: "النظام",
      items: [
        { href: "/admin/settings/features", label: "المزايا", desc: "تشغيل/إيقاف ميزات التطبيق", Icon: ToggleRight, tone: "action", show: can("features.toggle") },
        { href: "/admin/analytics", label: "التحليلات", desc: "إحصائيات النمو والأداء", Icon: BarChart3, tone: "brand", show: can("analytics.view") },
        { href: "/admin/system/logs", label: "سجلّ النظام", desc: "سجلّ عمليات الأدمن", Icon: ScrollText, tone: "slate", show: can("logs.view") },
      ],
    },
  ];

  return (
    <section className="space-y-5">
      <SectionTitle>مركز التحكّم</SectionTitle>
      {groups.map((g) => {
        const visible = g.items.filter((i) => i.show);
        if (visible.length === 0) return null;
        return (
          <div key={g.title}>
            <h3 className="mb-2 px-1 text-[11px] font-black text-slate-400 dark:text-slate-500">
              {g.title}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((i) => (
                <ControlCard key={i.href} {...i} />
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}

type Tone = "brand" | "action" | "emerald" | "rose" | "amber" | "slate";

function ControlCard({
  href,
  label,
  desc,
  Icon,
  tone,
  badge,
}: {
  href: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  tone: Tone;
  badge?: number;
}) {
  const chip: Record<Tone, string> = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    action: "bg-action-50 text-action-600 dark:bg-action-500/15 dark:text-action-300",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    slate: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-800"
    >
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${chip[tone]}`}>
        <Icon size={18} strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h4 className="flex-1 truncate text-sm font-black text-slate-900 dark:text-white">
            {label}
          </h4>
          {typeof badge === "number" && badge > 0 && (
            <span className="shrink-0 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
              {badge}
            </span>
          )}
          <ArrowLeft
            size={14}
            className="shrink-0 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600"
          />
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500 dark:text-slate-400">
          {desc}
        </p>
      </div>
    </Link>
  );
}

/* ============== مساعد العنوان ============== */
function SectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 ${className}`}
    >
      {children}
    </h2>
  );
}
