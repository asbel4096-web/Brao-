"use client";

import { useEffect, useRef, useState } from "react";
import { AdminPageSkeleton } from "@/components/admin/ui/admin-loading";
import Link from "next/link";
import Image from "next/image";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { ArrowRight, ImagePlus, Trash2, Loader2, LayoutGrid } from "lucide-react";
import { auth, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { categories } from "@/lib/categories";

export default function AdminCategoryImagesPage() {
  const { profile, loading: authLoading } = useAuth();
  const toast = useToast();
  const [images, setImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch("/api/admin/category-images", {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!cancelled && json?.images) setImages(json.images);
      } catch {
        /* تجاهل */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function saveUrl(slug: string, url: string | null) {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch("/api/admin/category-images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: JSON.stringify({ slug, url }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json?.ok === false) throw new Error(json?.error || "فشل الحفظ");
  }

  async function handleFile(slug: string, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار صورة.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      toast.error("الحد الأقصى 3 ميجابايت.");
      return;
    }
    setBusy(slug);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `homepage/banners/cat-${slug}-${Date.now()}.${ext}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file, { contentType: file.type });
      const url = await getDownloadURL(r);
      await saveUrl(slug, url);
      setImages((prev) => ({ ...prev, [slug]: url }));
      toast.success("تم حفظ صورة القسم");
    } catch (e: any) {
      toast.error(
        e?.code === "storage/unauthorized"
          ? "لا تملك صلاحية الرفع."
          : e?.message || "تعذّر الرفع"
      );
    } finally {
      setBusy(null);
    }
  }

  async function removeImage(slug: string) {
    setBusy(slug);
    try {
      await saveUrl(slug, null);
      setImages((prev) => {
        const next = { ...prev };
        delete next[slug];
        return next;
      });
      toast.success("تمت إزالة الصورة");
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحذف");
    } finally {
      setBusy(null);
    }
  }

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
            <LayoutGrid size={20} className="text-brand-600 dark:text-brand-300" />
            صور الأقسام
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            صورة مخصّصة لكل قسم في "استكشف جميع الأقسام"
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4 text-xs font-bold text-brand-800 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-200">
        يُفضّل صور مربّعة واضحة (≤ 3MB). الأقسام بلا صورة تعرض الأيقونة الافتراضية.
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {categories.map((cat) => {
            const url = images[cat.slug];
            const isBusy = busy === cat.slug;
            return (
              <div
                key={cat.slug}
                className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="relative aspect-square bg-slate-100 dark:bg-slate-800">
                  {url ? (
                    <Image src={url} alt={cat.name} fill sizes="200px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300 dark:text-slate-600">
                      <ImagePlus size={32} />
                    </div>
                  )}
                  {isBusy && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <Loader2 className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="mb-2 truncate text-center text-[12px] font-black text-slate-900 dark:text-white">
                    {cat.name}
                  </p>
                  <input
                    ref={(el) => {
                      fileRefs.current[cat.slug] = el;
                    }}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(cat.slug, f);
                      e.target.value = "";
                    }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => fileRefs.current[cat.slug]?.click()}
                      className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl bg-brand-600 py-2 text-[11px] font-black text-white transition hover:bg-brand-700 disabled:opacity-50"
                    >
                      <ImagePlus size={13} />
                      {url ? "تغيير" : "رفع صورة"}
                    </button>
                    {url && (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void removeImage(cat.slug)}
                        className="inline-flex items-center justify-center rounded-xl bg-rose-50 px-2.5 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50 dark:bg-rose-500/15 dark:text-rose-300"
                        aria-label="حذف"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
