"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Flame,
  Sparkles,
  Clock,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useActiveBoosts } from "@/hooks/wallet/use-active-boosts";
import {
  formatRemainingDays,
  boostDaysRemaining,
  featuredDaysRemaining,
} from "@/lib/wallet/boost";

/**
 * Admin dashboard للإعلانات المعزَّزة + المميَّزة.
 *
 * - tabs: مميَّز / Boost / الكل
 * - cleanup تلقائي عند الفتح
 * - الضغط على إعلان → فتح صفحته
 */

const CLEANUP_THROTTLE_MS = 60_000;

type Tab = "featured" | "boosted" | "all";

export default function AdminBoostsPage() {
  const { can } = useAdminRole();
  const { featured, boosted, loading, stats } = useActiveBoosts();
  const [tab, setTab] = useState<Tab>("featured");
  const cleanupDoneRef = useRef(0);

  // Lazy cleanup
  useEffect(() => {
    if (!can("users.edit")) return;
    const since = Date.now() - cleanupDoneRef.current;
    if (since < CLEANUP_THROTTLE_MS) return;

    cleanupDoneRef.current = Date.now();
    (async () => {
      try {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch("/api/admin/boosts/cleanup", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken || ""}` },
        });
      } catch {
        /* تجاهل */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة التعزيز.
      </div>
    );
  }

  const list = tab === "featured" ? featured : tab === "boosted" ? boosted : [...featured, ...boosted];

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <Rocket size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            تعزيز الإعلانات
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            {stats.totalActive} نشط · {stats.featuredCount} مميَّز · {stats.boostedCount} Boost
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox
          label="مميَّز نشط"
          value={String(stats.featuredCount)}
          icon={Flame}
          tone="amber"
        />
        <StatBox
          label="Boost نشط"
          value={String(stats.boostedCount)}
          icon={Rocket}
          tone="purple"
        />
        <StatBox
          label="الإجمالي"
          value={String(stats.totalActive)}
          icon={TrendingUp}
          tone="emerald"
        />
      </div>

      {/* Tabs */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          { key: "featured" as Tab, label: "مميَّز", icon: Flame, count: stats.featuredCount },
          { key: "boosted" as Tab, label: "Boost", icon: Rocket, count: stats.boostedCount },
          { key: "all" as Tab, label: "الكل", icon: Sparkles, count: stats.totalActive },
        ].map((t) => {
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
                  ? "bg-purple-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-purple-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }
              `}
            >
              <Icon size={12} />
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full px-1.5 text-[9px] ${active ? "bg-white/20" : "bg-slate-200 dark:bg-slate-700"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
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
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <Rocket
            size={36}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            لا توجد إعلانات في هذه الفئة
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((l) => {
            const fDays = featuredDaysRemaining(l);
            const bDays = boostDaysRemaining(l);
            const isFeatured = l.featured === true && fDays !== null && fDays > 0;
            const isBoosted = bDays !== null && bDays > 0;

            return (
              <Link
                key={l.id}
                href={`/listings/${l.id}`}
                target="_blank"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-purple-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-purple-700"
              >
                {l.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.images[0]}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {l.title || l.id.slice(0, 10)}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {isFeatured && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        <Flame size={9} />
                        مميَّز · {formatRemainingDays(fDays)}
                      </span>
                    )}
                    {isBoosted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[9px] font-black text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        <Rocket size={9} />
                        Boost · {formatRemainingDays(bDays)}
                      </span>
                    )}
                    {l.featuredBy === "admin_grant" && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        مجاني
                      </span>
                    )}
                  </div>
                </div>

                <ExternalLink size={14} className="shrink-0 text-slate-400" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: any;
  tone: "amber" | "purple" | "emerald";
}) {
  const tones: Record<string, string> = {
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
          <Icon size={15} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-0.5 text-sm font-black tabular-nums text-slate-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}
