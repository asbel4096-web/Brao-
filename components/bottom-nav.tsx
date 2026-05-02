"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { memo, useEffect, useState } from "react";
import { Home, LayoutGrid, Plus, MessageCircle, FileText } from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const items = [
  { href: "/", label: "الرئيسية", Icon: Home },
  { href: "/listings", label: "الإعلانات", Icon: LayoutGrid },
  { href: "/add-listing", label: "إضافة", Icon: Plus, highlight: true },
  { href: "/messages", label: "الدردشة", Icon: MessageCircle, badge: "messages" },
  { href: "/vehicle-report", label: "التقارير", Icon: FileText },
];

function BottomNavImpl() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadChats, setUnreadChats] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnreadChats(0);
      return;
    }

    // ✨ تحسين الأداء: نؤجّل الاشتراك حتى يصبح المتصفح خاملاً.
    // هذا يخلّي أول render أسرع لأن الاستعلام لا يبدأ مع باقي المكوّنات.
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

    // requestIdleCallback إن وُجد، وإلا setTimeout كـ fallback
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
              <Icon size={22} />
              <span className="mt-0.5 text-[11px] font-bold">{item.label}</span>
              {item.badge === "messages" && unreadChats > 0 && (
                <span className="absolute top-0 right-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-action-500 px-1 text-[10px] font-black text-white">
                  {unreadChats > 9 ? "9+" : unreadChats}
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
