"use client";

import Link from "next/link";
import { Bell, Search, UserCircle2, CirclePlus } from "lucide-react";
import BrandLogo from "@/components/brand-logo";

export default function MobileAppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95">
      <div className="container py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <UserCircle2 className="h-6 w-6" />
            </Link>

            <Link
              href="/notifications"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Bell className="h-5 w-5" />
            </Link>
          </div>

          <BrandLogo compact />

          <Link
            href="/add-listing"
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F58233] text-white shadow-[0_12px_24px_rgba(245,130,51,0.28)]"
          >
            <CirclePlus className="h-6 w-6" />
          </Link>
        </div>

        <div className="mt-3 flex items-center gap-3 rounded-[20px] bg-slate-100 px-4 py-3 dark:bg-slate-800">
          <Search className="h-5 w-5 text-slate-500" />
          <input
            type="text"
            placeholder="ابحث عن سيارة، قطعة، خدمة..."
            className="w-full bg-transparent text-right text-base outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
    </header>
  );
}
