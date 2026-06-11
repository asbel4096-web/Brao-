"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
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
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
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
  const hidden = useHideOnScroll({ topOffset: 64, threshold: 6 });
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

  // إخفاء عند التمرير لأسفل، ويبقى مخفياً عند التوقّف، ويظهر عند التمرير لأعلى.
  // (المنطق في useHideOnScroll — حالة لاصقة لا تعود تلقائياً عند التوقّف)

  return (
    <motion.div
      className="md:hidden fixed inset-x-0 bottom-0 z-50"
      style={{
        // المساحة الآمنة لأسفل iPhone (Home indicator / Dynamic Island)
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      initial={false}
      animate={{
        // ينزل خارج الشاشة عند التمرير لأسفل، ويعود عند التمرير لأعلى
        y: hidden ? "120%" : "0%",
        opacity: hidden ? 0 : 1,
      }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      // عند الإخفاء، نمنع التفاعل
      data-hidden={hidden}
    >
      {/* الحاوية العائمة - هوامش 12px من كل جهة */}
      <div
        className="pointer-events-none relative mx-3 mb-3"
        style={{ pointerEvents: hidden ? "none" : "auto" }}
      >
        {/* زر الإضافة العائم (FAB) - يخرج فوق الشريط */}
        <Link
          href="/add-listing"
          prefetch={false}
          aria-label="إضافة إعلان"
          className="pointer-events-auto absolute left-1/2 z-10 -translate-x-1/2"
          style={{ top: "-18px" }}
        >
          <motion.span
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className={cn(
              "flex h-[58px] w-[58px] items-center justify-center rounded-full",
              "bg-[#2563EB] text-white",
              "shadow-[0_10px_30px_-6px_rgba(37,99,235,0.55)]",
              "ring-4 ring-white/70 dark:ring-slate-900/60"
            )}
          >
            <Plus size={28} strokeWidth={2.6} />
          </motion.span>
        </Link>

        {/* الشريط الزجاجي العائم */}
        <nav
          aria-label="التنقل الرئيسي"
          className="pointer-events-auto relative flex h-[64px] items-stretch overflow-hidden rounded-[28px]"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(25px)",
            WebkitBackdropFilter: "blur(25px)",
            border: "1px solid rgba(255,255,255,0.4)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
          }}
        >
          {items.map((item) => {
            // مكان زر الإضافة في الوسط - نترك فراغاً (الزر عائم فوقه)
            if (item.raised) {
              return <div key={item.href} className="flex-1" aria-hidden="true" />;
            }

            const active = pathname === item.href;

            // قيمة الـbadge
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
                className="relative flex flex-1 items-center justify-center"
              >
                <motion.span
                  whileTap={{ scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 500, damping: 18 }}
                  className="flex flex-col items-center justify-center gap-1"
                >
                  <span className="relative">
                    <Icon
                      size={23}
                      strokeWidth={active ? 2.5 : 2}
                      style={{ color: active ? "#2563EB" : "#64748B" }}
                      className={cn(
                        "transition-all duration-200",
                        active && "fill-current"
                      )}
                    />

                    {/* badge العدد */}
                    {badgeValue > 0 && (
                      <span
                        className={cn(
                          "absolute -right-2 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1",
                          "text-[10px] font-black leading-none text-white",
                          "ring-2 ring-white",
                          item.badge === "favorites" ? "bg-rose-500" : "bg-[#2563EB]"
                        )}
                        aria-label={`${badgeValue} غير مقروء`}
                      >
                        {badgeValue > 9 ? "9+" : badgeValue}
                      </span>
                    )}
                  </span>

                  <span
                    className="text-[10px] leading-none transition-all"
                    style={{
                      color: active ? "#2563EB" : "#64748B",
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {item.label}
                  </span>
                </motion.span>
              </Link>
            );
          })}
        </nav>
      </div>
    </motion.div>
  );
}

export default memo(BottomNavImpl);
