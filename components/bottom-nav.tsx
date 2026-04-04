"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "الرئيسية", icon: "⌂" },
  { href: "/listings", label: "الإعلانات", icon: "🧾" },
  { href: "/add-listing", label: "إضافة", icon: "⊕", highlight: true },
  { href: "/chat", label: "الدردشة", icon: "💬" },
  { href: "/vehicle-report", label: "تقرير المركبة", icon: "📄" }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[min(96%,900px)] -translate-x-1/2">
      <nav className="grid grid-cols-5 items-center rounded-[32px] border border-white/40 bg-white/65 px-2 py-2 shadow-2xl backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/65">
        {items.map((item) => {
          const active = pathname === item.href;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-[26px] bg-orange-500 text-white shadow-lg"
              >
                <span className="text-3xl leading-none">{item.icon}</span>
                <span className="mt-1 text-sm font-black">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-2xl px-2 py-3 transition ${
                active
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-700 dark:text-slate-200"
              }`}
            >
              <span className="text-3xl leading-none">{item.icon}</span>
              <span className="mt-1 text-sm font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
