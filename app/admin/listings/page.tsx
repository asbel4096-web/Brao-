"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from "firebase/firestore";
import { CheckCircle, XCircle, Trash2, ExternalLink } from "lucide-react";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { formatPrice, timeAgo } from "@/lib/utils";

export default function AdminListingsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [message, setMessage] = useState("");

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
      setMessage("تم اعتماد الإعلان.");
    } catch (e: any) {
      alert(e?.message || "خطأ.");
    }
  };

  const reject = async (it: any) => {
    const reason = prompt("سبب الرفض (اختياري):", "");
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
      setMessage("تم رفض الإعلان.");
    } catch (e: any) {
      alert(e?.message || "خطأ.");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الإعلان نهائياً؟")) return;
    await deleteDoc(doc(db, "listings", id));
    setMessage("تم حذف الإعلان.");
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
            className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-bold transition ${
              filter === t.key
                ? "bg-brand-700 text-white shadow-blue"
                : "bg-white text-slate-700 border border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-700"
            }`}
          >
            {t.label} ({counts[t.key]})
          </button>
        ))}
      </div>

      {message && (
        <div className="card border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      )}

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
                    <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
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
                      <button onClick={() => reject(it)} className="btn-secondary !py-2 !px-3 !text-xs !border-amber-300 !text-amber-700">
                        <XCircle size={14} /> رفض
                      </button>
                    )}
                    <button onClick={() => remove(it.id)} className="btn-danger !py-2 !px-3 !text-xs">
                      <Trash2 size={14} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
