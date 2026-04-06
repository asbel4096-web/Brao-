"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  House,
  LayoutList,
  CirclePlus,
  MessageCircleMore,
  FileSearch
} from "lucide-react";

const items = [
  { href: "/", label: "الرئيسية", icon: House },
  { href: "/listings", label: "الإعلانات", icon: LayoutList },
  { href: "/add-listing", label: "إضافة", icon: CirclePlus, highlight: true },
  { href: "/messages", label: "الدردشة", icon: MessageCircleMore },
  { href: "/vehicle-report", label: "تقرير المركبة", icon: FileSearch }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-3 left-1/2 z-50 w-[min(94%,760px)] -translate-x-1/2">
      <nav className="grid grid-cols-5 items-end rounded-[26px] border border-white/40 bg-white/78 px-2 py-2 shadow-[0_18px_36px_rgba(15,23,42,0.14)] backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/75">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mx-auto flex h-[76px] w-[76px] -translate-y-2 flex-col items-center justify-center rounded-[24px] bg-orange-500 text-white shadow-[0_12px_24px_rgba(249,115,22,0.34)]"
              >
                <Icon size={28} strokeWidth={2.4} />
                <span className="mt-1 text-[13px] font-black">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[64px] flex-col items-center justify-center rounded-2xl px-1 py-2 transition ${
                active
                  ? "text-slate-950 dark:text-white"
                  : "text-slate-500 dark:text-slate-300"
              }`}
            >
              <Icon size={24} strokeWidth={2.2} />
              <span className="mt-1 text-[13px] font-extrabold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
