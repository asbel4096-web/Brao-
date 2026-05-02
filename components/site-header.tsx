"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, memo, useEffect, useState } from "react";
import { Bell, MessageCircle, Plus, Search, User as UserIcon, Shield } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ThemeToggle } from "./theme-toggle";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";

const links = [
  { href: "/", label: "الرئيسية" },
  { href: "/listings", label: "الإعلانات" },
  { href: "/my-listings", label: "إعلاناتي" },
  { href: "/messages", label: "الدردشة" },
];

function SiteHeaderImpl() {
  const router = useRouter();
  const { user, profile, isAdmin } = useAuth();
  const [search, setSearch] = useState("");
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadNotifications(0);
      return;
    }

    // ✨ تأخير الاشتراك في الإشعارات حتى المتصفح يصبح خاملاً
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
      const id = (window as any).requestIdleCallback(startSubscription, { timeout: 2000 });
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
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl dark:border-slate-700/70 dark:bg-slate-950/90">
      <div className="container flex items-center gap-3 py-3 sm:py-4">
        <Link href="/" prefetch={false} className="flex items-center gap-3 shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-700 to-ink text-base font-black text-white shadow-blue">
            BC
          </div>
          <div className="hidden sm:block">
            <div className="text-xl font-black text-slate-950 dark:text-white leading-tight">
              براتشو كار
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
              سوق السيارات في ليبيا
            </div>
          </div>
        </Link>

        <form onSubmit={handleSearch} className="relative flex-1 max-w-2xl mx-auto">
          <Search
            size={18}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن سيارة، قطعة، ورشة..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pr-10 pl-3 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:bg-slate-950 dark:focus:ring-brand-900/40"
          />
        </form>

        <nav className="hidden lg:flex items-center gap-5 mx-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              prefetch={false}
              className="text-sm font-bold text-slate-700 hover:text-brand-700 dark:text-slate-200 dark:hover:text-brand-300"
            >
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link
              href="/admin"
              prefetch={false}
              className="inline-flex items-center gap-1 text-sm font-bold text-action-700 hover:text-action-600"
            >
              <Shield size={14} /> الإدارة
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/notifications"
            prefetch={false}
            className="relative hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            aria-label="الإشعارات"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-action-500 px-1 text-[10px] font-black text-white">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </span>
            )}
          </Link>
          <Link
            href="/messages"
            prefetch={false}
            className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
            aria-label="الدردشة"
          >
            <MessageCircle size={18} />
          </Link>
          <ThemeToggle />

          <Link
            href="/add-listing"
            prefetch={false}
            className="btn-action !px-3 !py-2 sm:!px-5 sm:!py-3"
          >
            <Plus size={18} />
            <span className="hidden sm:inline">أضف إعلان</span>
          </Link>

          {user ? (
            <Link
              href="/profile"
              prefetch={false}
              aria-label="حسابي"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-brand-700 text-white font-black"
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
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200"
              aria-label="تسجيل الدخول"
            >
              <UserIcon size={18} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export const SiteHeader = memo(SiteHeaderImpl);
