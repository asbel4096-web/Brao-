"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { Home, LayoutGrid, Plus, MessageCircle, Heart } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { href: "/", label: "الرئيسية", Icon: Home },
  { href: "/listings", label: "الإعلانات", Icon: LayoutGrid },
  { href: "/add-listing", label: "إضافة", Icon: Plus, highlight: true },
  { href: "/favorites", label: "المفضلة", Icon: Heart, badge: "favorites" as const },
  { href: "/messages", label: "الدردشة", Icon: MessageCircle, badge: "messages" as const },
];

function BottomNavImpl() {
  const pathname = usePathname();
  const { user } = useAuth();
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

  // اشتراك بالمفضلة (مؤجَّل أيضاً)
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

  return (
    <div className="md:hidden fixed bottom-3 left-1/2 z-50 w-[min(96%,560px)] -translate-x-1/2">
      <nav className="grid grid-cols-5 items-center rounded-[28px] border border-white/40 bg-white/85 px-2 py-2 shadow-2xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-slate-900/85">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.Icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="mx-auto flex h-16 w-16 -translate-y-3 flex-col items-center justify-center rounded-[22px] bg-action-500 text-white shadow-action transition active:scale-95"
                aria-label={item.label}
              >
                <Icon size={24} />
                <span className="mt-0.5 text-[10px] font-black">{item.label}</span>
              </Link>
            );
          }

          // Determine badge value for this item
          let badgeValue = 0;
          if (item.badge === "messages") badgeValue = unreadChats;
          if (item.badge === "favorites") badgeValue = favCount;

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`relative flex flex-col items-center justify-center rounded-2xl px-2 py-2 transition ${
                active
                  ? "text-brand-700 dark:text-brand-300"
                  : "text-slate-600 dark:text-slate-300"
              }`}
              aria-label={item.label}
            >
              <Icon
                size={22}
                className={
                  item.badge === "favorites" && active
                    ? "fill-rose-500 text-rose-500"
                    : item.badge === "favorites" && favCount > 0
                    ? "fill-rose-500/20 text-rose-500"
                    : ""
                }
              />
              <span className="mt-0.5 text-[11px] font-bold">{item.label}</span>
              {badgeValue > 0 && (
                <span
                  className={`absolute top-0 right-2 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black text-white ${
                    item.badge === "favorites" ? "bg-rose-500" : "bg-action-500"
                  }`}
                >
                  {badgeValue > 9 ? "9+" : badgeValue}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export default memo(BottomNavImpl);
