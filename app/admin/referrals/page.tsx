"use client";

import {
  Users as UsersIcon,
  Gift,
  CheckCircle2,
  Clock,
  TrendingUp,
  Coins,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useAllReferrals } from "@/hooks/wallet/use-referrals";
import { REFERRAL_REWARD_BC } from "@/lib/wallet/referrals";

/**
 * Admin dashboard للإحالات.
 *
 * إحصاءات + قائمة آخر 200 إحالة.
 * بحث وفلاتر بسيطة client-side.
 */

export default function AdminReferralsPage() {
  const { can } = useAdminRole();
  const { referrals, loading, stats } = useAllReferrals();

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية رؤية الإحالات.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
          <UsersIcon size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            نظام الإحالات
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            متابعة كل عمليات الدعوات والمكافآت
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox
          label="إجمالي الإحالات"
          value={String(stats.total)}
          icon={UsersIcon}
          tone="purple"
        />
        <StatBox
          label="مكتملة"
          value={String(stats.completed)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatBox
          label="في الانتظار"
          value={String(stats.pending)}
          icon={Clock}
          tone="amber"
        />
        <StatBox
          label="مكافآت صُرفت"
          value={`${stats.rewardsPaid.toLocaleString("ar-LY")} BC`}
          icon={Coins}
          tone="action"
        />
      </div>

      {/* Explanation */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/40 dark:bg-purple-900/10">
        <p className="text-[12px] leading-6 text-purple-900 dark:text-purple-200">
          <strong>كيف يعمل النظام؟</strong> كل صديق يُكمل أول إعلان معتمد عبر دعوة،
          يحصل الطرفان على {REFERRAL_REWARD_BC} BC. الحد الأقصى 5 مكافآت يومياً
          للمُحيل الواحد (anti-abuse).
        </p>
      </div>

      {/* List */}
      <div>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          آخر الإحالات
        </h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <Gift size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              لا توجد إحالات بعد
            </p>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              لن تظهر إحالات حتى يفعّل المستخدمون النظام
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => {
              const isCompleted = r.status === "completed";
              const isPending = r.status === "pending";
              const date = r.createdAt?.toMillis?.()
                ? new Date(r.createdAt.toMillis()).toLocaleString("ar-LY", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <article
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      isCompleted
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : isPending
                        ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p
                        className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-300"
                        dir="ltr"
                      >
                        {r.referrerEmail || r.referrerUid.slice(0, 10)}
                      </p>
                      <span className="text-[10px] text-slate-400">→</span>
                      <p
                        className="truncate font-mono text-[11px] text-slate-900 dark:text-white"
                        dir="ltr"
                      >
                        {r.referredEmail || r.referredUid.slice(0, 10)}
                      </p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="font-mono">{r.code}</span>
                      <span>·</span>
                      <span>{date}</span>
                    </div>
                  </div>

                  <div className="text-end">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : isPending
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {isCompleted
                        ? "مكتملة"
                        : isPending
                        ? "بالانتظار"
                        : r.status === "expired"
                        ? "منتهية"
                        : "محظورة"}
                    </span>
                    {isCompleted && (
                      <p className="mt-1 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                        +{REFERRAL_REWARD_BC * 2} BC
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
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
  tone: "purple" | "emerald" | "amber" | "action";
}) {
  const tones: Record<string, string> = {
    purple: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    action: "bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300",
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
