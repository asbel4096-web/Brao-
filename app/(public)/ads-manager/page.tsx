"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  Pause,
  Play,
  Plus,
  BarChart3,
  Trash2,
  Heart,
  Share2,
  X,
  ChevronLeft,
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
        // حملة = ترقية نشطة (مميز/ممول/VIP) أو تاريخ حملة سابق
        const promoted = all.filter(
          (l) => getPromotionTier(l) > 0 || campaignStatus(l) !== "none"
        );
        // ترتيب: نشطة أولاً ثم متوقفة ثم منتهية، وكل مجموعة بالأحدث
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
    return {
      impressions: list.reduce((s, a) => s + num(a.sponsoredImpressions), 0),
      clicks: list.reduce((s, a) => s + num(a.sponsoredClicks), 0),
      calls: list.reduce((s, a) => s + num(a.phoneClicks), 0),
    };
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
    <section dir="rtl" className="container py-5 pb-28 sm:py-8">
      <div className="mx-auto max-w-2xl">
        {/* العنوان */}
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="text-action-500" />
          <h1 className="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
            مدير إعلاناتي
          </h1>
        </div>

        {/* إحصائيات سريعة */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Quick icon={<Eye size={16} />} label="المشاهدات" value={totals.impressions} tint="brand" />
          <Quick icon={<MousePointerClick size={16} />} label="النقرات" value={totals.clicks} tint="emerald" />
          <Quick icon={<Phone size={16} />} label="الاتصالات" value={totals.calls} tint="amber" />
          <Quick icon={<Wallet size={16} />} label="الإنفاق" value={spend} suffix="BC" tint="rose" />
        </div>

        {/* القائمة */}
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
                onEnd={() => doAction(ad, "/api/wallet/boost/pause", "تم إيقاف ظهور الحملة")}
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
          rounded-full bg-action-500 px-5 py-3 text-sm font-black text-white
          shadow-action transition active:scale-95 hover:bg-action-600
        "
      >
        <Megaphone size={18} />
        إنشاء حملة ممولة
      </Link>

      {/* Bottom Sheet — التمديد */}
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

      {/* Bottom Sheet — الإحصائيات */}
      {statsFor && (
        <StatsSheet ad={statsFor} onClose={() => setStatsFor(null)} />
      )}
    </section>
  );
}

