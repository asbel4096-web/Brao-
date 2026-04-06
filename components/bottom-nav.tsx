"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/listings", label: "الإعلانات", icon: "▤" },
  { href: "/add-listing", label: "إضافة", icon: "⊕", highlight: true },
  { href: "/messages", label: "الدردشة", icon: "◉" },
  { href: "/vehicle-report", label: "تقرير المركبة", icon: "▣" }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[min(96%,880px)] -translate-x-1/2">
      <nav className="grid grid-cols-5 items-end rounded-[30px] border border-white/40 bg-white/70 px-2 py-2 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/70">
        {items.map((item) => {
          const active = pathname === item.href;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mx-auto flex h-[86px] w-[86px] -translate-y-3 flex-col items-center justify-center rounded-[28px] bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.35)] transition hover:scale-[1.02]"
              >
                <span className="text-[34px] leading-none">{item.icon}</span>
                <span className="mt-1 text-sm font-black">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[72px] flex-col items-center justify-center rounded-2xl px-1 py-2 transition ${
                active
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-600 dark:text-slate-300"
              }`}
            >
              <span className="text-[30px] leading-none">{item.icon}</span>
              <span className="mt-1 text-[15px] font-extrabold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
