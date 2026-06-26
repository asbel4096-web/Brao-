"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageSkeleton } from "@/components/admin/ui/admin-loading";
import Link from "next/link";
import Image from "next/image";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  limit as fbLimit,
} from "firebase/firestore";
import {
  ArrowRight,
  Check,
  X,
  CheckCheck,
  Loader2,
  CheckSquare,
  Square,
  ShieldCheck,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { createNotification } from "@/lib/notifications";

const REJECT_REASONS = [
  "صور غير واضحة أو غير حقيقية",
  "معلومات ناقصة أو غير دقيقة",
  "السعر غير منطقي",
  "محتوى مخالف أو مكرّر",
  "رقم تواصل غير صحيح",
];

const arNum = (v: number) => (Number(v) || 0).toLocaleString("ar-LY");

export default function ModerationQueuePage() {
  const { loading: authLoading } = useAuth();
  const { can } = useAdminRole();
  const toast = useToast();

  const [items, setItems] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [rejectFor, setRejectFor] = useState<any[] | null>(null); // عناصر الرفض (واحد أو دفعة)
  const [reason, setReason] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "listings"),
      orderBy("createdAt", "desc"),
      fbLimit(300)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setItems(all.filter((l) => l.status === "pending"));
      },
      () => setItems([])
    );
    return () => unsub();
  }, []);

  const allSelected = useMemo(
    () => !!items && items.length > 0 && selected.size === items.length,
    [items, selected]
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function toggleAll() {
    if (!items) return;
    setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)));
  }

  async function approveOne(it: any) {
    await updateDoc(doc(db, "listings", it.id), {
      status: "approved",
      rejectionReason: "",
      updatedAt: serverTimestamp(),
    });
    if (it.ownerId) {
      await createNotification({
        userId: it.ownerId,
        type: "listing_approved",
        title: "تم اعتماد إعلانك",
        body: `تمت الموافقة على: ${it.title}`,
        link: `/listings/${it.id}`,
      });
      try {
        const idToken = await auth.currentUser?.getIdToken();
        await fetch("/api/wallet/referrals/claim", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken || ""}`,
          },
          body: JSON.stringify({ listingId: it.id, uid: it.ownerId }),
        });
      } catch {
        /* مكافأة الإحالة لا تُفشل الاعتماد */
      }
    }
  }

  async function rejectOne(it: any, why: string) {
    await updateDoc(doc(db, "listings", it.id), {
      status: "rejected",
      rejectionReason: why || "",
      updatedAt: serverTimestamp(),
    });
    if (it.ownerId) {
      await createNotification({
        userId: it.ownerId,
        type: "listing_rejected",
        title: "تم رفض إعلانك",
        body: `${it.title}${why ? ` — السبب: ${why}` : ""}`,
        link: `/my-listings/${it.id}/edit`,
      });
    }
  }

  async function runApprove(list: any[]) {
    if (busy || list.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const it of list) {
      try {
        await approveOne(it);
        ok++;
      } catch {
        /* تابع البقية */
      }
    }
    setSelected(new Set());
    setBusy(false);
    toast.success(`تم اعتماد ${arNum(ok)} إعلان`);
  }

  async function runReject(list: any[], why: string) {
    if (busy || list.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const it of list) {
      try {
        await rejectOne(it, why);
        ok++;
      } catch {
        /* تابع */
      }
    }
    setSelected(new Set());
    setRejectFor(null);
    setReason("");
    setBusy(false);
    toast.success(`تم رفض ${arNum(ok)} إعلان`);
  }

  if (authLoading || items === null) {
    return (
      <AdminPageSkeleton variant="table" />
    );
  }
  if (!can("listings.approve")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية مراجعة الإعلانات.
      </div>
    );
  }

  const selectedItems = items.filter((i) => selected.has(i.id));

  return (
    <div className="space-y-4 pb-28" dir="rtl">
      {/* رأس */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          aria-label="رجوع"
        >
          <ArrowRight size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
            <ShieldCheck size={22} className="text-brand-600 dark:text-brand-300" />
            مركز الإشراف
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {arNum(items.length)} إعلان بانتظار المراجعة
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
          <CheckCheck size={40} className="mx-auto mb-2 text-emerald-400" />
          <p className="text-base font-black text-slate-900 dark:text-white">
            لا يوجد إعلانات معلّقة 🎉
          </p>
          <p className="mt-1 text-sm text-slate-400">كل شيء تمت مراجعته.</p>
        </div>
      ) : (
        <>
          {/* شريط التحديد */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-2 text-sm font-black text-slate-700 dark:text-slate-200"
            >
              {allSelected ? (
                <CheckSquare size={18} className="text-brand-600" />
              ) : (
                <Square size={18} className="text-slate-400" />
              )}
              تحديد الكل
            </button>
            {selected.size > 0 && (
              <span className="text-xs font-bold text-slate-500">
                محدّد: {arNum(selected.size)}
              </span>
            )}
          </div>

          {/* القائمة */}
          <div className="space-y-2.5">
            {items.map((it) => {
              const checked = selected.has(it.id);
              return (
                <div
                  key={it.id}
                  className={`flex gap-3 rounded-2xl border bg-white p-3 transition dark:bg-slate-900 ${
                    checked
                      ? "border-brand-300 ring-1 ring-brand-200 dark:border-brand-700 dark:ring-brand-800"
                      : "border-slate-100 dark:border-slate-800"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(it.id)}
                    className="shrink-0 self-start pt-1"
                    aria-label="تحديد"
                  >
                    {checked ? (
                      <CheckSquare size={20} className="text-brand-600" />
                    ) : (
                      <Square size={20} className="text-slate-300 dark:text-slate-600" />
                    )}
                  </button>

                  <Link href={`/listings/${it.id}`} className="shrink-0">
                    <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-slate-100 dark:ring-slate-800">
                      <Image
                        src={it.images?.[0] || "/icons/car-card.svg"}
                        alt={it.title || ""}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/listings/${it.id}`}
                      className="line-clamp-1 text-sm font-black text-slate-900 hover:text-brand-700 dark:text-white"
                    >
                      {it.title || "إعلان"}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {it.brand} {it.model} · {arNum(it.price)} د.ل · {it.city}
                    </p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => runApprove([it])}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:bg-emerald-500/15 dark:text-emerald-300"
                      >
                        <Check size={13} /> اعتماد
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setReason("");
                          setRejectFor([it]);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-3 py-1.5 text-[11px] font-black text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/15 dark:text-rose-300"
                      >
                        <X size={13} /> رفض
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* شريط الإجراءات الجماعية (يظهر عند التحديد) */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <span className="text-xs font-black text-slate-600 dark:text-slate-300">
              {arNum(selected.size)} محدّد
            </span>
            <div className="flex-1" />
            <button
              type="button"
              disabled={busy}
              onClick={() => runApprove(selectedItems)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-50"
            >
              {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
              اعتماد الكل
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setReason("");
                setRejectFor(selectedItems);
              }}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-rose-500 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-rose-600 disabled:opacity-50"
            >
              <X size={15} /> رفض الكل
            </button>
          </div>
        </div>
      )}

      {/* نافذة سبب الرفض */}
      {rejectFor && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
          onClick={() => !busy && setRejectFor(null)}
        >
          <div
            dir="rtl"
            className="w-full max-w-md rounded-t-3xl bg-white p-5 dark:bg-slate-900 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom))" }}
          >
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              سبب الرفض
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              سيصل السبب إلى صاحب الإعلان ({arNum(rejectFor.length)} إعلان).
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {REJECT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition ${
                    reason === r
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أو اكتب سبباً مخصّصاً…"
              rows={2}
              className="mt-3 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:border-brand-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => runReject(rejectFor, reason)}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-500 py-3 text-sm font-black text-white transition hover:bg-rose-600 disabled:opacity-50"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                تأكيد الرفض
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejectFor(null)}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 dark:border-slate-700 dark:text-slate-300"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
