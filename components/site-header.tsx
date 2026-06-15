"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletTrigger } from "@/components/wallet/wallet-trigger";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, memo, useEffect, useState } from "react";
import { Bell, Plus, Search, Shield, User as UserIcon } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

/**
 * Header (إعادة بناء Mobile-First — بلا تموضع absolute).
 *
 * لماذا أُعيد بناؤه؟
 *   النسخة السابقة كانت تضع الشعار `absolute left-1/2 -translate-x-1/2`
 *   (توسيط مطلق) فوق صفّ flex، فيتراكب الشعار مع رصيد BC وزر الثيم على
 *   الشاشات الصغيرة (iPhone SE). الحل: صفّ flex واحد `justify-between`
 *   بثلاثة أبناء (شعار | روابط | إجراءات). أبناء flex لا تتراكب أبداً.
 *
 * البنية:
 *   [الشعار]  …(روابط الديسكتوب)…  [إشعارات][محفظة][ثيم][+ ديسكتوب][حساب]
 *
 * Safe Area:
 *   نضيف paddingTop = env(safe-area-inset-top) ليبتعد المحتوى عن النوتش،
 *   و padding أفقي للـnotch في الوضع الأفقي.
 *
 * Responsive:
 *   - الموبايل: شعار + (إشعارات/محفظة/ثيم/حساب). زر «إعلان جديد» يظهر sm+.
 *   - الديسكتوب: + روابط التنقّل في المنتصف.
 *   كل العناصر `shrink-0` ما عدا منطقة الروابط `min-w-0` لتتقلّص أولاً.
 */

const NAV_LINKS = [
  { href: "/listings", label: "الإعلانات" },
  { href: "/categories", label: "الأقسام" },
  { href: "/vehicle-report", label: "فحص VIN" },
];

function SiteHeaderImpl() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { user, profile, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

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
      dir="rtl"
      // Safe Area: يُبعد الهيدر عن نوتش الآيفون (أعلى + جانبَي الوضع الأفقي)
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
      className="
        sticky top-0 z-40 border-b border-white/10
        bg-gradient-to-b from-[#0c1a3a] to-[#0a1330]
        backdrop-blur-xl
      "
    >
      <div className="container">
        {/* صفّ واحد: شعار | روابط (ديسكتوب) | إجراءات — بلا تراكب */}
        <div className="flex min-w-0 items-center justify-between gap-2 py-2 sm:py-2.5">
          {/* الشعار (بداية RTL = يمين) */}
          <Link
            href="/"
            prefetch={false}
            aria-label="براتشو كار - الصفحة الرئيسية"
            className="flex shrink-0 items-center"
          >
            <Image
              src="/brand/bratsho-logo.png"
              alt="براتشو كار"
              width={539}
              height={200}
              priority
              className="h-7 w-auto max-w-[130px] sm:h-8 sm:max-w-none"
            />
          </Link>

          {/* روابط الديسكتوب (المنتصف المرن — يتقلّص أولاً) */}
          <nav
            className="hidden min-w-0 items-center gap-5 lg:flex"
            aria-label="القائمة الرئيسية"
          >
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                prefetch={false}
                className="whitespace-nowrap text-sm font-bold text-white/80 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            ))}
            {isAdmin && (
              <Link
                href="/admin"
                prefetch={false}
                className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-action-400 hover:text-action-300"
              >
                <Shield size={14} />
                الإدارة
              </Link>
            )}
          </nav>

          {/* الإجراءات (نهاية RTL = يسار) */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
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
                  relative inline-flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-2xl border border-white/15 bg-white/5 text-white/90
                  transition hover:bg-white/15 active:scale-95 sm:h-10 sm:w-10
                "
              >
                <Bell size={17} />
                {unreadNotifications > 0 && (
                  <span
                    className="
                      absolute -top-1 -right-1 flex h-4 min-w-[16px]
                      items-center justify-center rounded-full
                      border-2 border-[#0a1330] bg-action-500 px-1
                      text-[9px] font-black leading-none text-white
                    "
                  >
                    {unreadNotifications > 99 ? "+99" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            <WalletTrigger variant="compact" className="shrink-0" />

            <ThemeToggle className="!h-9 !w-9 shrink-0 !border-white/15 !bg-white/10 !text-white hover:!bg-white/20 sm:!h-10 sm:!w-10" />

            <Link
              href="/add-listing"
              prefetch={false}
              className="
                hidden shrink-0 items-center gap-1.5 rounded-2xl bg-action-500 px-3 py-2
                text-xs font-black text-white shadow-action transition
                hover:bg-action-600 active:scale-[0.97]
                sm:inline-flex sm:px-4 sm:py-2.5 sm:text-sm
              "
            >
              <Plus size={16} />
              <span>إعلان جديد</span>
            </Link>

            {user ? (
              <Link
                href="/profile"
                prefetch={false}
                aria-label="حسابي"
                className="
                  inline-flex h-9 w-9 shrink-0 items-center justify-center
                  overflow-hidden rounded-2xl border border-white/15
                  bg-gradient-to-br from-brand-600 to-brand-500
                  text-sm font-black text-white transition active:scale-95
                  sm:h-10 sm:w-10
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
                  inline-flex h-9 w-9 shrink-0 items-center justify-center
                  rounded-2xl border border-white/15 bg-white/5 text-white
                  transition hover:bg-white/15 active:scale-95 sm:h-10 sm:w-10
                "
              >
                <UserIcon size={18} />
              </Link>
            )}
          </div>
        </div>

        {/* شريط البحث (خارج الرئيسية فقط) */}
        {!isHome && (
          <form onSubmit={handleSearch} className="relative pb-2.5" role="search">
            <Search
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن سيارة، قطعة، ورشة..."
              aria-label="ابحث في الإعلانات"
              className="
                w-full rounded-2xl border border-white/15 bg-white/10 py-2.5
                pr-9 pl-3 text-sm text-white outline-none transition
                placeholder:text-white/50 focus:border-white/30
                focus:bg-white/15 focus:ring-4 focus:ring-white/10
              "
            />
          </form>
        )}
      </div>
    </header>
  );
}

export const SiteHeader = memo(SiteHeaderImpl);
