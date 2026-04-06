"use client";

import Link from "next/link";
import { Bell, UserCircle2 } from "lucide-react";
import ThemeToggle from "@/components/theme-toggle";

export default function TopActions() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
          aria-label="الإشعارات"
          title="الإشعارات"
        >
          <Bell size={22} strokeWidth={2.2} />
        </Link>

        <Link
          href="/profile"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-slate-700 shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
          aria-label="حسابي"
          title="حسابي"
        >
          <UserCircle2 size={24} strokeWidth={2.1} />
        </Link>
      </div>

      <ThemeToggle />
    </div>
  );
}
