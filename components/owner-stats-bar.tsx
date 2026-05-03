"use client";

import { Eye, Heart, MessageCircle, Phone, Smartphone, ShieldCheck } from "lucide-react";
import { OwnerOnly } from "./owner-only";
import { useOwnerStats } from "@/hooks/useOwnerStats";

interface Props {
  listingId: string;
  ownerId?: string | null;
  initialViews?: number;
  /** عرض مدمج (في صفحة التفاصيل) أو موسَّع (في dashboard) */
  variant?: "compact" | "full";
}

/**
 * شريط الإحصائيات الخاصة بالمالك.
 *
 * - يظهر فقط للمالك (محمي بـ OwnerOnly).
 * - يعرض القيم الموجودة فقط (ما فيش حقول صفر مزعجة).
 * - شعار 🛡️ يوضّح للمالك أن هذه البيانات خاصة به فقط.
 */
export function OwnerStatsBar({
  listingId,
  ownerId,
  initialViews,
  variant = "compact",
}: Props) {
  return (
    <OwnerOnly ownerId={ownerId}>
      <OwnerStatsBarInner
        listingId={listingId}
        ownerId={ownerId}
        initialViews={initialViews}
        variant={variant}
      />
    </OwnerOnly>
  );
}

function OwnerStatsBarInner({
  listingId,
  ownerId,
  initialViews,
  variant,
}: Props) {
  const { stats, loading } = useOwnerStats({
    listingId,
    ownerId,
    initialViews,
  });

  const items: Array<{
    icon: typeof Eye;
    label: string;
    value: number | undefined;
    color: "brand" | "rose" | "emerald" | "amber" | "blue";
  }> = [
    { icon: Eye, label: "مشاهدات", value: stats.views, color: "brand" },
    { icon: Heart, label: "مفضلة", value: stats.favoritesCount, color: "rose" },
    { icon: MessageCircle, label: "نقرات الدردشة", value: stats.chatClicks, color: "emerald" },
    { icon: Phone, label: "نقرات الاتصال", value: stats.phoneClicks, color: "blue" },
    { icon: Smartphone, label: "نقرات واتساب", value: stats.whatsappClicks, color: "emerald" },
  ];

  const visible = items.filter((i) => typeof i.value === "number");

  if (visible.length === 0 && !loading) {
    // لا توجد إحصائيات بعد — لا نعرض الشريط
    return null;
  }

  const isCompact = variant === "compact";

  return (
    <div
      className={`
        rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50/80 to-white
        dark:border-brand-800 dark:from-brand-900/20 dark:to-slate-900
        ${isCompact ? "p-4" : "p-5 sm:p-6"}
      `}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-700 text-white">
          <ShieldCheck size={16} />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            إحصائياتك الخاصة
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            تظهر لك فقط — لا يراها الآخرون.
          </p>
        </div>
      </div>

      <div
        className={`grid gap-2 ${
          isCompact
            ? "grid-cols-2 sm:grid-cols-3"
            : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
        }`}
      >
        {visible.map((it) => (
          <StatPill
            key={it.label}
            icon={it.icon}
            label={it.label}
            value={it.value!}
            color={it.color}
          />
        ))}
      </div>
    </div>
  );
}

const COLORS = {
  brand: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
  rose: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  blue: "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
};

function StatPill({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  color: keyof typeof COLORS;
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${COLORS[color]}`}
      >
        <Icon size={14} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
          {value.toLocaleString("ar-LY")}
        </p>
      </div>
    </div>
  );
}
