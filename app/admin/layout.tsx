"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Shield, ListChecks, Users, CreditCard, LayoutDashboard } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login?redirect=" + encodeURIComponent(pathname));
      return;
    }
    if (!isAdmin) {
      router.replace("/");
    }
  }, [user, loading, isAdmin, router, pathname]);

  if (loading) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحقق من الصلاحيات...
        </div>
      </section>
    );
  }

  if (!user || !isAdmin) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center">
          <Shield size={42} className="mx-auto text-rose-600" />
          <p className="mt-4 font-bold text-rose-700">صلاحيات غير كافية</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            هذه الصفحة مخصّصة للمشرفين فقط.
          </p>
          <Link href="/" className="btn-secondary mt-4 inline-flex">العودة للرئيسية</Link>
        </div>
      </section>
    );
  }

  const links = [
    { href: "/admin", label: "نظرة عامة", Icon: LayoutDashboard },
    { href: "/admin/listings", label: "الإعلانات", Icon: ListChecks },
    { href: "/admin/users", label: "المستخدمون", Icon: Users },
    { href: "/admin/subscriptions", label: "الاشتراكات", Icon: CreditCard },
  ];

  return (
    <div className="container py-6 sm:py-8">
      <div className="mb-5 flex items-center gap-2 rounded-2xl border border-action-200 bg-action-50 px-4 py-3 text-sm text-action-700 dark:bg-action-700/20 dark:text-action-200 dark:border-action-700/40">
        <Shield size={16} /> أنت في وضع الإدارة
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="card p-3 lg:p-4 lg:sticky lg:top-24 lg:self-start">
          <nav className="flex gap-2 overflow-x-auto no-scrollbar lg:flex-col lg:overflow-visible">
            {links.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold transition ${
                    active
                      ? "bg-brand-700 text-white shadow-blue"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
