"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  Bell,
  BellOff,
  Calendar,
  Car,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Tag,
  Trash2,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import type { SearchAlert } from "@/lib/types";

export default function AlertsListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/alerts");
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "searchAlerts"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAlerts(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      },
      (err) => {
        toast.error(err.message || "تعذّر تحميل التنبيهات");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, authLoading, router, toast]);

  const handleToggle = async (alert: SearchAlert) => {
    if (!user) return;
    try {
      setBusyId(alert.id);
      await updateDoc(doc(db, "users", user.uid, "searchAlerts", alert.id), {
        isActive: !alert.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err: any) {
      toast.error(err.message || "تعذّر التحديث");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (alert: SearchAlert) => {
    if (!user) return;
    const ok = await confirm({
      title: "حذف التنبيه؟",
      message: `سيتم حذف "${describeAlert(alert)}" نهائياً.`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      tone: "danger",
    });
    if (!ok) return;
    try {
      setBusyId(alert.id);
      await deleteDoc(doc(db, "users", user.uid, "searchAlerts", alert.id));
      toast.success("تم حذف التنبيه");
    } catch (err: any) {
      toast.error(err.message || "تعذّر الحذف");
    } finally {
      setBusyId(null);
    }
  };

  const activeCount = alerts.filter((a) => a.isActive).length;

  if (authLoading || loading) {
    return (
      <section className="container py-4 pb-28 sm:py-8">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="container py-4 pb-28 sm:py-8 sm:pb-32">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* ==================== Header card ==================== */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-brand-800 via-brand-700 to-ink p-5 text-white shadow-blue sm:p-7">
          {/* لمسة برتقالية - نقطة هوية */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-12 -left-12 h-48 w-48 rounded-full bg-action-500/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-brand-400/20 blur-3xl"
          />

          <div className="relative flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Bell size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-black sm:text-2xl">تنبيهات سياراتي</h1>
              <p className="mt-1 text-xs leading-6 text-white/85 sm:text-sm">
                احصل على إشعار فوري عند إضافة سيارة تطابق بحثك.
              </p>
            </div>
          </div>

          <div className="relative mt-4 flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              {activeCount} نشط
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              المجموع: {alerts.length}
            </div>

            <div className="flex-1" />

            <Link
              href="/alerts/new"
              className="
                inline-flex h-10 items-center gap-1.5 rounded-2xl
                bg-action-500 px-4 text-xs font-black text-white
                shadow-action transition active:scale-95 hover:bg-action-600
                sm:text-sm
              "
            >
              <Plus size={16} />
              إضافة تنبيه جديد
            </Link>
          </div>
        </div>

        {/* ==================== Empty state ==================== */}
        {alerts.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
              <Bell size={28} />
            </div>
            <h2 className="mt-4 text-base font-black text-slate-900 dark:text-white">
              لا توجد تنبيهات
            </h2>
            <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
              قم بإعداد تنبيه لتلقّي إشعارات عند عرض سيارات مطابقة لبحثك.
            </p>
            <Link
              href="/alerts/new"
              className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-2xl bg-brand-700 px-4 text-xs font-black text-white shadow-blue transition active:scale-95 hover:bg-brand-600"
            >
              <Plus size={16} />
              إضافة تنبيه جديد
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                busy={busyId === alert.id}
                onToggle={() => handleToggle(alert)}
                onDelete={() => handleDelete(alert)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================================
 * AlertCard
 * ============================================================ */
function AlertCard({
  alert,
  busy,
  onToggle,
  onDelete,
}: {
  alert: SearchAlert;
  busy: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const chips: { icon: React.ReactNode; label: string }[] = [];
  if (alert.brand || alert.model) {
    chips.push({
      icon: <Car size={11} />,
      label: [alert.brand, alert.model].filter(Boolean).join(" "),
    });
  }
  if (alert.yearFrom || alert.yearTo) {
    chips.push({
      icon: <Calendar size={11} />,
      label: `${alert.yearFrom ?? ""}${alert.yearFrom && alert.yearTo ? " - " : ""}${alert.yearTo ?? ""}`,
    });
  }
  if (alert.priceFrom != null || alert.priceTo != null) {
    chips.push({
      icon: <Tag size={11} />,
      label: `${alert.priceFrom?.toLocaleString("ar-LY") ?? "0"} - ${alert.priceTo?.toLocaleString("ar-LY") ?? "∞"} د.ل`,
    });
  }
  if (alert.city) {
    chips.push({ icon: <MapPin size={11} />, label: alert.city });
  }

  return (
    <div
      className={`
        relative overflow-hidden rounded-3xl border bg-white p-4 shadow-card transition
        dark:bg-slate-900
        ${alert.isActive
          ? "border-brand-200 dark:border-brand-800/50"
          : "border-slate-200 opacity-70 dark:border-slate-700"}
      `}
    >
      {/* شريط حالة جانبي */}
      <div
        aria-hidden="true"
        className={`absolute inset-y-0 right-0 w-1 ${alert.isActive ? "bg-action-500" : "bg-slate-300 dark:bg-slate-700"}`}
      />

      <div className="flex items-start gap-3">
        <div
          className={`
            flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl
            ${alert.isActive
              ? "bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}
          `}
        >
          {alert.isActive ? <Bell size={18} /> : <BellOff size={18} />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {alert.label || describeAlert(alert)}
          </h3>
          {alert.label && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {describeAlert(alert)}
            </p>
          )}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.map((chip, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {chip.icon}
              {chip.label}
            </span>
          ))}
        </div>
      )}

      <Link
        href={buildMatchesHref(alert)}
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl bg-brand-700 text-xs font-black text-white shadow-blue transition active:scale-[0.98] hover:bg-brand-600"
      >
        <Search size={14} />
        عرض السيارات المطابقة
      </Link>

      <div className="mt-2 flex gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`
            inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl
            border text-[11px] font-black transition active:scale-95 disabled:opacity-60
            ${alert.isActive
              ? "border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-300"}
          `}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : alert.isActive ? <BellOff size={13} /> : <Bell size={13} />}
          {alert.isActive ? "إيقاف" : "تفعيل"}
        </button>
        <Link
          href={`/alerts/new?id=${alert.id}`}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 text-[11px] font-black text-slate-600 transition active:scale-95 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Pencil size={13} />
          تعديل
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 text-[11px] font-black text-rose-600 transition active:scale-95 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-900/20"
        >
          <Trash2 size={13} />
          حذف
        </button>
      </div>
    </div>
  );
}

/** يبني وصفاً مختصراً للتنبيه إن لم يحدّد المستخدم اسماً (label). */
function describeAlert(a: SearchAlert): string {
  const parts: string[] = [];
  if (a.brand) parts.push(a.brand);
  if (a.model) parts.push(a.model);
  if (a.city) parts.push(`في ${a.city}`);
  if (parts.length === 0) return "تنبيه بحث";
  return parts.join(" ");
}

/** يبني رابط صفحة الإعلانات مفلتراً بمعايير التنبيه (لعرض المطابق فوراً). */
function buildMatchesHref(a: SearchAlert): string {
  const sp = new URLSearchParams();
  const q = [a.brand, a.model].filter(Boolean).join(" ").trim();
  if (q) sp.set("q", q);
  if (a.city) sp.set("city", a.city);
  if (a.priceFrom != null) sp.set("min", String(a.priceFrom));
  if (a.priceTo != null) sp.set("max", String(a.priceTo));
  const qs = sp.toString();
  return qs ? `/listings?${qs}` : "/listings";
}
