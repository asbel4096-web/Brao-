"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  Plus, LayoutGrid, CheckCircle2, Clock, AlertCircle, Eye, FileText,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { MyListingCard } from "@/components/my-listing-card";
import { CampaignManager } from "@/components/campaign/campaign-manager";
import type { Listing } from "@/lib/types";

type FilterKey = "all" | "approved" | "pending" | "rejected";

export default function MyListingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

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
      () => setLoading(false)
    );
    return () => unsub();
  }, [user, authLoading, router]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "حذف الإعلان؟",
      message: "هذا الإجراء لا يمكن التراجع عنه. سيتم حذف الإعلان نهائياً.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "listings", id));
      toast.success("تم حذف الإعلان.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر حذف الإعلان.");
    }
  };

  // ============================================================
  // طلبات التمييز الـpending الخاصة بالمستخدم.
  // الـSet للأداء - lookup O(1) في الـrender. lazy initializer من الـcache.
  // ============================================================
  const [pendingFeaturedIds, setPendingFeaturedIds] = useState<Set<string>>(
    new Set()
  );
  const [requestingFeaturedId, setRequestingFeaturedId] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDocs(
          query(
            collection(db, "featuredRequests"),
            where("ownerId", "==", user.uid),
            where("status", "==", "pending"),
            limit(100)
          )
        );
        if (cancelled) return;
        const ids = new Set<string>();
        snap.docs.forEach((d) => {
          const data = d.data() as { listingId?: string };
          if (data.listingId) ids.add(data.listingId);
        });
        setPendingFeaturedIds(ids);
      } catch {
        /* تجاهل صامت - الحالة الافتراضية "لا طلب" */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleRequestFeatured = async (listingId: string) => {
    if (!user) return;
    if (pendingFeaturedIds.has(listingId)) return; // حماية مزدوجة

    const listing = items.find((i) => i.id === listingId);
    if (!listing) return;

    try {
      setRequestingFeaturedId(listingId);
      await addDoc(collection(db, "featuredRequests"), {
        listingId,
        listingTitle: listing.title || "",
        ownerId: user.uid,
        ownerName: listing.sellerName || "",
        ownerEmail: user.email || "",
        status: "pending",
        createdAt: serverTimestamp(),
      });
      // تحديث الـstate فوراً ليرى المستخدم "في انتظار الموافقة" بدون refresh.
      setPendingFeaturedIds((prev) => {
        const next = new Set(prev);
        next.add(listingId);
        return next;
      });
      toast.success("تم إرسال طلب التمييز للمراجعة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إرسال طلب التمييز.");
    } finally {
      setRequestingFeaturedId(null);
    }
  };

  const filtered = filter === "all" ? items : items.filter((it) => it.status === filter);

  const counts = {
    all: items.length,
    approved: items.filter((i) => i.status === "approved").length,
    pending: items.filter((i) => i.status === "pending").length,
    rejected: items.filter((i) => i.status === "rejected").length,
  };

  const totalViews = items.reduce((sum, it) => sum + (it.views || 0), 0);

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
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-end">
          <Link
            href="/ads-manager"
            className="inline-flex items-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm font-black text-amber-700 transition active:scale-95 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-amber-300"
          >
            📢 مدير الإعلانات
          </Link>
          <Link href="/add-listing" className="btn-action">
            <Plus size={18} /> إضافة إعلان جديد
          </Link>
        </div>
      </div>

      {!loading && items.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={LayoutGrid} label="إجمالي الإعلانات" value={counts.all} color="brand" />
          <StatCard icon={CheckCircle2} label="معتمد" value={counts.approved} color="emerald" />
          <StatCard icon={Clock} label="قيد المراجعة" value={counts.pending} color="amber" />
          <StatCard icon={Eye} label="إجمالي المشاهدات" value={totalViews} color="brand" />
        </div>
      )}

      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {([
          { key: "all", label: "الكل", icon: LayoutGrid },
          { key: "approved", label: "معتمد", icon: CheckCircle2 },
          { key: "pending", label: "قيد المراجعة", icon: Clock },
          { key: "rejected", label: "مرفوض", icon: AlertCircle },
        ] as const).map((t) => {
          const Icon = t.icon;
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`shrink-0 inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                active
                  ? "bg-brand-700 text-white shadow-blue"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-700 dark:hover:bg-slate-800"
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton aspect-[4/3]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <FileText size={48} className="mx-auto text-slate-400" />
          <p className="mt-4 text-slate-600 dark:text-slate-300">
            {filter === "all"
              ? "لم تنشر أي إعلان بعد."
              : "لا توجد إعلانات في هذا التصنيف."}
          </p>
          {filter === "all" && (
            <Link href="/add-listing" className="btn-action mt-4 inline-flex">
              <Plus size={16} /> أنشئ إعلانك الأول
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((it) => (
            <div key={it.id} className="space-y-2">
              <MyListingCard
                listing={it}
                onDelete={handleDelete}
                featuredState={
                  pendingFeaturedIds.has(it.id) ? { kind: "pending" } : { kind: "none" }
                }
                onRequestFeatured={handleRequestFeatured}
                requestingFeatured={requestingFeaturedId === it.id}
              />
              <CampaignManager listing={it} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

interface StatCardProps {
  icon: typeof LayoutGrid;
  label: string;
  value: number;
  color: "brand" | "emerald" | "amber" | "rose";
}

const STAT_COLORS = {
  brand: {
    iconBg: "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300",
    valueText: "text-brand-700 dark:text-brand-300",
  },
  emerald: {
    iconBg: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    valueText: "text-emerald-700 dark:text-emerald-300",
  },
  amber: {
    iconBg: "bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    valueText: "text-amber-700 dark:text-amber-300",
  },
  rose: {
    iconBg: "bg-rose-50 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    valueText: "text-rose-700 dark:text-rose-300",
  },
};

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const c = STAT_COLORS[color];
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${c.iconBg}`}>
        <Icon size={20} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
          {label}
        </p>
        <p className={`text-xl font-black sm:text-2xl ${c.valueText}`}>
          {value.toLocaleString("ar-LY")}
        </p>
      </div>
    </div>
  );
}
