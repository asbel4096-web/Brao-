"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopActions() {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-2xl shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70"
          aria-label="الإشعارات"
          title="الإشعارات"
        >
          🔔
        </Link>

        <Link
          href="/profile"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white/70 text-2xl shadow-sm backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/70"
          aria-label="حسابي"
          title="حسابي"
        >
          👤
        </Link>
      </div>

      <ThemeToggle />
    </div>
  );
}
