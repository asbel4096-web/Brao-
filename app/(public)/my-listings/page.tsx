"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection, deleteDoc, doc, onSnapshot, orderBy, query, where,
} from "firebase/firestore";
import { Plus, Edit2, Trash2, Eye, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { formatPrice, timeAgo } from "@/lib/utils";
import type { Listing } from "@/lib/types";

export default function MyListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending" | "rejected">("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login?redirect=/my-listings");
      return;
    }
    const qRef = query(
      collection(db, "listings"),
      where("ownerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("my listings", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذا الإعلان؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    try {
      await deleteDoc(doc(db, "listings", id));
    } catch (err: any) {
      alert(err?.message || "تعذّر حذف الإعلان.");
    }
  };

  const filtered = filter === "all" ? items : items.filter((it) => it.status === filter);

  const counts = {
    all: items.length,
    approved: items.filter((i) => i.status === "approved").length,
    pending: items.filter((i) => i.status === "pending").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };

  if (authLoading || !user) {
    return (
      <section className="container py-10">
        <div className="card mx-auto max-w-md p-8 text-center text-slate-500">
          جارٍ التحميل...
        </div>
      </section>
    );
  }

  return (
    <section className="container py-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="section-title">إعلاناتي</h1>
          <p className="section-subtitle">إدارة وتعديل إعلاناتك ومتابعة حالتها.</p>
        </div>
        <Link href="/add-listing" className="btn-action">
          <Plus size={18} /> إضافة إعلان جديد
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {([
          { key: "all", label: "الكل" },
          { key: "approved", label: "معتمد" },
          { key: "pending", label: "قيد المراجعة" },
          { key: "rejected", label: "مرفوض" },
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

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-72" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            {filter === "all"
              ? "لم تنشر أي إعلان بعد."
              : "لا توجد إعلانات في هذا التصنيف."}
          </p>
          <Link href="/add-listing" className="btn-action mt-4 inline-flex">
            <Plus size={16} /> أنشئ إعلانك الأول
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((it) => (
            <article key={it.id} className="card overflow-hidden p-0">
              <div className="relative h-44 bg-slate-100 dark:bg-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.images?.[0] || "/icons/car-card.svg"}
                  alt={it.title}
                  className="h-full w-full object-cover"
                />
                <span
                  className={`absolute top-3 right-3 ${
                    it.status === "approved"
                      ? "badge-status-approved"
                      : it.status === "rejected"
                      ? "badge-status-rejected"
                      : "badge-status-pending"
                  }`}
                >
                  {it.status === "approved" ? "معتمد" : it.status === "rejected" ? "مرفوض" : "قيد المراجعة"}
                </span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-1 text-base font-black dark:text-white">
                  {it.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {it.city} • {it.category} • {timeAgo(it.createdAt)}
                </p>
                <div className="mt-2 text-lg font-black text-brand-700 dark:text-brand-300">
                  {formatPrice(it.price)}
                </div>
                {it.status === "rejected" && it.rejectionReason && (
                  <div className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
                    سبب الرفض: {it.rejectionReason}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Eye size={12} /> {it.views || 0}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Link href={`/listings/${it.id}`} className="btn-secondary !py-2 !px-2 !text-xs">
                    <Eye size={14} /> عرض
                  </Link>
                  <Link
                    href={`/my-listings/${it.id}/edit`}
                    className="btn-primary !py-2 !px-2 !text-xs"
                  >
                    <Edit2 size={14} /> تعديل
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(it.id)}
                    className="btn-danger !py-2 !px-2 !text-xs"
                  >
                    <Trash2 size={14} /> حذف
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
