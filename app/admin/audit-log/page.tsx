"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ScrollText,
  Loader2,
  Ban,
  ShieldCheck,
  UserCog,
  BadgeCheck,
  Tag,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface LogItem {
  id: string;
  action: string;
  adminName: string;
  targetUid: string | null;
  details: string | null;
  at: number;
}

const ACTION_META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  user_ban: { label: "حظر مستخدم", icon: Ban, tone: "text-rose-600 dark:text-rose-300" },
  user_unban: { label: "رفع الحظر", icon: ShieldCheck, tone: "text-emerald-600 dark:text-emerald-300" },
  user_role_change: { label: "تغيير صلاحية", icon: UserCog, tone: "text-brand-600 dark:text-brand-300" },
  user_verify: { label: "توثيق مستخدم", icon: BadgeCheck, tone: "text-emerald-600 dark:text-emerald-300" },
  user_unverify: { label: "إلغاء توثيق", icon: BadgeCheck, tone: "text-amber-600 dark:text-amber-300" },
  promo_pricing_update: { label: "تعديل أسعار الباقات", icon: Tag, tone: "text-action-600 dark:text-action-300" },
};

function fmt(ms: number) {
  if (!ms) return "";
  return new Date(ms).toLocaleString("ar-LY", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const { profile, loading: authLoading } = useAuth();
  const [items, setItems] = useState<LogItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/audit-log", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) throw new Error(json?.error || "تعذّر التحميل");
        if (!cancelled) setItems(json.items || []);
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "خطأ");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="animate-spin text-brand-600" />
      </div>
    );
  }
  if ((profile as any)?.isAdmin !== true) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        هذه الصفحة للأدمن فقط.
      </div>
    );
  }

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </Link>
        <div>
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            <ScrollText size={22} className="text-brand-600 dark:text-brand-300" />
            سجلّ التدقيق
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            من فعل ماذا ومتى
          </p>
        </div>
      </div>

      {items === null ? (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <ScrollText size={40} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
          <p className="text-base font-black text-slate-900 dark:text-white">السجلّ فارغ</p>
          <p className="mt-1 text-sm text-slate-400">ستظهر هنا إجراءات الأدمن.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((it) => {
            const meta = ACTION_META[it.action] || {
              label: it.action,
              icon: Activity,
              tone: "text-slate-500",
            };
            const Icon = meta.icon;
            return (
              <div
                key={it.id}
                className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                  <Icon size={16} className={meta.tone} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {meta.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    بواسطة <span className="font-bold">{it.adminName}</span>
                    {it.targetUid && ` · الهدف: ${it.targetUid.slice(0, 8)}…`}
                  </p>
                  {it.details && (
                    <p className="mt-1 truncate text-[10px] text-slate-400" title={it.details}>
                      {it.details}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">{fmt(it.at)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
