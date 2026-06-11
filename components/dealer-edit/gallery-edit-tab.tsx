"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { doc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { ImagePlus, Loader2, Trash2, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  uploadGalleryImage,
  validateImageFile,
  deleteImageByURL,
} from "@/lib/dealer/storage";
import { MAX_DEALER_GALLERY_IMAGES } from "@/lib/dealer/stories";

/**
 * Tab: معرض صور المعرض (gallery).
 *
 * - حتى MAX_DEALER_GALLERY_IMAGES صورة
 * - تُخزَّن كـarray في users/{uid}.dealerGallery
 * - رفع متعدد (multiple file selection)
 * - حذف فردي لكل صورة
 */

export function GalleryEditTab() {
  const { user, profile, refreshProfile } = useAuth() as any;
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [deletingIdx, setDeletingIdx] = useState<number | null>(null);

  const gallery: string[] = (profile as any)?.dealerGallery || [];
  const remaining = MAX_DEALER_GALLERY_IMAGES - gallery.length;

  const handleSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !user) return;

    // فحص العدد
    if (files.length > remaining) {
      toast.warning(
        `يمكنك رفع ${remaining} صور فقط (الحد الأقصى ${MAX_DEALER_GALLERY_IMAGES})`
      );
      e.target.value = "";
      return;
    }

    // فحص كل ملف
    for (const f of files) {
      const v = validateImageFile(f, { maxMB: 5 });
      if (!v.ok) {
        toast.error(`${f.name}: ${v.error}`);
        e.target.value = "";
        return;
      }
    }

    setUploading(true);
    setProgress({ current: 0, total: files.length });
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setProgress({ current: i + 1, total: files.length });
        const result = await uploadGalleryImage(user.uid, files[i]);
        newUrls.push(result.url);
      }

      // تحديث Firestore (إضافة الـURLs الجديدة)
      await updateDoc(doc(db, "users", user.uid), {
        dealerGallery: arrayUnion(...newUrls),
        updatedAt: serverTimestamp(),
      });

      if (typeof refreshProfile === "function") await refreshProfile();
      toast.success(`تم رفع ${newUrls.length} صورة`);
    } catch (err: any) {
      toast.error(err?.message || "فشل الرفع");
    } finally {
      setUploading(false);
      setProgress({ current: 0, total: 0 });
      e.target.value = "";
    }
  };

  const handleDelete = async (url: string, idx: number) => {
    if (!user) return;
    const ok = await confirm({
      title: "حذف هذه الصورة؟",
      message: "لن تتمكن من استرجاعها.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;

    setDeletingIdx(idx);
    try {
      // Storage (best-effort)
      await deleteImageByURL(url);

      // Firestore
      await updateDoc(doc(db, "users", user.uid), {
        dealerGallery: arrayRemove(url),
        updatedAt: serverTimestamp(),
      });

      if (typeof refreshProfile === "function") await refreshProfile();
      toast.success("تم الحذف");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    } finally {
      setDeletingIdx(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-400">
            صور المعرض
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            {gallery.length} / {MAX_DEALER_GALLERY_IMAGES} صورة
          </p>
        </div>
        {remaining > 0 && (
          <motion.button
            type="button"
            onClick={handleSelect}
            disabled={uploading}
            whileTap={{ scale: 0.97 }}
            className="
              inline-flex items-center gap-1.5 rounded-2xl
              bg-blue-600 px-4 py-2 text-[12px] font-black
              text-white shadow-md transition hover:bg-blue-700
              disabled:opacity-60
            "
          >
            {uploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                {progress.current}/{progress.total}
              </>
            ) : (
              <>
                <ImagePlus size={13} />
                إضافة صور
              </>
            )}
          </motion.button>
        )}
      </div>

      {/* Empty state */}
      {gallery.length === 0 ? (
        <button
          type="button"
          onClick={handleSelect}
          disabled={uploading}
          className="
            flex aspect-video w-full flex-col items-center justify-center
            gap-2 rounded-3xl border-2 border-dashed border-slate-300
            bg-slate-50 text-slate-400 transition
            hover:border-blue-500 hover:text-blue-500 active:scale-[0.99]
            dark:border-slate-700 dark:bg-slate-900
          "
        >
          <ImageIcon size={36} />
          <p className="text-sm font-black">اضغطي لإضافة صور المعرض</p>
          <p className="text-[10px]">داخل المعرض، الواجهة، السيارات...</p>
        </button>
      ) : (
        // Grid 3 columns
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <AnimatePresence>
            {gallery.map((url, idx) => (
              <motion.div
                key={url}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900"
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, 200px"
                />

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleDelete(url, idx)}
                  disabled={deletingIdx === idx}
                  className="
                    absolute top-2 left-2 grid h-7 w-7 place-items-center
                    rounded-full bg-black/70 text-white backdrop-blur
                    transition hover:bg-rose-600 active:scale-90
                    disabled:opacity-50
                  "
                  aria-label="حذف"
                >
                  {deletingIdx === idx ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty slot indicator */}
          {gallery.length < MAX_DEALER_GALLERY_IMAGES && (
            <button
              type="button"
              onClick={handleSelect}
              disabled={uploading}
              className="
                flex aspect-square items-center justify-center
                rounded-2xl border-2 border-dashed border-slate-300
                bg-slate-50 text-slate-400 transition
                hover:border-blue-500 hover:text-blue-500
                dark:border-slate-700 dark:bg-slate-900
              "
              aria-label="إضافة صورة"
            >
              <ImagePlus size={20} />
            </button>
          )}
        </div>
      )}

      {/* Upload progress */}
      {uploading && progress.total > 0 && (
        <div className="rounded-2xl bg-blue-50 p-3 dark:bg-blue-900/20">
          <div className="flex items-center gap-2 text-[12px] font-black text-blue-700 dark:text-blue-300">
            <Loader2 size={12} className="animate-spin" />
            جارٍ رفع {progress.current} من {progress.total}...
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-900/40">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${(progress.current / progress.total) * 100}%`,
              }}
            />
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
