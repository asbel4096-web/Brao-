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
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-white/80 shadow-sm backdrop-blur-xl transition hover:text-white"
          aria-label="الإشعارات"
          title="الإشعارات"
        >
          <Bell size={22} strokeWidth={2.2} />
        </Link>

        <Link
          href="/profile"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/70 text-white/80 shadow-sm backdrop-blur-xl transition hover:text-white"
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
