"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";
import { AdminTopbar } from "@/components/admin/layout/admin-topbar";
import { AdminMobileNav } from "@/components/admin/layout/admin-mobile-nav";

/**
 * Layout موحَّد لكل صفحات /admin/*.
 *
 * البنية:
 *  - Desktop (lg+): Sidebar ثابت يمين + topbar + content
 *  - Mobile/Tablet: Topbar + content، الـsidebar drawer منزلق
 *
 * Auth guard:
 *  - بدون login → redirect لـ /login
 *  - مع login بدون role → "غير مخوّل"
 *  - مع role → نعرض الـlayout
 *
 * تذكير: الـsidebar نفسه يفلتر الـlinks حسب permissions، لكن الـguard هنا
 * يمنع وصول non-admin أساساً للـlayout. كل صفحة فردية يجب أن تتحقق من
 * صلاحيتها الخاصة (دفاع متعدد الطبقات).
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading: authLoading } = useAuth();
  const { isAdminUser, loading: roleLoading } = useAdminRole();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Auth guard: redirect إذا لا login
  useEffect(() => {
    if (authLoading || roleLoading) return;
    if (!user) {
      router.replace("/login?next=/admin");
    }
  }, [user, authLoading, roleLoading, router]);

  // قراءة تفضيل الطي من localStorage (تستمر بين الجلسات)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("bratsho:admin-sidebar-collapsed");
      if (stored === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const handleCollapsedChange = (next: boolean) => {
    setCollapsed(next);
    try {
      window.localStorage.setItem(
        "bratsho:admin-sidebar-collapsed",
        next ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-sm text-slate-500">جارٍ التحميل...</div>
      </div>
    );
  }

  if (!user) {
    // الـredirect يحدث في الـeffect أعلاه - هنا فقط حالة عابرة
    return null;
  }

  if (!isAdminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-6 dark:bg-slate-950">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white">
            غير مخوَّل
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            لا تملك صلاحية الوصول إلى لوحة الإدارة.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950" dir="rtl">
      {/* Sidebar ثابت - desktop فقط */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <AdminSidebar
          collapsed={collapsed}
          onCollapsedChange={handleCollapsedChange}
        />
      </div>

      {/* Mobile drawer */}
      <AdminMobileNav
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {/* المحتوى */}
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}
