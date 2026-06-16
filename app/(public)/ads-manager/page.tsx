"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  Megaphone,
  Eye,
  MousePointerClick,
  Phone,
  MessageCircle,
  Wallet,
  Plus,
  BarChart3,
  Heart,
  Share2,
  X,
  TrendingUp,
  Clock,
  Sparkles,
  CalendarPlus,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { Listing } from "@/lib/types";
import { getPromotionTier } from "@/lib/wallet/boost";
import {
  BOOST_EXTENSIONS,
  STATUS_LABEL,
  campaignStatus,
  campaignRemainingDays,
  campaignCtr,
  type CampaignFields,
  type CampaignStatus,
} from "@/lib/wallet/campaign";

type Ad = Listing & CampaignFields & { id: string };

function haptic(ms = 12) {
  try {
    (navigator as any)?.vibrate?.(ms);
  } catch {
    /* ignore */
  }
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

const num = (v: any) => Number(v) || 0;
const arNum = (v: number) => v.toLocaleString("ar-LY");

export default function AdsManagerPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [ads, setAds] = useState<Ad[] | null>(null);
  const [spend, setSpend] = useState(0);
  const [extendFor, setExtendFor] = useState<Ad | null>(null);
  const [statsFor, setStatsFor] = useState<Ad | null>(null);
  const [busy, setBusy] = useState(false);

  // حماية: تسجيل الدخول
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/ads-manager");
  }, [authLoading, user, router]);

  // اشتراك بإعلانات المستخدم المُرقّاة (نشطة/متوقفة/منتهية)
  useEffect(() => {
    if (!user) return;
    const qy = query(collection(db, "listings"), where("ownerId", "==", user.uid));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Ad[];
        const promoted = all.filter(
          (l) => getPromotionTier(l) > 0 || campaignStatus(l) !== "none"
        );
        const rank: Record<CampaignStatus, number> = {
          active: 0,
          paused: 1,
          expired: 2,
          none: 3,
        };
        promoted.sort((a, b) => {
          const ra = getPromotionTier(a) > 0 ? 0 : rank[campaignStatus(a)];
          const rb = getPromotionTier(b) > 0 ? 0 : rank[campaignStatus(b)];
          return ra - rb;
        });
        setAds(promoted);
      },
      () => setAds([])
    );
    return () => unsub();
  }, [user]);

  // الإنفاق: مجموع معاملات الترقية السالبة
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "walletTransactions"), where("userId", "==", user.uid))
        );
        if (cancelled) return;
        let total = 0;
        snap.docs.forEach((d) => {
          const t = d.data();
          if (
            (t.type === "boost" || t.type === "featured_listing") &&
            num(t.amount) < 0
          ) {
            total += Math.abs(num(t.amount));
          }
        });
        setSpend(total);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // إجماليات سريعة
  const totals = useMemo(() => {
    const list = ads || [];
    const impressions = list.reduce((s, a) => s + num(a.sponsoredImpressions), 0);
    const clicks = list.reduce((s, a) => s + num(a.sponsoredClicks), 0);
    const calls = list.reduce((s, a) => s + num(a.phoneClicks), 0);
    const activeCount = list.filter(
      (a) => campaignStatus(a) === "active" || getPromotionTier(a) > 0
    ).length;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return { impressions, clicks, calls, activeCount, ctr };
  }, [ads]);

  async function doAction(
    ad: Ad,
    path: string,
    okMsg: string,
    extra: Record<string, unknown> = {}
  ) {
    haptic();
    setBusy(true);
    try {
      await callApi(path, { listingId: ad.id, ...extra });
      toast.success(okMsg);
      setExtendFor(null);
    } catch (e: any) {
      toast.error(e?.message || "تعذّر تنفيذ العملية");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || ads === null) return <AdsManagerSkeleton />;

  return (
    <section dir="rtl" className="container py-4 pb-28 sm:py-7">
      <div className="mx-auto max-w-2xl">
        {/* ===== الهيرو: شريط القيادة ===== */}
        <Hero activeCount={totals.activeCount} spend={spend} ctr={totals.ctr} />

        {/* ===== بطاقات الأداء ===== */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={<Eye size={18} />}
            label="المشاهدات"
            value={arNum(totals.impressions)}
            tint="brand"
          />
          <StatCard
            icon={<MousePointerClick size={18} />}
            label="النقرات"
            value={arNum(totals.clicks)}
            tint="emerald"
          />
          <StatCard
            icon={<Phone size={18} />}
            label="الاتصالات"
            value={arNum(totals.calls)}
            tint="amber"
          />
          <StatCard
            icon={<Wallet size={18} />}
            label="الإنفاق"
            value={arNum(spend)}
            suffix="BC"
            tint="rose"
          />
        </div>

        {/* ===== قائمة الحملات ===== */}
        <div className="mt-6 mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-black text-slate-900 dark:text-white">
            <BarChart3 size={18} className="text-brand-600 dark:text-brand-300" />
            حملاتي
            {ads.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {arNum(ads.length)}
              </span>
            )}
          </h2>
          {ads.length > 0 && (
            <Link
              href="/my-listings"
              onClick={() => haptic()}
              className="inline-flex items-center gap-1 rounded-full bg-action-50 px-3 py-1.5 text-xs font-black text-action-600 transition hover:bg-action-100 dark:bg-action-500/15 dark:text-action-300"
            >
              <Plus size={14} /> حملة جديدة
            </Link>
          )}
        </div>

        {ads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <CampaignCard
                key={ad.id}
                ad={ad}
                busy={busy}
                onPause={() => doAction(ad, "/api/wallet/boost/pause", "تم إيقاف الحملة مؤقتاً")}
                onResume={() => doAction(ad, "/api/wallet/boost/resume", "تم استئناف الحملة")}
                onExtend={() => {
                  haptic();
                  setExtendFor(ad);
                }}
                onStats={() => {
                  haptic();
                  setStatsFor(ad);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* FAB إنشاء حملة */}
      <Link
        href="/my-listings"
        onClick={() => haptic()}
        className="
          fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2
          rounded-full bg-action-500 px-6 py-3.5 text-sm font-black text-white
          shadow-action ring-4 ring-action-500/15 transition active:scale-95 hover:bg-action-600
        "
      >
        <Megaphone size={18} />
        إنشاء حملة ممولة
      </Link>

      {extendFor && (
        <ExtendSheet
          ad={extendFor}
          busy={busy}
          onClose={() => setExtendFor(null)}
          onPick={(days) =>
            doAction(
              extendFor,
              "/api/wallet/boost/extend",
              `تم تمديد الحملة +${days} يوم ✨`,
              { days }
            )
          }
        />
      )}

      {statsFor && <StatsSheet ad={statsFor} onClose={() => setStatsFor(null)} />}
    </section>
  );
}

/* ============== الهيرو ============== */
function Hero({
  activeCount,
  spend,
  ctr,
}: {
  activeCount: number;
  spend: number;
  ctr: number;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] p-5 text-white shadow-blue sm:p-6">
      {/* وهج زخرفي */}
      <div className="pointer-events-none absolute -left-10 -top-12 h-40 w-40 rounded-full bg-action-500/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-8 h-44 w-44 rounded-full bg-brand-400/20 blur-3xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-white/60">
            <Sparkles size={13} className="text-action-400" />
            لوحة الأداء
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-black sm:text-3xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-action-500 shadow-action">
              <Megaphone size={18} />
            </span>
            مدير إعلاناتي
          </h1>
          <p className="mt-2 text-sm font-bold text-white/70">
            {activeCount > 0
              ? `لديك ${arNum(activeCount)} حملة نشطة الآن`
              : "لا توجد حملات نشطة — موّل إعلاناً للبدء"}
          </p>
        </div>

        {/* عدّاد الحملات النشطة */}
        <div className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur">
          <div className="text-3xl font-black leading-none tabular-nums">
            {arNum(activeCount)}
          </div>
          <div className="mt-1 text-[10px] font-black text-white/60">نشطة</div>
        </div>
      </div>

      {/* شريط ملخّص: CTR + الإنفاق */}
      <div className="relative mt-4 flex gap-2.5">
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur">
          <TrendingUp size={16} className="text-emerald-300" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-white/55">نسبة النقر CTR</div>
            <div className="text-sm font-black tabular-nums">{ctr.toFixed(1)}%</div>
          </div>
        </div>
        <div className="flex flex-1 items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur">
          <Wallet size={16} className="text-action-300" />
          <div className="min-w-0">
            <div className="text-[10px] font-bold text-white/55">إجمالي الإنفاق</div>
            <div className="text-sm font-black tabular-nums">
              {arNum(spend)} <span className="text-[10px] text-white/50">BC</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== بطاقة أداء ============== */
function StatCard({
  icon,
  label,
  value,
  suffix,
  tint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  suffix?: string;
  tint: "brand" | "emerald" | "amber" | "rose";
}) {
  const chip: Record<string, string> = {
    brand: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    rose: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
  };
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-2xl ${chip[tint]}`}
      >
        {icon}
      </div>
      <div className="text-2xl font-black tabular-nums text-slate-900 dark:text-white">
        {value}
        {suffix && (
          <span className="mr-1 text-xs font-bold text-slate-400">{suffix}</span>
        )}
      </div>
      <div className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">
        {label}
      </div>
    </div>
  );
}

/* ============== بطاقة الحملة (أزرار ظاهرة) ============== */
function CampaignCard({
  ad,
  busy,
  onPause,
  onResume,
  onExtend,
  onStats,
}: {
  ad: Ad;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onStats: () => void;
}) {
  const status = campaignStatus(ad);
  const isActive = status === "active" || getPromotionTier(ad) > 0;
  const isPaused = status === "paused";
  const isExpired = status === "expired";
  const remaining = campaignRemainingDays(ad);
  const img = ad.images?.[0] || "/icons/car-card.svg";

  // شريط الأيام المتبقية (نسبةً لـ 30 يوم كحد أقصى مرئي)
  const pct = isExpired ? 0 : Math.max(6, Math.min(100, (remaining / 30) * 100));

  const pill: Record<CampaignStatus, string> = {
    active:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    expired: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    none: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  };
  const dotCls: Record<CampaignStatus, string> = {
    active: "bg-emerald-500",
    paused: "bg-amber-500",
    expired: "bg-rose-500",
    none: "bg-slate-400",
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      {/* الجسم */}
      <div className="flex gap-3 p-3.5">
        <Link href={`/listings/${ad.id}`} className="shrink-0">
          <div className="relative h-[5.5rem] w-[5.5rem] overflow-hidden rounded-2xl ring-1 ring-slate-100 dark:ring-slate-800">
            <Image
              src={img}
              alt={ad.title || ""}
              fill
              sizes="88px"
              className="object-cover"
            />
          </div>
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/listings/${ad.id}`}
              className="line-clamp-1 text-sm font-black text-slate-900 hover:text-brand-700 dark:text-white"
            >
              {ad.title || "إعلان"}
            </Link>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-black ${pill[status]}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${dotCls[status]}`} />
              {STATUS_LABEL[status]}
            </span>
          </div>

          {/* الأيام المتبقية + شريط تقدّم */}
          <div className="mt-2">
            <div className="mb-1 flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <Clock size={12} />
              {isExpired ? "انتهت مدة الحملة" : `متبقٍ ${arNum(remaining)} يوم`}
              {isPaused && " · مجمّدة"}
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  isExpired
                    ? "bg-rose-400"
                    : isPaused
                      ? "bg-amber-400"
                      : "bg-gradient-to-l from-action-400 to-brand-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* مقاييس مصغّرة */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <Metric icon={<Eye size={12} />} value={num(ad.sponsoredImpressions)} />
            <Metric
              icon={<MousePointerClick size={12} />}
              value={num(ad.sponsoredClicks)}
            />
            <Metric icon={<Phone size={12} />} value={num(ad.phoneClicks)} />
            <Metric
              icon={<MessageCircle size={12} />}
              value={num(ad.whatsappClicks)}
            />
          </div>
        </div>
      </div>

      {/* شريط الإجراءات الظاهرة (يعمل على الجوال والكمبيوتر) */}
      <div className="flex items-stretch gap-2 border-t border-slate-100 p-2.5 dark:border-slate-800">
        {/* مفتاح التشغيل/الإيقاف */}
        {!isExpired ? (
          <button
            type="button"
            onClick={isActive ? onPause : onResume}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-50 py-2.5 text-xs font-black text-slate-700 transition active:scale-[0.98] disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
          >
            <ToggleSwitch on={isActive} />
            {isActive ? "نشطة" : "متوقفة"}
          </button>
        ) : (
          <span className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-50 py-2.5 text-xs font-black text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
            منتهية
          </span>
        )}

        <button
          type="button"
          onClick={onExtend}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-action-50 py-2.5 text-xs font-black text-action-600 transition active:scale-[0.98] disabled:opacity-50 dark:bg-action-500/15 dark:text-action-300"
        >
          <CalendarPlus size={15} />
          {isExpired ? "إعادة تفعيل" : "تمديد"}
        </button>

        <button
          type="button"
          onClick={onStats}
          disabled={busy}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-brand-50 py-2.5 text-xs font-black text-brand-700 transition active:scale-[0.98] disabled:opacity-50 dark:bg-brand-500/15 dark:text-brand-300"
        >
          <BarChart3 size={15} />
          إحصائيات
        </button>
      </div>
    </div>
  );
}

function Metric({ icon, value }: { icon: ReactNode; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 tabular-nums">
      <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      {arNum(value)}
    </span>
  );
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
        on ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
      }`}
    >
      <span
        className={`absolute h-4 w-4 rounded-full bg-white shadow transition-all ${
          on ? "right-0.5" : "right-4"
        }`}
      />
    </span>
  );
}

