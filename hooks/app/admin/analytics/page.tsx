"use client";

import dynamic from "next/dynamic";
import {
  BarChart3,
  TrendingUp,
  Users,
  ListChecks,
  MapPin,
  Layers,
  Car,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import {
  useAnalyticsData,
  calculateChange,
} from "@/hooks/admin/use-analytics-data";
import { StatCard } from "@/components/admin/ui/stat-card";

/**
 * صفحة التحليلات الكاملة للأدمن.
 *
 * Recharts تُحمَّل dynamically (next/dynamic + ssr:false) لتجنّب:
 *  - مشاكل SSR لمكوّن client-only
 *  - زيادة الـbundle الأولي (recharts ~120KB)
 *
 * الصفحة تتطلب صلاحية analytics.view (تفحصها كنوع من الـdefense-in-depth،
 * بالإضافة لفحص layout/sidebar).
 */

// Charts dynamically imported - تقليل bundle الصفحة الرئيسية
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

const TopBarChart = dynamic(
  () =>
    import("@/components/admin/charts/top-bar-chart").then((m) => m.TopBarChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
    ),
  }
);

export default function AdminAnalyticsPage() {
  const { can } = useAdminRole();
  const data = useAnalyticsData();

  if (!can("analytics.view")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية التحليلات.
      </div>
    );
  }

  const usersChange = calculateChange(data.usersThisWeek, data.usersLastWeek);
  const listingsChange = calculateChange(
    data.listingsThisWeek,
    data.listingsLastWeek
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          <BarChart3 size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            التحليلات
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            آخر 30 يوم — البيانات من Firestore مباشرة.
          </p>
        </div>
      </header>

      {/* Error */}
      {data.error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          خطأ: {data.error}
        </div>
      )}

      {/* KPIs row */}
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          أرقام الأسبوع
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="مستخدمون جدد (7 أيام)"
            value={data.loading ? "..." : data.usersThisWeek}
            icon={Users}
            tone="brand"
            change={usersChange}
            changeLabel="مقابل الأسبوع السابق"
          />
          <StatCard
            label="إعلانات (7 أيام)"
            value={data.loading ? "..." : data.listingsThisWeek}
            icon={ListChecks}
            tone="action"
            change={listingsChange}
            changeLabel="مقابل الأسبوع السابق"
          />
          <StatCard
            label="مستخدمون (30 يوم)"
            value={data.loading ? "..." : data.usersInPeriod}
            icon={TrendingUp}
            tone="emerald"
          />
          <StatCard
            label="إعلانات (30 يوم)"
            value={data.loading ? "..." : data.listingsInPeriod}
            icon={TrendingUp}
            tone="emerald"
          />
        </div>
      </section>

      {/* Growth charts */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <GrowthChart
          title="نمو المستخدمين"
          description="المستخدمون الجدد لكل يوم"
          data={data.usersDaily}
          total={data.usersInPeriod}
          color="brand"
          loading={data.loading}
        />
        <GrowthChart
          title="نمو الإعلانات"
          description="الإعلانات الجديدة لكل يوم"
          data={data.listingsDaily}
          total={data.listingsInPeriod}
          color="action"
          loading={data.loading}
        />
      </section>

      {/* Top items */}
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          الأعلى انتشاراً
        </h2>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <TopBarChart
            title="أكثر المدن نشاطاً"
            description="مزيج من المستخدمين والإعلانات"
            data={data.topCities}
            color="brand"
            loading={data.loading}
          />
          <TopBarChart
            title="أكثر الأصناف"
            description="حسب الإعلانات الجديدة"
            data={data.topCategories}
            color="action"
            loading={data.loading}
          />
          <TopBarChart
            title="أكثر الماركات"
            description="حسب الإعلانات الجديدة"
            data={data.topBrands}
            color="emerald"
            loading={data.loading}
          />
        </div>
      </section>

      {/* Footer note */}
      <p className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
        البيانات تحدّث عند فتح الصفحة. اضغطي F5 للتحديث.
      </p>
    </div>
  );
}
