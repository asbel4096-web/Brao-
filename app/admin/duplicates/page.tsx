"use client";

import { useEffect, useState } from "react";
import { AdminPageSkeleton } from "@/components/admin/ui/admin-loading";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Copy, Phone, AlertTriangle } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

const arNum = (v: number) => (Number(v) || 0).toLocaleString("ar-LY");

const STATUS_AR: Record<string, string> = {
  approved: "معتمد",
  pending: "معلّق",
  rejected: "مرفوض",
};

export default function DuplicatesPage() {
  const { profile, loading: authLoading } = useAuth();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/duplicates", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json?.ok === false) throw new Error(json?.error || "تعذّر الفحص");
        if (!cancelled) setData(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "خطأ");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (authLoading) {
    return (
      <AdminPageSkeleton variant="table" />
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
            <Copy size={20} className="text-amber-500" />
            كشف التكرار
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            إعلانات مكرّرة وأرقام عالية النشاط
          </p>
        </div>
      </div>

      {!data && !error ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
          {error}
        </div>
      ) : data ? (
        <>
          <p className="text-[11px] text-slate-400">
            تم فحص أحدث {arNum(data.scanned)} إعلان.
          </p>

          {/* أرقام عالية النشاط */}
          {data.highVolume?.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-900/15">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-black text-amber-800 dark:text-amber-200">
                <AlertTriangle size={15} />
                أرقام عالية النشاط
              </h2>
              <div className="flex flex-wrap gap-2">
                {data.highVolume.map((h: any) => (
                  <span
                    key={h.phone}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-amber-700 ring-1 ring-amber-200 dark:bg-slate-900 dark:text-amber-300 dark:ring-amber-900/40"
                  >
                    <Phone size={11} />
                    …{h.phone.slice(-6)} · {arNum(h.count)} إعلان
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[10px] text-amber-700/70 dark:text-amber-300/60">
                قد تكون معارض مشروعة أو نشاطاً مشبوهاً — راجِعها يدوياً.
              </p>
            </div>
          )}

          {/* مجموعات التكرار */}
          <div>
            <h2 className="mb-2 text-sm font-black text-slate-900 dark:text-white">
              إعلانات مكرّرة ({arNum(data.duplicateGroups?.length || 0)})
            </h2>
            {!data.duplicateGroups || data.duplicateGroups.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
                <Copy size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  لا تكرار واضح 🎉
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.duplicateGroups.map((g: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-3xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-black text-slate-900 dark:text-white">
                        {g.title}
                      </p>
                      <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                        {arNum(g.count)} نسخة
                      </span>
                    </div>
                    <p className="mb-2 flex items-center gap-1 text-[11px] text-slate-400">
                      <Phone size={11} /> …{g.phone.slice(-6)}
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {g.listings.map((l: any) => (
                        <Link
                          key={l.id}
                          href={`/listings/${l.id}`}
                          className="group relative shrink-0"
                        >
                          <div className="relative h-16 w-20 overflow-hidden rounded-xl ring-1 ring-slate-100 dark:ring-slate-800">
                            <Image
                              src={l.image || "/icons/car-card.svg"}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                          <span className="mt-1 block text-center text-[9px] font-bold text-slate-400">
                            {STATUS_AR[l.status] || l.status}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
