"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
} from "firebase/firestore";
import {
  Megaphone,
  Sparkles,
  Wrench,
  Tag,
  Bell,
  Users,
  Send,
  CheckCircle2,
  Clock,
  ArrowRight,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { AdminPageSkeleton } from "@/components/admin/ui/admin-loading";
import { useAuth } from "@/contexts/AuthContext";
import {
  BROADCAST_TYPES,
  type BroadcastRecord,
  type BroadcastTypeKey,
} from "@/lib/types";

/**
 * سجلّ الإشعارات الجماعية (broadcasts) للأدمن.
 *
 * يقرأ collection /broadcasts realtime، مرتّباً بالأحدث.
 * القاعدة تسمح بالقراءة للأدمن فقط (allow read: if isAdmin()).
 *
 * لكل broadcast نعرض: النوع، العنوان، النص، من أرسله، متى، وإحصاءات
 * الوصول (كم مستخدم، كم push نجح/فشل).
 */

const ICON_FOR: Record<BroadcastTypeKey, typeof Sparkles> = {
  broadcast_featured: Sparkles,
  broadcast_service: Wrench,
  broadcast_campaign: Tag,
  broadcast_general: Bell,
};

const BG_FOR: Record<BroadcastTypeKey, string> = {
  broadcast_featured: "bg-action-500",
  broadcast_service: "bg-emerald-500",
  broadcast_campaign: "bg-rose-500",
  broadcast_general: "bg-brand-700",
};

function labelFor(type: BroadcastTypeKey): string {
  return BROADCAST_TYPES.find((t) => t.key === type)?.label || "إشعار";
}

function formatDate(ts: any): string {
  const ms = ts?.toMillis?.();
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString("ar-LY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function BroadcastHistoryPage() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // لا نشترك حتى نتأكد أن المستخدم أدمن (تجنّب permission-denied متكرر).
    if (authLoading || !profile?.isAdmin) return;

    const q = query(
      collection(db, "broadcasts"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((d) => ({ ...(d.data() as any), id: d.id }))
        );
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[broadcast-history] error:", err?.code, err?.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [authLoading, profile?.isAdmin]);

  if (authLoading) {
    return <AdminPageSkeleton variant="table" />;
  }

  if (!profile?.isAdmin) {
    return (
      <div className="container py-10 text-center text-slate-500">
        لا تملك صلاحية الوصول إلى هذه الصفحة.
      </div>
    );
  }

  return (
    <section className="container py-4 pb-24 sm:py-6">
      {/* العنوان + زر إرسال جديد */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-action-50 text-action-700 dark:bg-action-900/30 dark:text-action-300">
            <Megaphone size={24} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
              سجلّ الإشعارات الجماعية
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              كل ما أُرسل سابقاً، مع إحصاءات الوصول.
            </p>
          </div>
        </div>
        <Link
          href="/admin/broadcast"
          className="
            inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl
            bg-action-500 px-4 text-xs font-black text-white shadow-action
            transition hover:bg-action-600 active:scale-95
          "
        >
          <Send size={14} />
          إرسال جديد
        </Link>
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
          <div className="skeleton h-28" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-8 text-center">
          <Megaphone
            size={40}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            لم تُرسل أي إشعارات جماعية بعد.
          </p>
          <Link
            href="/admin/broadcast"
            className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
          >
            أرسل أول إشعار
            <ArrowRight size={14} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => {
            const Icon = ICON_FOR[b.type] || Bell;
            return (
              <article
                key={b.id}
                className="card p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  {/* أيقونة النوع */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white ${BG_FOR[b.type] || "bg-brand-700"}`}
                  >
                    <Icon size={20} />
                  </div>

                  <div className="min-w-0 flex-1">
                    {/* النوع + التاريخ */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                        {labelFor(b.type)}
                      </span>
                      {b.status === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          <Clock size={10} />
                          قيد الإرسال
                        </span>
                      )}
                    </div>

                    {/* العنوان */}
                    <h3 className="mt-0.5 text-sm font-black text-slate-900 dark:text-white sm:text-[15px]">
                      {b.title}
                    </h3>

                    {/* النص */}
                    <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-slate-600 dark:text-slate-300">
                      {b.body}
                    </p>

                    {/* رابط مرفق إن وُجد */}
                    {b.link && (
                      <Link
                        href={b.link}
                        className="mt-1 inline-block text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-300"
                        dir="ltr"
                      >
                        {b.link}
                      </Link>
                    )}

                    {/* إحصاءات */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Stat
                        icon={<Users size={13} />}
                        label="مستخدم"
                        value={b.recipientCount ?? 0}
                      />
                      <Stat
                        icon={<CheckCircle2 size={13} />}
                        label="push نجح"
                        value={b.pushSentCount ?? 0}
                        accent="emerald"
                      />
                      {(b.pushFailedCount ?? 0) > 0 && (
                        <Stat
                          icon={<Send size={13} />}
                          label="push فشل"
                          value={b.pushFailedCount ?? 0}
                          accent="rose"
                        />
                      )}
                    </div>

                    {/* meta سفلي: من + متى */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                      {b.createdByEmail && (
                        <span>أرسله: {b.createdByEmail}</span>
                      )}
                      {b.createdAt && <span>{formatDate(b.createdAt)}</span>}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
  accent = "slate",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "slate" | "emerald" | "rose";
}) {
  const color =
    accent === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "rose"
      ? "text-rose-600 dark:text-rose-400"
      : "text-slate-600 dark:text-slate-300";
  return (
    <div className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${color}`}>
      {icon}
      <span className="tabular-nums">{value.toLocaleString("ar-LY")}</span>
      <span className="text-slate-400 dark:text-slate-500">{label}</span>
    </div>
  );
}
