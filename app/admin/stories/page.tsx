"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import {
  Clapperboard,
  Trash2,
  EyeOff,
  Eye,
  RefreshCw,
  Play,
  Image as ImageIcon,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";

interface AdminStory {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhotoURL?: string;
  type: string;
  coverUrl: string;
  viewsCount: number;
  hidden: boolean;
  mediaKind: "image" | "video";
  createdAtMs: number;
  expiresAtMs: number;
}

function fmt(ms: number): string {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

export default function AdminStoriesPage() {
  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [stories, setStories] = useState<AdminStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const now = Timestamp.now();
      const snap = await getDocs(
        query(
          collection(db, "stories"),
          where("expiresAt", ">", now),
          orderBy("expiresAt", "desc"),
          limit(100)
        )
      );
      const items: AdminStory[] = snap.docs.map((d) => {
        const x = d.data() as any;
        const media = Array.isArray(x.media) ? x.media : [];
        return {
          id: d.id,
          ownerId: x.ownerId || "",
          ownerName: x.ownerName || "—",
          ownerPhotoURL: x.ownerPhotoURL,
          type: x.type || "offer",
          coverUrl: x.coverUrl || "",
          viewsCount: typeof x.viewsCount === "number" ? x.viewsCount : 0,
          hidden: x.hidden === true,
          mediaKind: media[0]?.kind === "video" ? "video" : "image",
          createdAtMs: x.createdAt?.toMillis ? x.createdAt.toMillis() : 0,
          expiresAtMs: x.expiresAt?.toMillis ? x.expiresAt.toMillis() : 0,
        };
      });
      setStories(items);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر تحميل القصص.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (profile?.isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.isAdmin]);

  if (authLoading) {
    return (
      <div className="container py-10 text-center text-slate-500">
        جارٍ التحميل...
      </div>
    );
  }

  if (!profile?.isAdmin) {
    return (
      <div className="container py-10 text-center text-slate-500">
        لا تملك صلاحية الوصول إلى هذه الصفحة.
      </div>
    );
  }

  async function handleDelete(s: AdminStory) {
    const ok = await confirm({
      title: "حذف القصة؟",
      message: `سيتم حذف قصة "${s.ownerName}" نهائياً. لا يمكن التراجع.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    setBusyId(s.id);
    try {
      await deleteDoc(doc(db, "stories", s.id));
      setStories((prev) => prev.filter((x) => x.id !== s.id));
      toast.success("تم حذف القصة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر الحذف.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleHide(s: AdminStory) {
    setBusyId(s.id);
    try {
      await updateDoc(doc(db, "stories", s.id), { hidden: !s.hidden });
      setStories((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, hidden: !x.hidden } : x))
      );
      toast.success(s.hidden ? "تم إظهار القصة." : "تم إخفاء القصة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر التحديث.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="container py-6 sm:py-8">
      {/* الرأس */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600">
            <Clapperboard size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white">
              إدارة القصص
            </h1>
            <p className="text-xs text-slate-500">
              القصص النشطة ({stories.length})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-brand-400 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          تحديث
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500">
          جارٍ تحميل القصص...
        </div>
      ) : stories.length === 0 ? (
        <div className="py-16 text-center text-slate-500">
          لا توجد قصص نشطة حالياً.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {stories.map((s) => (
            <div
              key={s.id}
              className={`overflow-hidden rounded-2xl border bg-white dark:bg-slate-900 ${
                s.hidden
                  ? "border-amber-300 opacity-70"
                  : "border-slate-200 dark:border-slate-700"
              }`}
            >
              {/* الغلاف */}
              <div className="relative aspect-[3/4] bg-slate-100 dark:bg-slate-800">
                {s.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.coverUrl}
                    alt={s.ownerName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-400">
                    <ImageIcon size={28} />
                  </div>
                )}
                <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  {s.mediaKind === "video" ? (
                    <>
                      <Play size={10} /> فيديو
                    </>
                  ) : (
                    <>
                      <ImageIcon size={10} /> صورة
                    </>
                  )}
                </span>
                <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white">
                  <Eye size={10} /> {s.viewsCount}
                </span>
                {s.hidden && (
                  <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    مخفية
                  </span>
                )}
              </div>

              {/* المعلومات */}
              <div className="p-2.5">
                <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                  {s.ownerName}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  ينتهي: {fmt(s.expiresAtMs)}
                </p>

                <div className="mt-2 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleToggleHide(s)}
                    disabled={busyId === s.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-slate-100 px-2 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-60 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {s.hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                    {s.hidden ? "إظهار" : "إخفاء"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(s)}
                    disabled={busyId === s.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-rose-50 px-2 py-2 text-[11px] font-bold text-rose-600 hover:bg-rose-100 disabled:opacity-60 dark:bg-rose-500/10"
                  >
                    <Trash2 size={13} /> حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
