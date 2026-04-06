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
      <nav className="grid grid-cols-5 items-end rounded-[28px] border border-white/10 bg-slate-950/82 px-2 py-2 shadow-[0_18px_40px_rgba(2,6,23,0.42)] backdrop-blur-xl">
        {items.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="mx-auto flex h-[82px] w-[82px] -translate-y-2 flex-col items-center justify-center rounded-[26px] bg-orange-500 text-white shadow-[0_14px_30px_rgba(249,115,22,0.38)] transition hover:scale-[1.02]"
              >
                <Icon size={30} strokeWidth={2.4} />
                <span className="mt-1 text-[13px] font-black">{item.label}</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-h-[66px] flex-col items-center justify-center rounded-2xl px-1 py-2 transition ${
                active ? "text-white" : "text-white/70"
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
