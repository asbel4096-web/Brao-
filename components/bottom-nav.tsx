"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  MessageCircle,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/* ============================================================
 * useHideOnScroll — منطق إخفاء الشريط (مدمج هنا، بلا ملف خارجي)
 *
 * السلوك:
 *  - تمرير لأسفل  → يُخفى الشريط.
 *  - توقّف        → يبقى مخفياً (حالة لاصقة، لا يعود تلقائياً).
 *  - تمرير لأعلى  → يظهر.
 *  - قرب القمة    → يظهر دائماً.
 * ============================================================ */
function useHideOnScroll(topOffset = 64, threshold = 6): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let lastY = window.scrollY;
    let accumulated = 0;
    let ticking = false;
    let isHidden = false;

    const update = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      if (currentY < topOffset) {
        if (isHidden) {
          isHidden = false;
          setHidden(false);
        }
        accumulated = 0;
        lastY = currentY;
        ticking = false;
        return;
      }

      if (Math.sign(delta) !== Math.sign(accumulated)) {
        accumulated = delta;
      } else {
        accumulated += delta;
      }

      if (Math.abs(accumulated) >= threshold) {
        const nextHidden = accumulated > 0; // نزول = إخفاء، صعود = إظهار
        if (nextHidden !== isHidden) {
          isHidden = nextHidden;
          setHidden(nextHidden);
        }
        accumulated = 0;
      }

      lastY = currentY;
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [topOffset, threshold]);

  return hidden;
}

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
  badge?: "messages";
  /** زر الإضافة المرتفع */
  raised?: boolean;
}

// Bratsho DS 1.0 (قرار ق١): نفس وجهات تطبيق Flutter ومصطلحاته.
// «المفضلة» انتقلت إلى أيقونة القلب في الترويسة (مع العدّاد) — لم تُحذف.
const items: NavItem[] = [
  { href: "/", label: "الرئيسية", Icon: Home },
  { href: "/listings", label: "الإعلانات", Icon: LayoutGrid },
  { href: "/add-listing", label: "إضافة", Icon: Plus, raised: true },
  { href: "/messages", label: "الرسائل", Icon: MessageCircle, badge: "messages" },
  { href: "/vehicle-report", label: "تقرير السيارة", Icon: ShieldCheck },
];

const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

/** صفحات لها شريط سفلي خاص (تواصل / كتابة رسالة) أو غلاف مستقل — لا نعرض الشريط فوقها. */
const hideNavOn = (pathname: string) =>
  pathname.startsWith("/admin") ||
  /^\/listings\/[^/]+$/.test(pathname) ||
  /^\/messages\/[^/]+$/.test(pathname) ||
  // صفحة عنصر سوق الجمعة لها شريط تواصل ثابت أسفل الشاشة (z-55) — لا الأرشيف
  /^\/friday-market\/(?!archive(?:\/|$))[^/]+$/.test(pathname);

function BottomNavImpl() {
  const pathname = usePathname();
  const { user } = useAuth();
  const hidden = useHideOnScroll(64, 6);
  const [unreadChats, setUnreadChats] = useState(0);

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

  // (اشتراك المفضلة انتقل إلى الترويسة مع أيقونة القلب — نفس عدد القراءات.)

  // إخفاء عند التمرير لأسفل، ويبقى مخفياً عند التوقّف، ويظهر عند التمرير لأعلى.
  // (المنطق في useHideOnScroll — حالة لاصقة لا تعود تلقائياً عند التوقّف)

  if (hideNavOn(pathname || "")) return null;

  return (
    <motion.div
      className="lg:hidden fixed inset-x-0 bottom-0 z-50"
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
        className="pointer-events-none relative mx-3 mb-2"
        style={{ pointerEvents: hidden ? "none" : "auto" }}
      >
        {/* زر الإضافة العائم (FAB) - يخرج فوق الشريط */}
        <Link
          href="/add-listing"
          prefetch={false}
          aria-label="إضافة إعلان"
          className="pointer-events-auto absolute left-1/2 z-10 -translate-x-1/2"
          style={{ top: "-16px" }}
        >
          <motion.span
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className={cn(
              // Bratsho DS: زر الإضافة برتقالي (action) — نفس لون «إعلان جديد» في الترويسة
              "flex h-[54px] w-[54px] items-center justify-center rounded-full",
              "bg-action-500 text-white",
              "shadow-[0_10px_26px_-6px_rgba(249,115,22,0.6)]",
              "ring-4 ring-white/85 dark:ring-[#0b1020]"
            )}
          >
            <Plus size={24} strokeWidth={2.6} />
          </motion.span>
        </Link>

        {/* الشريط الزجاجي العائم — 58px، حواف 24، يتبع الوضع الداكن */}
        <nav
          aria-label="التنقل الرئيسي"
          className={cn(
            "pointer-events-auto relative flex h-[58px] items-stretch overflow-hidden rounded-[24px]",
            "border border-white/50 bg-white/[0.82] shadow-nav backdrop-blur-[22px]",
            "dark:border-slate-700/60 dark:bg-slate-900/[0.82]"
          )}
        >
          {items.map((item) => {
            // مكان زر الإضافة في الوسط - نترك فراغاً (الزر عائم فوقه)
            if (item.raised) {
              return <div key={item.href} className="flex-1" aria-hidden="true" />;
            }

            const active = isActive(pathname || "", item.href);

            // قيمة الـbadge
            let badgeValue = 0;
            if (item.badge === "messages") badgeValue = unreadChats;

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
                      size={21}
                      strokeWidth={active ? 2.5 : 2}
                      className={cn(
                        "transition-all duration-200",
                        active
                          ? "text-brand-600 dark:text-brand-300"
                          : "text-slate-500 dark:text-slate-400"
                      )}
                    />

                    {/* badge العدد — برتقالي (action) كما في الترويسة */}
                    {badgeValue > 0 && (
                      <span
                        className={cn(
                          "num absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1",
                          "text-[10.5px] font-extrabold leading-none text-white",
                          "bg-action-500 ring-2 ring-white dark:ring-slate-900"
                        )}
                        aria-label={`${badgeValue} غير مقروء`}
                      >
                        {badgeValue > 9 ? "9+" : badgeValue}
                      </span>
                    )}
                  </span>

                  <span
                    className={cn(
                      "text-[10.5px] leading-none transition-all",
                      active
                        ? "font-extrabold text-brand-600 dark:text-brand-300"
                        : "font-medium text-slate-500 dark:text-slate-400"
                    )}
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
