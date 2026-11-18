"use client";

import Link from "next/link";
import Image from "next/image";
import { WalletTrigger } from "@/components/wallet/wallet-trigger";
import { usePathname, useRouter } from "next/navigation";
import { FormEvent, memo, useEffect, useState } from "react";
import { Bell, Heart, Plus, Search, Shield, User as UserIcon } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import type { FeatureFlagKey } from "@/lib/features/types";

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

// Bratsho DS 1.0: روابط سطح المكتب بمصطلحات التطبيق («تقرير السيارة» بدل «فحص VIN»).
// الروابط المرتبطة بميزة تحترم مفتاح تفعيلها من لوحة الإدارة، مثل مداخل الصفحة الرئيسية.
const NAV_LINKS: { href: string; label: string; flag?: FeatureFlagKey }[] = [
  { href: "/listings", label: "الإعلانات" },
  { href: "/categories", label: "الأقسام" },
  { href: "/friday-market", label: "سوق الجمعة", flag: "friday_market" },
  { href: "/tow-trucks", label: "الساحبات", flag: "tow_service" },
  { href: "/traders", label: "التجار", flag: "dealers" },
  { href: "/vehicle-report", label: "تقرير السيارة" },
];

/** زر زجاجي موحّد في الترويسة: 40×40، حواف 16 (Bratsho DS). */
const GLASS_BTN =
  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] text-white/90 transition hover:bg-white/15 active:scale-95";

function SiteHeaderImpl() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const { user, profile, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [favCount, setFavCount] = useState(0);
  // مفاتيح التفعيل: اشتراك مشترك واحد موجود أصلاً في كل الصفحات (MaintenanceGate) — لا قراءات إضافية
  const fridayOn = useFeatureFlag("friday_market");
  const towOn = useFeatureFlag("tow_service");
  const dealersOn = useFeatureFlag("dealers");
  const flagOn: Partial<Record<FeatureFlagKey, boolean>> = {
    friday_market: fridayOn,
    tow_service: towOn,
    dealers: dealersOn,
  };
  const navLinks = NAV_LINKS.filter((l) => !l.flag || flagOn[l.flag] !== false);

  // عدّاد المفضلة (انتقل من الشريط السفلي مع أيقونة القلب — نفس الاشتراك، لا قراءات إضافية)
  useEffect(() => {
    if (!user) {
      setFavCount(0);
      return;
    }
    let unsub: (() => void) | null = null;
    let cancelled = false;
    const startSubscription = () => {
      if (cancelled) return;
      unsub = onSnapshot(
        collection(db, "users", user.uid, "favorites"),
        (snap) => setFavCount(snap.size),
        () => setFavCount(0)
      );
    };
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const id = (window as any).requestIdleCallback(startSubscription, { timeout: 2000 });
      return () => {
        cancelled = true;
        (window as any).cancelIdleCallback?.(id);
        unsub?.();
      };
    }
    const t = setTimeout(startSubscription, 800);
    return () => {
      cancelled = true;
      clearTimeout(t);
      unsub?.();
    };
  }, [user]);

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

  // لوحة الإدارة لها ترويسة وشريط جانبي خاصّان (AdminTopbar/AdminSidebar):
  // كانت الترويسة العامة تظهر فوقهما فتتكدّس ترويستان.
  if (pathname?.startsWith("/admin")) return null;

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
        bg-gradient-to-b from-header-from to-header-to
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
            {navLinks.map((l) => {
              const active = pathname === l.href || pathname?.startsWith(l.href + "/");
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  prefetch={false}
                  aria-current={active ? "page" : undefined}
                  className={`whitespace-nowrap text-sm font-bold transition-colors hover:text-white ${active ? "text-white" : "text-white/75"}`}
                >
                  {l.label}
                </Link>
              );
            })}
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
            <WalletTrigger variant="compact" className="shrink-0" />

            {user && (
              <Link
                href="/favorites"
                prefetch={false}
                aria-label={favCount > 0 ? `المفضلة (${favCount})` : "المفضلة"}
                className={GLASS_BTN}
              >
                <Heart size={17} />
                {favCount > 0 && (
                  <span className="num absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-header-to bg-action-500 px-1 text-[10px] font-extrabold leading-none text-white">
                    {favCount > 99 ? "+99" : favCount}
                  </span>
                )}
              </Link>
            )}

            {user && (
              <Link
                href="/notifications"
                prefetch={false}
                aria-label={
                  unreadNotifications > 0
                    ? `الإشعارات (${unreadNotifications} غير مقروء)`
                    : "الإشعارات"
                }
                className={GLASS_BTN}
              >
                <Bell size={17} />
                {unreadNotifications > 0 && (
                  <span className="num absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-header-to bg-action-500 px-1 text-[10px] font-extrabold leading-none text-white">
                    {unreadNotifications > 99 ? "+99" : unreadNotifications}
                  </span>
                )}
              </Link>
            )}

            {/* تبديل الوضع الداكن: للمسجّل في الترويسة من 640px وعلى الجوال من صفحة الإعدادات؛
                للزائر (لا يصل إلى الإعدادات) يبقى في الترويسة على كل المقاسات كما كان. */}
            <span className={user ? "hidden sm:inline-flex" : "inline-flex"}>
              <ThemeToggle className="!h-10 !w-10 shrink-0 !rounded-2xl !border-white/15 !bg-white/[0.07] !text-white hover:!bg-white/15" />
            </span>

            <Link
              href="/add-listing"
              prefetch={false}
              className="
                hidden shrink-0 items-center gap-1.5 rounded-2xl bg-action-500 px-3 py-2
                text-xs font-extrabold text-white shadow-action transition
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
                  inline-flex h-10 w-10 shrink-0 items-center justify-center
                  overflow-hidden rounded-2xl border border-white/20
                  bg-gradient-to-br from-brand-600 to-brand-500
                  text-sm font-extrabold text-white transition active:scale-95
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
                className={GLASS_BTN}
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
