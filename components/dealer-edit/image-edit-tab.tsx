"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  Camera,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  uploadDealerLogo,
  uploadDealerCover,
  validateImageFile,
  deleteImageByURL,
} from "@/lib/dealer/storage";

/**
 * Tab: تحرير لوجو أو غلاف المعرض.
 *
 * مكوّن مشترك لكلتا الحالتين:
 *  - kind="logo": يرفع إلى dealerLogo، نسبة 1:1، حد ~800px
 *  - kind="cover": يرفع إلى dealerCover، نسبة 16:9 تقريباً، حد ~1920px
 */

interface Props {
  kind: "logo" | "cover";
}

export function ImageEditTab({ kind }: Props) {
  const { user, profile, refreshProfile } = useAuth() as any;
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isLogo = kind === "logo";
  const fieldName = isLogo ? "dealerLogo" : "dealerCover";
  const currentUrl = (profile as any)?.[fieldName] || null;
  const fallbackUrl = isLogo
    ? (profile as any)?.photoURL
    : (profile as any)?.coverURL;
  const displayUrl = currentUrl || fallbackUrl;

  const handleSelect = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // فحص الملف
    const validation = validateImageFile(file, {
      maxMB: isLogo ? 3 : 5,
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (!validation.ok) {
      toast.error(validation.error || "ملف غير صالح");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      const result = isLogo
        ? await uploadDealerLogo(user.uid, file)
        : await uploadDealerCover(user.uid, file);

      await updateDoc(doc(db, "users", user.uid), {
        [fieldName]: result.url,
        updatedAt: serverTimestamp(),
      });

      // تحديث الـAuthContext لو لديه refresh
      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }

      toast.success(isLogo ? "تم تحديث اللوجو" : "تم تحديث الغلاف");
    } catch (err: any) {
      toast.error(err?.message || "فشل الرفع");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async () => {
    if (!user || !currentUrl) return;
    const ok = await confirm({
      title: isLogo ? "حذف اللوجو؟" : "حذف الغلاف؟",
      message: "ستعود الصورة الافتراضية مكانها. هل أنت متأكد؟",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      // حذف من Storage (best-effort)
      await deleteImageByURL(currentUrl);

      // حذف الحقل من Firestore
      await updateDoc(doc(db, "users", user.uid), {
        [fieldName]: null,
        updatedAt: serverTimestamp(),
      });

      if (typeof refreshProfile === "function") {
        await refreshProfile();
      }
      toast.success("تم الحذف");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const aspectClass = isLogo ? "aspect-square" : "aspect-[16/9]";
  const roundedClass = isLogo ? "rounded-3xl" : "rounded-2xl";

  return (
    <div className="space-y-4">
      {/* Preview */}
      <div
        className={`
          relative overflow-hidden ${roundedClass} ${aspectClass}
          ${isLogo ? "max-w-xs mx-auto" : "w-full"}
          bg-slate-100 dark:bg-slate-900
          ring-1 ring-slate-200 dark:ring-slate-800
        `}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={isLogo ? "لوجو المعرض" : "غلاف المعرض"}
            fill
            className="object-cover"
            sizes={isLogo ? "320px" : "(max-width: 768px) 100vw, 768px"}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
            <ImageIcon size={32} />
            <p className="text-[11px] font-bold">
              {isLogo ? "لا يوجد لوجو" : "لا يوجد غلاف"}
            </p>
          </div>
        )}

        {/* Camera button overlay */}
        <button
          type="button"
          onClick={handleSelect}
          disabled={uploading}
          className="
            absolute bottom-3 left-3 inline-flex items-center gap-1.5
            rounded-full bg-black/70 px-3 py-1.5 text-[11px]
            font-black text-white backdrop-blur transition
            hover:bg-black/85 active:scale-95
            disabled:opacity-50
          "
        >
          {uploading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Camera size={12} />
          )}
          {uploading ? "جارٍ الرفع..." : "تغيير"}
        </button>
      </div>

      {/* Help text */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <p className="font-black text-slate-700 dark:text-slate-200">
          💡 نصائح:
        </p>
        <ul className="mt-1 list-inside list-disc space-y-0.5">
          {isLogo ? (
            <>
              <li>صورة مربعة (1:1) - مثلاً 800×800</li>
              <li>خلفية ناعمة، الـlogo في الوسط</li>
              <li>صيغة PNG شفافة تبدو احترافية</li>
              <li>الحجم الأقصى: 3MB</li>
            </>
          ) : (
            <>
              <li>صورة بنسبة 16:9 - مثلاً 1920×1080</li>
              <li>صورة لواجهة المعرض أو السيارات</li>
              <li>تجنّبي وضع نصوص مهمة (قد تُغطّيها الـUI)</li>
              <li>الحجم الأقصى: 5MB</li>
            </>
          )}
        </ul>
      </div>

      {/* Action buttons */}
      <div className={currentUrl ? "grid grid-cols-2 gap-2" : ""}>
        <motion.button
          type="button"
          onClick={handleSelect}
          disabled={uploading}
          whileTap={{ scale: 0.97 }}
          className="
            inline-flex items-center justify-center gap-1.5
            rounded-2xl bg-blue-600 py-3 text-sm font-black text-white
            shadow-lg shadow-blue-500/30 transition
            hover:bg-blue-700 disabled:opacity-60
          "
        >
          <Upload size={14} />
          {currentUrl ? "تغيير الصورة" : "رفع صورة"}
        </motion.button>

        {currentUrl && (
          <motion.button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            whileTap={{ scale: 0.97 }}
            className="
              inline-flex items-center justify-center gap-1.5
              rounded-2xl border border-rose-300 bg-rose-50 py-3
              text-sm font-black text-rose-700 transition
              hover:bg-rose-100 disabled:opacity-60
              dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300
            "
          >
            {deleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            حذف
          </motion.button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
