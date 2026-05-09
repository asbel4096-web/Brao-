"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, memo, useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Search,
  Shield,
  User as UserIcon,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

/**
 * Header احترافي بسيط:
 *
 * **الموبايل (3 عناصر فقط):**
 *   [Logo + اسم] ………………… [Profile/Login]
 *   [Search field كامل العرض]
 *
 *   لا أيقونات إضافية - باقي الإجراءات في bottom-nav
 *   (الرئيسية، الإعلانات، الإضافة، المفضلة، الرسائل).
 *
 * **الديسكتوب (lg+):**
 *   [Logo] [Search] [Links] [Notifications] [Theme] [+ إضافة] [Profile]
 *
 * هذا يوحّد التجربة:
 * - الموبايل = 100% للبحث (الإجراء الأهم)
 * - الديسكتوب = navigation كامل
 */

const NAV_LINKS = [
  { href: "/listings", label: "الإعلانات" },
  { href: "/categories", label: "الأقسام" },
  { href: "/vehicle-report", label: "فحص VIN" },
];

function SiteHeaderImpl() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // اشتراك مؤجَّل بالإشعارات (نحتفظ به - مهم للديسكتوب)
  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const startSubscription = () => {
      if (cancelled) return;
      const q = query(
        collection(db, "notifications"),
        where("userId", "==", user.uid),
        where("read", "==", false)
      );
      unsub = onSnapshot(
        q,
        (snap) => setUnreadNotifications(snap.size),
        () => setUnreadNotifications(0)
      );
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(startSubscription, {
        timeout: 2000,
      });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
        unsub?.();
      };
    } else {
      const t = setTimeout(startSubscription, 800);
      return () => {
        cancelled = true;
        clearTimeout(t);
        unsub?.();
      };
    }
  }, [user]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/listings?q=${encodeURIComponent(q)}` : "/listings");
  };

  const initial =
    profile?.name?.trim()?.charAt(0)?.toUpperCase() ||
    user?.email?.charAt(0)?.toUpperCase() ||
    user?.phoneNumber?.charAt(0) ||
    "U";

  return (
    <header
      className="
        sticky top-0 z-40 border-b border-slate-200/70
        bg-white/90 backdrop-blur-xl
        dark:border-slate-700/70 dark:bg-slate-950/90
      "
    >
      <div className="container">
        {/* ============== الصف العلوي ============== */}
        <div className="flex items-center gap-3 py-2.5 sm:py-3.5">
          {/* Logo */}
          <Link
            href="/"
            prefetch={false}
            aria-label="الصفحة الرئيسية"
            className="flex shrink-0 items-center gap-2.5"
          >
            <div
              className="
                flex h-10 w-10 items-center justify-center
                rounded-2xl bg-gradient-to-br from-brand-700 to-ink
                text-base font-black text-white shadow-blue
                sm:h-11 sm:w-11
              "
            >
              <span className="leading-none">BC</span>
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-base font-black text-slate-950 dark:text-white sm:text-lg">
                براتشو كار
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                سوق السيارات في ليبيا
              </div>
            </div>
          </Link>

          {/* Search - يظهر على sm+ بجانب الـ logo */}
          <form
            onSubmit={handleSearch}
            className="relative mx-auto hidden max-w-2xl flex-1 sm:block"
            role="search"
          >
            <Search
              size={16}
              className="
                pointer-events-none absolute right-3 top-1/2
                -translate-y-1/2 text-slate-400
              "
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سيارة، قطعة، ورشة..."
              aria-label="ابحث في الإعلانات"
              className="
                w-full rounded-2xl border border-slate-200 bg-slate-50
                py-2.5 pr-9 pl-3 text-sm outline-none transition
                placeholder:text-slate-400
                focus:border-brand-400 focus:bg-white focus:ring-4
                focus:ring-brand-100
                dark:border-slate-700 dark:bg-slate-900 dark:text-white
                dark:focus:bg-slate-950 dark:focus:ring-brand-900/40
              "
            />
          </form>

          {/* Nav links - lg+ فقط */}
          <nav
            className="hidden items-center gap-5 lg:flex"
            aria-label="القائمة الرئيسية"
          >
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                className="
                  text-sm font-bold text-slate-700 transition-colors
                  hover:text-brand-700
                  dark:text-slate-200 dark:hover:text-brand-300
                "
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                prefetch={false}
                className="
                  inline-flex items-center gap-1 text-sm font-bold
                  text-action-700 hover:text-action-600
                "
              >
                <Shield size={14} />
                الإدارة
              </Link>
            )}
          </nav>

          {/* الإجراءات على اليسار */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* الإشعارات - sm+ فقط */}
            {user && (
              <Link
                href="/notifications"
                prefetch={false}
                aria-label={
                  unreadNotifications > 0
                    ? `الإشعارات (${unreadNotifications} غير مقروء)`
                    : "الإشعارات"
                }
                className="
                  relative hidden h-10 w-10 items-center justify-center
                  rounded-2xl border border-slate-200 text-slate-600
                  transition hover:border-brand-300 hover:text-brand-700
                  active:scale-95
                  dark:border-slate-700 dark:text-slate-300
                  dark:hover:border-brand-700 dark:hover:text-brand-300
                  sm:inline-flex
                "
              >
                <Bell size={17} />
                {unreadNotifications > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1 flex h-4 min-w-[16px]
                      items-center justify-center rounded-full
                      border-2 border-white bg-action-500 px-1
                      text-[9px] font-black leading-none text-white
                      dark:border-slate-950
                    "
                  >
                    {unreadNotifications > 9 ? "9+" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            {/* Theme - sm+ فقط */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* زر إضافة إعلان - sm+ فقط (في الموبايل موجود في bottom-nav) */}
            <Link
              href="/add-listing"
              prefetch={false}
              className="
                hidden items-center gap-1.5 rounded-2xl
                bg-action-500 px-3 py-2 text-xs font-black text-white
                shadow-action transition active:scale-[0.97]
                hover:bg-action-600
                sm:inline-flex sm:px-4 sm:py-2.5 sm:text-sm
              "
            >
              <Plus size={16} />
              <span>إعلان جديد</span>
            </Link>

            {/* Profile / Login */}
            {user ? (
              <Link
                href="/profile"
                prefetch={false}
                aria-label="حسابي"
                className="
                  inline-flex h-10 w-10 items-center justify-center
                  overflow-hidden rounded-2xl
                  border border-slate-200 bg-gradient-to-br
                  from-brand-700 to-brand-500 text-sm font-black text-white
                  transition active:scale-95
                  dark:border-slate-700
                "
              >
                {profile?.photoURL ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.photoURL}
                    alt={profile.name || "profile"}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  initial
                )}
              </Link>
            ) : (
              <Link
                href="/login"
                prefetch={false}
                aria-label="تسجيل الدخول"
                className="
                  inline-flex h-10 w-10 items-center justify-center
                  rounded-2xl border border-slate-200 text-slate-700
                  transition hover:border-brand-300 hover:text-brand-700
                  active:scale-95
                  dark:border-slate-700 dark:text-slate-200
                  dark:hover:border-brand-700 dark:hover:text-brand-300
                "
              >
                <UserIcon size={18} />
              </Link>
            )}
          </div>
        </div>

        {/* ============== شريط البحث للموبايل (يظهر فقط على sm-) ============== */}
        <form
          onSubmit={handleSearch}
          className="relative pb-2.5 sm:hidden"
          role="search"
        >
          <Search
            size={16}
            className="
              pointer-events-none absolute right-3 top-1/2
              -translate-y-1/2 text-slate-400
            "
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن سيارة، قطعة، ورشة..."
            aria-label="ابحث في الإعلانات"
            className="
              w-full rounded-2xl border border-slate-200 bg-slate-50
              py-2.5 pr-9 pl-3 text-sm outline-none transition
              placeholder:text-slate-400
              focus:border-brand-400 focus:bg-white focus:ring-4
              focus:ring-brand-100
              dark:border-slate-700 dark:bg-slate-900 dark:text-white
              dark:focus:bg-slate-950 dark:focus:ring-brand-900/40
            "
          />
        </form>
      </div>
    </header>
  );
}

export const SiteHeader = memo(SiteHeaderImpl);
