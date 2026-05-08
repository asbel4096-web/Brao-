"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useState } from "react";
import {
  Heart,
  Home,
  LayoutGrid,
  MessageCircle,
  Plus,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { cn } from "@/lib/utils";

/**
 * Bottom navigation بمواصفات احترافية مثل Facebook/Instagram:
 *
 * - عرض كامل من الحافة للحافة (full-width).
 * - ارتفاع 56px للأيقونات + safe-area-inset-bottom للـ home indicator.
 * - أيقونات 24px (FB يستخدم 24-26).
 * - الأيقونة النشطة ممتلئة + لون brand.
 * - يختفي عند التمرير للأسفل، يظهر عند التمرير للأعلى أو التوقف.
 * - زر الإضافة بارز فوق الشريط (FAB style مثل Threads/IG).
 * - badges مدمجة على أيقونات المفضلة والدردشة.
 */

interface NavItem {
  href: string;
  label: string;
  Icon: typeof Home;
  /** أيقونة ممتلئة عند التنشيط (للحالة active) */
  ActiveIcon?: typeof Home;
  /** نوع الـ badge (لإظهار العدد) */
  badge?: "favorites" | "messages";
  /** زر الإضافة المرتفع */
  raised?: boolean;
}

const items: NavItem[] = [
  { href: "/", label: "الرئيسية", Icon: Home },
  { href: "/listings", label: "الإعلانات", Icon: LayoutGrid },
  { href: "/add-listing", label: "إضافة", Icon: Plus, raised: true },
  { href: "/favorites", label: "المفضلة", Icon: Heart, badge: "favorites" },
  { href: "/messages", label: "الدردشة", Icon: MessageCircle, badge: "messages" },
];

function BottomNavImpl() {
  const pathname = usePathname();
  const { user } = useAuth();
  const direction = useScrollDirection({ topOffset: 64, threshold: 6, idleDelay: 160 });
  const [unreadChats, setUnreadChats] = useState(0);
  const [favCount, setFavCount] = useState(0);

  // اشتراك بالمحادثات (مؤجَّل لتحسين الأداء)
  useEffect(() => {
    if (!user) {
      setUnreadChats(0);
      return;
    }
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const startSubscription = () => {
      if (cancelled) return;
      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", user.uid)
      );
      unsub = onSnapshot(
        q,
        (snap) => {
          let count = 0;
          snap.forEach((d) => {
            const data = d.data() as any;
            const c = data?.unreadCount?.[user.uid];
            if (typeof c === "number") count += c;
          });
          setUnreadChats(count);
        },
        () => setUnreadChats(0)
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

  // اشتراك بالمفضلة
  useEffect(() => {
    if (!user) {
      setFavCount(0);
      return;
    }
    let unsub: (() => void) | null = null;
    let cancelled = false;

    const startSubscription = () => {
      if (cancelled) return;
      const colRef = collection(db, "users", user.uid, "favorites");
      unsub = onSnapshot(
        colRef,
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
    } else {
      const t = setTimeout(startSubscription, 800);
      return () => {
        cancelled = true;
        clearTimeout(t);
        unsub?.();
      };
    }
  }, [user]);

  // إخفاء عند التمرير للأسفل، إظهار عند التمرير للأعلى أو التوقف
  const hidden = direction === "down";

  return (
    <div
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50",
        "transition-transform duration-300 ease-out will-change-transform",
        hidden ? "translate-y-full" : "translate-y-0"
      )}
      style={{
        // تجنّب overlap مع home indicator على iPhone
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <nav
        className={cn(
          "relative flex h-14 items-stretch border-t border-slate-200 bg-white/95 backdrop-blur-md",
          "dark:border-slate-800 dark:bg-slate-950/95",
          "shadow-[0_-1px_8px_rgba(15,23,42,0.04)] dark:shadow-[0_-1px_8px_rgba(0,0,0,0.4)]"
        )}
        aria-label="التنقل الرئيسي"
      >
        {items.map((item) => {
          const active = pathname === item.href;

          // زر الإضافة المرتفع (raised)
          if (item.raised) {
            return (
              <div
                key={item.href}
                className="relative flex flex-1 items-center justify-center"
              >
                <Link
                  href={item.href}
                  prefetch={false}
                  aria-label={item.label}
                  className={cn(
                    "absolute -top-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl",
                    "bg-action-500 text-white shadow-action transition-all duration-200",
                    "active:scale-95 hover:bg-action-600"
                  )}
                >
                  <Plus size={26} strokeWidth={2.5} />
                </Link>
              </div>
            );
          }

          // Badge value
          let badgeValue = 0;
          if (item.badge === "messages") badgeValue = unreadChats;
          if (item.badge === "favorites") badgeValue = favCount;

          const Icon = item.Icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150",
                "active:bg-slate-100/60 dark:active:bg-slate-800/60",
                active
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-slate-500 dark:text-slate-400"
              )}
            >
              <div className="relative">
                <Icon
                  size={24}
                  strokeWidth={active ? 2.4 : 2}
                  className={cn(
                    "transition-transform duration-200",
                    active && "scale-105 fill-current"
                  )}
                />

                {/* badge مدمج فوق الأيقونة */}
                {badgeValue > 0 && (
                  <span
                    className={cn(
                      "absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1",
                      "border-2 border-white text-[10px] font-black leading-none text-white",
                      "dark:border-slate-950",
                      item.badge === "favorites" ? "bg-rose-500" : "bg-action-500"
                    )}
                    aria-label={`${badgeValue} غير مقروء`}
                  >
                    {badgeValue > 9 ? "9+" : badgeValue}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  "text-[10px] leading-none transition-all",
                  active ? "font-black" : "font-bold"
                )}
              >
                {item.label}
              </span>

              {/* مؤشّر علوي للحالة النشطة (مثل IG) */}
              {active && (
                <span
                  aria-hidden="true"
                  className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-b-full bg-brand-700 dark:bg-brand-300"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default memo(BottomNavImpl);
