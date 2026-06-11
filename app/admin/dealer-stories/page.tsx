"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Sparkles,
  Trash2,
  Loader2,
  Eye,
  Clock,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";

/**
 * Admin - إدارة قصص المعارض (moderation).
 *
 * يقرأ آخر 200 قصة (realtime) ويسمح بحذف أي قصة مخالفة.
 * الحذف يتم مباشرة عبر Firestore (الـrules تسمح للأدمن بحذف أي قصة).
 *
 * تصنيفات القصص: وصل حديثاً / عروض / داخل المعرض / تجربة قيادة.
 */

const CATEGORY_LABELS: Record<string, string> = {
  new_arrivals: "وصل حديثاً",
  offers: "عروض اليوم",
  showroom: "داخل المعرض",
  test_drive: "تجربة قيادة",
};

interface StoryRow {
  id: string;
  dealerUid: string;
  dealerName?: string;
  category: string;
  mediaURL: string;
  caption?: string;
  viewCount?: number;
  createdAt?: any;
  expiresAt?: any;
}

export default function AdminDealerStoriesPage() {
  const { can } = useAdminRole();
  const toast = useToast();
  const confirm = useConfirm();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("all");

  useEffect(() => {
    const q = query(
      collection(db, "dealerStories"),
      orderBy("createdAt", "desc"),
      limit(200)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStories(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  if (!can("content.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة قصص المعارض.
      </div>
    );
  }

  const handleDelete = async (story: StoryRow) => {
    const ok = await confirm({
      title: "حذف هذه القصة؟",
      message: `ستُحذف قصة "${story.dealerName || "معرض"}" فوراً ونهائياً.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;

    setDeletingId(story.id);
    try {
      await deleteDoc(doc(db, "dealerStories", story.id));
      toast.success("تم حذف القصة");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    } finally {
      setDeletingId(null);
    }
  };

  // فلترة بالتصنيف
  const filtered =
    filterCat === "all"
      ? stories
      : stories.filter((s) => s.category === filterCat);

  // إحصاء نشط
  const activeCount = stories.filter((s) => {
    const ms = s.expiresAt?.toMillis?.() || 0;
    return ms > Date.now();
  }).length;

  return (
    <div className="space-y-4" dir="rtl">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
          <Sparkles size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            قصص المعارض
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            مراقبة وحذف قصص المعارض المخالفة · {activeCount} نشطة من {stories.length}
          </p>
        </div>
      </header>

      {/* Category filter */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {["all", "new_arrivals", "offers", "showroom", "test_drive"].map(
          (cat) => {
            const isActive = filterCat === cat;
            const label = cat === "all" ? "الكل" : CATEGORY_LABELS[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterCat(cat)}
                className={`shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-black transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {label}
              </button>
            );
          }
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-sm font-bold text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          لا توجد قصص في هذا التصنيف
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {filtered.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              deleting={deletingId === story.id}
              onDelete={() => handleDelete(story)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StoryCard({
  story,
  deleting,
  onDelete,
}: {
  story: StoryRow;
  deleting: boolean;
  onDelete: () => void;
}) {
  const expMs = story.expiresAt?.toMillis?.() || 0;
  const isExpired = expMs <= Date.now();
  const daysLeft = Math.max(
    0,
    Math.ceil((expMs - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
      {story.mediaURL && (
        <Image
          src={story.mediaURL}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 640px) 33vw, 20vw"
        />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

      {/* Top: category + expired badge */}
      <div className="absolute inset-x-2 top-2 flex items-start justify-between">
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black text-slate-800">
          {CATEGORY_LABELS[story.category] || story.category}
        </span>
        {isExpired ? (
          <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] font-black text-white">
            منتهية
          </span>
        ) : (
          <span className="flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[8px] font-black text-white">
            <Clock size={8} />
            {daysLeft}ي
          </span>
        )}
      </div>

      {/* Bottom: dealer name + views */}
      <div className="absolute inset-x-2 bottom-2">
        <p className="truncate text-[10px] font-black text-white">
          {story.dealerName || "معرض"}
        </p>
        {typeof story.viewCount === "number" && (
          <p className="flex items-center gap-0.5 text-[8px] text-white/80">
            <Eye size={8} />
            {story.viewCount}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-rose-600 text-white opacity-0 shadow-lg transition group-hover:opacity-100 disabled:opacity-60"
        aria-label="حذف"
      >
        {deleting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Trash2 size={14} />
        )}
      </button>
    </div>
  );
}
