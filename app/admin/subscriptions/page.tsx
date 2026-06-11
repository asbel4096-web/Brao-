"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import {
  useSubscriptionsList,
  type SubscriptionsTab,
} from "@/hooks/wallet/use-verification";
import { useToast } from "@/contexts/ToastContext";
import { auth } from "@/lib/firebase";
import { findPlan, formatRemainingDays } from "@/lib/wallet/verification";

/**
 * صفحة إدارة اشتراكات التوثيق.
 *
 * - 4 tabs: الكل / نشط / ينتهي قريباً / منتهي
 * - بحث client-side
 * - عند فتح الصفحة: trigger cleanup تلقائياً (مرة كل 60s max)
 * - الضغط على مستخدم → /admin/subscriptions/[uid]
 */

const TABS: { key: SubscriptionsTab; label: string; icon: any; tone: string }[] = [
  { key: "all", label: "الكل", icon: BadgeCheck, tone: "slate" },
  { key: "active", label: "نشط", icon: CheckCircle2, tone: "emerald" },
  { key: "expiring", label: "ينتهي قريباً", icon: Clock, tone: "amber" },
  { key: "expired", label: "منتهي", icon: XCircle, tone: "rose" },
];

const CLEANUP_THROTTLE_MS = 60_000;

export default function AdminSubscriptionsPage() {
  const { can } = useAdminRole();
  const [tab, setTab] = useState<SubscriptionsTab>("active");
  const [search, setSearch] = useState("");
  const { users, allUsers, loading } = useSubscriptionsList(tab);
  const toast = useToast();
  const cleanupDoneRef = useRef(0);

  // Lazy cleanup: مرة واحدة لكل فتح (مع throttle 60s)
  useEffect(() => {
    if (!can("users.edit")) return;
    const since = Date.now() - cleanupDoneRef.current;
    if (since < CLEANUP_THROTTLE_MS) return;

    cleanupDoneRef.current = Date.now();
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch("/api/admin/subscriptions/cleanup", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken || ""}` },
        });
        // لا toast — التنظيف silent
      } catch {
        /* تجاهل - التنظيف best-effort */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة الاشتراكات.
      </div>
    );
  }

  // فلتر بحث client-side
  const filtered = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (u.businessName || "").toLowerCase().includes(q) ||
      (u.name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  });

  // إحصائيات
  const now = Date.now();
  const stats = {
    total: allUsers.length,
    active: allUsers.filter((u) => {
      const ms = u.verifiedUntil?.toMillis?.();
      return (
        (u.verificationStatus === "active" ||
          u.verificationStatus === "granted") &&
        ms &&
        ms > now
      );
    }).length,
    expiring: allUsers.filter((u) => {
      const ms = u.verifiedUntil?.toMillis?.();
      if (!ms) return false;
      const days = Math.ceil((ms - now) / (1000 * 60 * 60 * 24));
      return (
        (u.verificationStatus === "active" ||
          u.verificationStatus === "granted") &&
        days >= 0 &&
        days <= 7
      );
    }).length,
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <BadgeCheck size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
              اشتراكات التوثيق
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              {stats.total} مستخدم · {stats.active} نشط · {stats.expiring} ينتهي قريباً
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`
                shrink-0 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-black transition
                ${active
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }
              `}
            >
              <Icon size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="بحث عن معرض..."
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white pe-10 ps-3 text-sm outline-none focus:border-emerald-400 dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Sparkles size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            {search ? "لا نتائج للبحث" : "لا توجد اشتراكات في هذه الفئة"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const ms = u.verifiedUntil?.toMillis?.();
            const days = ms ? Math.ceil((ms - now) / (1000 * 60 * 60 * 24)) : null;
            const isActive =
              (u.verificationStatus === "active" ||
                u.verificationStatus === "granted") &&
              ms &&
              ms > now;
            const plan = u.verificationPlan ? findPlan(u.verificationPlan) : null;

            return (
              <Link
                key={u.id}
                href={`/admin/subscriptions/${u.id}`}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-700"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white ${
                    isActive
                      ? "bg-gradient-to-br from-emerald-500 to-emerald-600"
                      : "bg-slate-400 dark:bg-slate-700"
                  }`}
                >
                  {(u.businessName || u.name || u.email || "?")
                    .charAt(0)
                    .toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                      {u.businessName || u.name || u.email || u.id}
                    </p>
                    {isActive && (
                      <BadgeCheck size={14} className="shrink-0 text-emerald-500" />
                    )}
                  </div>
                  {u.email && (
                    <p
                      className="truncate text-[10px] text-slate-500 dark:text-slate-400"
                      dir="ltr"
                    >
                      {u.email}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2 text-[10px]">
                    {plan && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                        {plan.label}
                      </span>
                    )}
                    {u.verificationStatus === "granted" && (
                      <span className="rounded-full bg-purple-100 px-2 py-0.5 font-black text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        مجاني
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-end">
                  <p
                    className={`text-[11px] font-black ${
                      !isActive
                        ? "text-rose-600 dark:text-rose-400"
                        : days !== null && days <= 7
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {formatRemainingDays(days)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
