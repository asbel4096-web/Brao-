"use client";

import { useState, type ReactNode } from "react";
import {
  Megaphone,
  Pause,
  Play,
  Plus,
  Eye,
  MousePointerClick,
  Phone,
  MessageCircle,
  CalendarClock,
  RefreshCw,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import {
  BOOST_EXTENSIONS,
  STATUS_LABEL,
  campaignStatus,
  campaignRemainingDays,
  campaignCtr,
  type CampaignFields,
} from "@/lib/wallet/campaign";

interface Props {
  listing: CampaignFields & { id: string; title?: string };
}

async function callApi(path: string, body: Record<string, unknown>) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || "حدث خطأ");
  return data;
}

function fmtDate(ts: any): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("ar-LY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function CampaignManager({ listing }: Props) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [showExtend, setShowExtend] = useState(false);

  const status = campaignStatus(listing);
  if (status === "none") return null;

  const remaining = campaignRemainingDays(listing);
  const ctr = campaignCtr(listing);
  const impressions = Number(listing.sponsoredImpressions) || 0;
  const clicks = Number(listing.sponsoredClicks) || 0;
  const views = Number(listing.views) || 0;
  const phone = Number(listing.phoneClicks) || 0;
  const wa = Number(listing.whatsappClicks) || 0;

  const statusCls =
    status === "active"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
      : status === "paused"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300";

  async function action(
    path: string,
    okMsg: string,
    extra: Record<string, unknown> = {}
  ) {
    setBusy(path);
    try {
      await callApi(path, { listingId: listing.id, ...extra });
      toast.success(okMsg);
      setShowExtend(false);
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تنفيذ العملية");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      dir="rtl"
      className="rounded-3xl border border-amber-200/70 bg-amber-50/40 p-4 dark:border-amber-500/20 dark:bg-amber-950/10"
    >
      {/* رأس */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-black text-amber-900 dark:text-amber-200">
          <Megaphone size={16} />
          الحملة الممولة
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${statusCls}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {/* الأيام + التواريخ */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 dark:bg-slate-900/40">
        <div className="flex items-center gap-1.5 text-sm">
          <CalendarClock size={15} className="text-amber-600" />
          {status === "expired" ? (
            <span className="font-bold text-slate-500">انتهت الحملة</span>
          ) : (
            <span className="font-black text-slate-900 dark:text-white">
              متبقٍ {remaining} {remaining === 1 ? "يوم" : "يوماً"}
              {status === "paused" && (
                <span className="mr-1 text-xs font-bold text-amber-600">
                  (مجمّدة)
                </span>
              )}
            </span>
          )}
        </div>
        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {fmtDate(listing.boostedAt)} ← {fmtDate(listing.boostedUntil)}
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="mb-3 grid grid-cols-3 gap-2">
        <Stat icon={<Eye size={14} />} label="الظهور" value={impressions} />
        <Stat icon={<MousePointerClick size={14} />} label="النقرات" value={clicks} />
        <Stat icon={<Eye size={14} />} label="الزيارات" value={views} />
        <Stat
          label="CTR"
          value={`${ctr.toFixed(1)}%`}
          icon={<MousePointerClick size={14} />}
        />
        <Stat icon={<Phone size={14} />} label="اتصال" value={phone} />
        <Stat icon={<MessageCircle size={14} />} label="واتساب" value={wa} />
      </div>

      {/* الأزرار */}
      <div className="flex flex-wrap gap-2">
        {status === "active" && (
          <button
            onClick={() => action("/api/wallet/boost/pause", "تم إيقاف الحملة مؤقتاً")}
            disabled={!!busy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-white py-2 text-sm font-black text-amber-700 transition hover:bg-amber-50 active:scale-95 disabled:opacity-50 dark:bg-slate-900 dark:text-amber-300"
          >
            <Pause size={15} /> إيقاف
          </button>
        )}
        {status === "paused" && (
          <button
            onClick={() => action("/api/wallet/boost/resume", "تم استئناف الحملة")}
            disabled={!!busy}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2 text-sm font-black text-white transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
          >
            <Play size={15} /> استئناف
          </button>
        )}
        <button
          onClick={() => setShowExtend((s) => !s)}
          disabled={!!busy}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-700 py-2 text-sm font-black text-white transition hover:bg-brand-800 active:scale-95 disabled:opacity-50"
        >
          {status === "expired" ? (
            <>
              <RefreshCw size={15} /> إعادة التفعيل
            </>
          ) : (
            <>
              <Plus size={15} /> تمديد الحملة
            </>
          )}
        </button>
      </div>

      {/* خيارات التمديد */}
      {showExtend && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <p className="mb-2 text-xs font-bold text-slate-500">
            اختر عدد الأيام (تُخصم من رصيد BC):
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BOOST_EXTENSIONS.map((ext) => (
              <button
                key={ext.days}
                onClick={() =>
                  action(
                    "/api/wallet/boost/extend",
                    `تم تمديد الحملة +${ext.days} يوم ✨`,
                    { days: ext.days }
                  )
                }
                disabled={!!busy}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 py-2 transition hover:border-brand-400 hover:bg-brand-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {ext.label}
                </span>
                <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300">
                  {ext.price} BC
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-2xl bg-white/70 px-2 py-2 text-center dark:bg-slate-900/40">
      <div className="mb-0.5 flex items-center justify-center gap-1 text-[11px] font-bold text-slate-500">
        {icon}
        {label}
      </div>
      <div className="text-base font-black tabular-nums text-slate-900 dark:text-white">
        {typeof value === "number" ? value.toLocaleString("ar-LY") : value}
      </div>
    </div>
  );
}

export default CampaignManager;