/* ============== بطاقة الحملة مع السحب ============== */
function CampaignCard({
  ad,
  busy,
  onPause,
  onResume,
  onExtend,
  onStats,
  onEnd,
}: {
  ad: Ad;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onExtend: () => void;
  onStats: () => void;
  onEnd: () => void;
}) {
  const status = campaignStatus(ad);
  const isActive = status === "active" || getPromotionTier(ad) > 0;
  const isPaused = status === "paused";
  const remaining = campaignRemainingDays(ad);
  const img = ad.images?.[0] || "/icons/car-card.svg";

  // السحب لكشف الإجراءات
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const REVEAL = 132;

  const statusDot =
    status === "paused"
      ? "🟠"
      : status === "expired"
      ? "🔴"
      : "🟢";
  const statusCls =
    status === "paused"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
      : status === "expired"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";

  return (
    <div className="relative overflow-hidden rounded-3xl">
      {/* الدُرج اليميني (سحب لليمين): استئناف/إيقاف */}
      <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
        {isPaused ? (
          <DrawerBtn color="emerald" icon={<Play size={18} />} label="استئناف" onClick={onResume} disabled={busy} />
        ) : (
          <DrawerBtn color="amber" icon={<Pause size={18} />} label="إيقاف" onClick={onPause} disabled={busy || !isActive} />
        )}
      </div>
      {/* الدُرج اليساري (سحب لليسار): إحصائيات/تمديد/إنهاء */}
      <div className="absolute inset-y-0 left-0 flex items-center gap-2 pl-3">
        <DrawerBtn color="brand" icon={<BarChart3 size={18} />} label="إحصائيات" onClick={onStats} disabled={busy} />
        <DrawerBtn color="slate" icon={<Plus size={18} />} label="تمديد" onClick={onExtend} disabled={busy} />
        <DrawerBtn color="rose" icon={<Trash2 size={18} />} label="إنهاء" onClick={onEnd} disabled={busy || !isActive} />
      </div>

      {/* البطاقة الأمامية */}
      <div
        className="relative flex gap-3 rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900"
        style={{
          transform: `translateX(${dx}px)`,
          transition: startX.current === null ? "transform 0.25s ease" : "none",
          touchAction: "pan-y",
        }}
        onTouchStart={(e) => {
          startX.current = e.touches[0].clientX;
        }}
        onTouchMove={(e) => {
          if (startX.current === null) return;
          const d = e.touches[0].clientX - startX.current;
          setDx(Math.max(-REVEAL, Math.min(REVEAL, d)));
        }}
        onTouchEnd={() => {
          startX.current = null;
          setDx((d) => (d > REVEAL / 2 ? REVEAL : d < -REVEAL / 2 ? -REVEAL : 0));
          if (Math.abs(dx) > REVEAL / 2) haptic();
        }}
      >
        <Link href={`/listings/${ad.id}`} className="shrink-0">
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl">
            <Image src={img} alt={ad.title || ""} fill sizes="80px" className="object-cover" />
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/listings/${ad.id}`}
              className="line-clamp-1 text-sm font-black text-slate-900 dark:text-white"
            >
              {ad.title || "إعلان"}
            </Link>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black ${statusCls}`}>
              {statusDot} {STATUS_LABEL[status]}
            </span>
          </div>
          <p className="mt-0.5 text-xs font-bold text-slate-500">
            {status === "expired" ? "انتهت" : `متبقٍ ${remaining} يوم`}
            {isPaused && " (مجمّدة)"}
          </p>
          {/* إحصائيات مصغّرة */}
          <div className="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-0.5"><Eye size={12} />{num(ad.sponsoredImpressions)}</span>
            <span className="inline-flex items-center gap-0.5"><MousePointerClick size={12} />{num(ad.sponsoredClicks)}</span>
            <span className="inline-flex items-center gap-0.5"><Phone size={12} />{num(ad.phoneClicks)}</span>
            <span className="inline-flex items-center gap-0.5"><MessageCircle size={12} />{num(ad.whatsappClicks)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DrawerBtn({
  color,
  icon,
  label,
  onClick,
  disabled,
}: {
  color: "emerald" | "amber" | "brand" | "rose" | "slate";
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const cls: Record<string, string> = {
    emerald: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    brand: "bg-brand-700 text-white",
    rose: "bg-rose-600 text-white",
    slate: "bg-slate-700 text-white",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[10px] font-black transition active:scale-90 disabled:opacity-40 ${cls[color]}`}
    >
      {icon}
      {label}
    </button>
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
            <span className="text-base font-black text-slate-900 dark:text-white">{ext.label}</span>
            <span className="text-xs font-bold text-brand-700 dark:text-brand-300">{ext.price} BC</span>
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
      <div className="mb-3 rounded-2xl bg-brand-50 px-3 py-2 text-center dark:bg-brand-900/30">
        <span className="text-xs font-bold text-slate-500">نسبة النقر للظهور CTR</span>
        <div className="text-xl font-black text-brand-700 dark:text-brand-300">{ctr.toFixed(1)}%</div>
      </div>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1 font-bold text-slate-600 dark:text-slate-300">
                {r.icon} {r.label}
              </span>
              <span className="font-black tabular-nums text-slate-900 dark:text-white">
                {r.value.toLocaleString("ar-LY")}
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
        className="w-full max-w-lg rounded-t-3xl bg-white p-5 pb-8 shadow-2xl dark:bg-slate-900"
        style={{ animation: "sheetUp 0.25s ease" }}
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

/* ============== Quick stat ============== */
function Quick({
  icon,
  label,
  value,
  suffix,
  tint,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  suffix?: string;
  tint: "brand" | "emerald" | "amber" | "rose";
}) {
  const tints: Record<string, string> = {
    brand: "text-brand-700 dark:text-brand-300",
    emerald: "text-emerald-600 dark:text-emerald-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className={`mb-1 flex items-center gap-1 text-xs font-bold ${tints[tint]}`}>
        {icon}
        {label}
      </div>
      <div className="text-xl font-black tabular-nums text-slate-900 dark:text-white">
        {value.toLocaleString("ar-LY")}
        {suffix && <span className="mr-1 text-xs font-bold text-slate-400">{suffix}</span>}
      </div>
    </div>
  );
}

/* ============== حالات ============== */
function EmptyState() {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 dark:bg-amber-900/30">
        <Megaphone size={30} />
      </div>
      <p className="mt-4 text-base font-black text-slate-900 dark:text-white">
        لا توجد حملات ممولة بعد
      </p>
      <p className="mt-1 text-sm text-slate-500">
        موّل أحد إعلاناتك ليبدأ ظهوره عبر المنصة وتتابع أداءه هنا.
      </p>
      <Link
        href="/my-listings"
        className="mt-4 inline-flex items-center gap-1.5 rounded-2xl bg-action-500 px-4 py-2.5 text-sm font-black text-white shadow-action active:scale-95"
      >
        <Megaphone size={16} /> إنشاء حملة ممولة
      </Link>
    </div>
  );
}

function AdsManagerSkeleton() {
  return (
    <section className="container py-5 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 h-8 w-44 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        <div className="mb-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-700" />
          ))}
        </div>
      </div>
    </section>
  );
}
