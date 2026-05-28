"use client";

import Link from "next/link";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useAdminStats } from "@/hooks/admin/use-admin-stats";
import { StatCard } from "@/components/admin/ui/stat-card";

/**
 * Dashboard الرئيسي للأدمن.
 *
 * المكوّنات:
 *  1. Welcome header (اسم الأدمن + ترحيب)
 *  2. Alerts row (تنبيهات تحتاج إجراء فوري - أحمر)
 *  3. KPIs grid (الأرقام الكبيرة)
 *  4. Quick actions (أزرار للإجراءات الشائعة)
 *  5. Activity feed (لاحقاً - مرحلة منفصلة)
 *
 * كل بطاقة قابلة للضغط لتفتح صفحة التفاصيل، ما لم تكن متاحة من دون
 * صلاحية الأدمن.
 */

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const { can, role } = useAdminRole();
  const stats = useAdminStats();

  const firstName = profile?.name?.split(" ")[0] || "أيها الأدمن";

  return (
    <div className="space-y-5">
      {/* Header */}
      <header>
        <h1 className="text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
          مرحباً، {firstName}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          إليك نظرة عامة على ما يحدث في براتشو كار اليوم.
        </p>
      </header>

      {/* Alerts - تنبيهات تستدعي إجراء */}
      {stats.alertsCount > 0 && (
        <div
          className="
            flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4
            dark:border-amber-900/40 dark:bg-amber-900/20
          "
        >
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

      {/* KPIs Grid */}
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          أرقام رئيسية
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {can("listings.view") && (
            <>
              <StatCard
                label="إجمالي الإعلانات"
                value={stats.listingsTotal}
                icon={ListChecks}
                tone="brand"
                href="/admin/listings"
              />
              <StatCard
                label="معلَّقة"
                value={stats.listingsPending}
                icon={Clock}
                tone="amber"
                alertCount={stats.listingsPending}
                href={
                  can("listings.approve")
                    ? "/admin/listings?status=pending"
                    : undefined
                }
              />
              <StatCard
                label="معتمدة"
                value={stats.listingsApproved}
                icon={CheckCircle2}
                tone="emerald"
              />
              <StatCard
                label="مرفوضة"
                value={stats.listingsRejected}
                icon={XCircle}
                tone="rose"
              />
            </>
          )}

          {can("users.view") && (
            <>
              <StatCard
                label="المستخدمون"
                value={stats.usersTotal}
                icon={Users}
                tone="brand"
                href="/admin/users"
              />
              <StatCard
                label="جدد (7 أيام)"
                value={stats.usersNewLast7Days}
                icon={TrendingUp}
                tone="emerald"
              />
              {stats.usersBanned > 0 && (
                <StatCard
                  label="محظورون"
                  value={stats.usersBanned}
                  icon={Ban}
                  tone="rose"
                />
              )}
            </>
          )}

          <StatCard
            label="إجمالي المشاهدات"
            value={stats.listingsViews}
            icon={Eye}
            tone="slate"
          />
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          إجراءات سريعة
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {can("listings.approve") && (
            <QuickActionCard
              href="/admin/listings?status=pending"
              icon={ListChecks}
              title="مراجعة الإعلانات"
              description="اعتمد أو ارفض الإعلانات المعلَّقة"
              count={stats.listingsPending}
            />
          )}
          {can("broadcast.send") && (
            <QuickActionCard
              href="/admin/broadcast"
              icon={Sparkles}
              title="إرسال إشعار جماعي"
              description="أرسل تنبيهاً لكل المستخدمين"
            />
          )}
          {can("reports.view") && (
            <QuickActionCard
              href="/admin/moderation/reports"
              icon={Flag}
              title="مراجعة البلاغات"
              description="استعرض البلاغات الواردة"
              count={stats.reportsPending}
            />
          )}
        </div>
      </section>

      {/* Footer hint - role info */}
      {role && (
        <p className="pt-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
          أنت مسجَّل دخول كـ <strong>{role}</strong>. لو احتجت صلاحيات إضافية،
          تواصل مع المدير العام.
        </p>
      )}
    </div>
  );
}

/**
 * بطاقة Quick action - مع أيقونة + شرح + عداد اختياري.
 */
function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  count,
}: {
  href: string;
  icon: typeof ListChecks;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="
        group flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white p-4
        shadow-sm transition hover:border-brand-300 hover:shadow-md
        dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700
      "
    >
      <div
        className="
          flex h-10 w-10 shrink-0 items-center justify-center rounded-xl
          bg-brand-50 text-brand-700 transition group-hover:bg-brand-100
          dark:bg-brand-900/30 dark:text-brand-300 dark:group-hover:bg-brand-900/50
        "
      >
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-sm font-black text-slate-900 dark:text-white">
            {title}
          </h3>
          {typeof count === "number" && count > 0 && (
            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white">
              {count}
            </span>
          )}
        </div>
        <p className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
    </Link>
  );
}