/* ============== Bottom Sheet: تمديد ============== */
function ExtendSheet({
  ad,
  busy,
  onClose,
  onPick,
}: {
  ad: Ad;
  busy: boolean;
  onClose: () => void;
  onPick: (days: number) => void;
}) {
  return (
    <Sheet title="تمديد الحملة" subtitle={ad.title} onClose={onClose}>
      <p className="mb-3 text-xs font-bold text-slate-500">
        اختر عدد الأيام (تُخصم من رصيد BC):
      </p>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {BOOST_EXTENSIONS.map((ext) => (
          <button
            key={ext.days}
            disabled={busy}
            onClick={() => onPick(ext.days)}
            className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 py-3 transition hover:border-brand-400 hover:bg-brand-50 active:scale-95 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800"
          >
            <span className="text-base font-black text-slate-900 dark:text-white">
              {ext.label}
            </span>
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">
              {ext.price} BC
            </span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/* ============== Bottom Sheet: إحصائيات ============== */
function StatsSheet({ ad, onClose }: { ad: Ad; onClose: () => void }) {
  const rows = [
    { label: "مرات الظهور", value: num(ad.sponsoredImpressions), icon: <Eye size={15} /> },
    { label: "النقرات", value: num(ad.sponsoredClicks), icon: <MousePointerClick size={15} /> },
    { label: "زيارات الإعلان", value: num(ad.views), icon: <Eye size={15} /> },
    { label: "الاتصالات", value: num(ad.phoneClicks), icon: <Phone size={15} /> },
    { label: "رسائل واتساب", value: num(ad.whatsappClicks), icon: <MessageCircle size={15} /> },
    { label: "المفضلة", value: num((ad as any).favoritesCount), icon: <Heart size={15} /> },
    { label: "المشاركات", value: num((ad as any).shareClicks), icon: <Share2 size={15} /> },
  ];
  const max = Math.max(1, ...rows.map((r) => r.value));
  const ctr = campaignCtr(ad);

  return (
    <Sheet title="إحصائيات الحملة" subtitle={ad.title} onClose={onClose}>
      <div className="mb-4 rounded-2xl bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] px-4 py-3 text-center text-white">
        <span className="text-xs font-bold text-white/60">نسبة النقر للظهور CTR</span>
        <div className="text-2xl font-black tabular-nums">{ctr.toFixed(1)}%</div>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                {r.icon} {r.label}
              </span>
              <span className="font-black tabular-nums text-slate-900 dark:text-white">
                {arNum(r.value)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-l from-brand-500 to-brand-700"
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-slate-400">
        الأرقام تراكمية منذ بدء الحملة.
      </p>
    </Sheet>
  );
}

/* ============== Bottom Sheet أساسي ============== */
function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        dir="rtl"
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-900"
        style={{
          animation: "sheetUp 0.25s ease",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-slate-900 dark:text-white">{title}</h3>
            {subtitle && (
              <p className="line-clamp-1 text-xs font-bold text-slate-500">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 active:scale-90 dark:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
      <style>{`@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
    </div>
  );
}

/* ============== حالات ============== */
function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-action-50 text-action-500 dark:bg-action-500/15">
        <Megaphone size={30} />
      </div>
      <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
        لا توجد حملات ممولة بعد
      </p>
      <p className="mt-1 text-sm text-slate-500">
        موّل أحد إعلاناتك ليتصدّر نتائج المنصة، وتابع أداءه لحظة بلحظة من هنا.
      </p>
      <Link
        href="/my-listings"
        className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-action-500 px-5 py-3 text-sm font-black text-white shadow-action active:scale-95"
      >
        <Megaphone size={16} /> إنشاء حملة ممولة
      </Link>
    </div>
  );
}

function AdsManagerSkeleton() {
  return (
    <section className="container py-4 sm:py-7">
      <div className="mx-auto max-w-2xl">
        <div className="h-36 animate-pulse rounded-[1.75rem] bg-slate-200 dark:bg-slate-800" />
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
        <div className="mt-6 space-y-3">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
