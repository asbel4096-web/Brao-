"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { CheckCircle, XCircle, Trash2, ExternalLink, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { formatPrice, timeAgo } from "@/lib/utils";

export default function AdminListingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rejectingItem, setRejectingItem] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = filter === "all" ? items : items.filter((i) => i.status === filter);

  const counts = {
    all: items.length,
    pending: items.filter((i) => i.status === "pending").length,
    approved: items.filter((i) => i.status === "approved").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };

  const approve = async (it: any) => {
    try {
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
      }
      toast.success("تم اعتماد الإعلان.");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر اعتماد الإعلان.");
    }
  };

  const submitRejection = async (it: any, reason: string) => {
    try {
      await updateDoc(doc(db, "listings", it.id), {
        status: "rejected",
        rejectionReason: reason || "",
        updatedAt: serverTimestamp(),
      });
      if (it.ownerId) {
        await createNotification({
          userId: it.ownerId,
          type: "listing_rejected",
          title: "تم رفض إعلانك",
          body: `${it.title}${reason ? ` — السبب: ${reason}` : ""}`,
          link: `/my-listings/${it.id}/edit`,
        });
      }
      toast.success("تم رفض الإعلان.");
      setRejectingItem(null);
    } catch (e: any) {
      toast.error(e?.message || "تعذّر رفض الإعلان.");
    }
  };

  const remove = async (it: any) => {
    const ok = await confirm({
      title: "حذف الإعلان نهائياً؟",
      message: `سيتم حذف "${it.title}" بشكل دائم. لا يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: "حذف نهائي",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "listings", it.id));
      toast.success("تم حذف الإعلان.");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر حذف الإعلان.");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">مراجعة الإعلانات</h1>
        <p className="section-subtitle">اعتمد، ارفض، أو احذف الإعلانات.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {([
          { key: "pending", label: "معلّقة" },
          { key: "approved", label: "معتمدة" },
          { key: "rejected", label: "مرفوضة" },
          { key: "all", label: "الكل" },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-bold transition ${
              filter === t.key
                ? "bg-brand-700 text-white shadow-blue"
                : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            {t.label}
            <span
              className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                filter === t.key
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {counts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-32" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">لا توجد عناصر.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((it) => (
            <div key={it.id} className="card p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.images?.[0] || "/icons/car-card.svg"}
                  alt={it.title}
                  loading="lazy"
                  className="h-28 w-full rounded-2xl object-cover bg-slate-100 sm:w-40 lg:w-48"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black dark:text-white">{it.title}</h3>
                    <span className={
                      it.status === "approved" ? "badge-status-approved" :
                      it.status === "rejected" ? "badge-status-rejected" :
                      "badge-status-pending"
                    }>
                      {it.status === "approved" ? "معتمد" : it.status === "rejected" ? "مرفوض" : "معلّق"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {it.city} • {it.category} • {it.sellerName} • {timeAgo(it.createdAt)}
                  </p>
                  <p className="mt-1 text-sm font-black text-brand-700 dark:text-brand-300">
                    {formatPrice(it.price)}
                  </p>
                  {it.rejectionReason && (
                    <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
                      سبب الرفض السابق: {it.rejectionReason}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/listings/${it.id}`}
                      target="_blank"
                      className="btn-ghost !px-3 !py-2 !text-xs"
                    >
                      <ExternalLink size={12} /> معاينة
                    </Link>
                    {it.status !== "approved" && (
                      <button onClick={() => approve(it)} className="btn-success !py-2 !px-3 !text-xs">
                        <CheckCircle size={14} /> اعتماد
                      </button>
                    )}
                    {it.status !== "rejected" && (
                      <button
                        onClick={() => setRejectingItem(it)}
                        className="btn-secondary !py-2 !px-3 !text-xs !border-amber-300 !text-amber-700"
                      >
                        <XCircle size={14} /> رفض
                      </button>
                    )}
                    <button onClick={() => remove(it)} className="btn-danger !py-2 !px-3 !text-xs">
                      <Trash2 size={14} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectingItem && (
        <RejectDialog
          item={rejectingItem}
          onClose={() => setRejectingItem(null)}
          onSubmit={submitRejection}
        />
      )}
    </div>
  );
}

function RejectDialog({
  item,
  onClose,
  onSubmit,
}: {
  item: any;
  onClose: () => void;
  onSubmit: (item: any, reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    setBusy(true);
    try {
      await onSubmit(item, reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="
          w-full max-w-md overflow-hidden
          rounded-t-3xl border border-slate-200 bg-white shadow-2xl
          animate-slide-up
          dark:border-slate-700 dark:bg-slate-900
          sm:rounded-3xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              رفض الإعلان
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {item.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <label className="label">سبب الرفض (اختياري)</label>
          <textarea
            className="input min-h-[100px] resize-y"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثال: الصور غير واضحة، السعر مبالغ فيه..."
            maxLength={300}
            autoFocus
          />
          <p className="mt-2 text-xs text-slate-500">
            سيظهر هذا السبب لصاحب الإعلان لتعديله.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button onClick={onClose} className="btn-secondary" disabled={busy}>
              إلغاء
            </button>
            <button
              onClick={handle}
              disabled={busy}
              className="btn-action !bg-rose-600 hover:!bg-rose-700"
            >
              {busy ? "جارٍ الرفض..." : "تأكيد الرفض"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
