"use client";

import { useState } from "react";
import {
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { CAR_BRANDS, type CarBrand } from "@/lib/car-brands";
import { BrandLogo } from "@/components/brand-logo";
import { useBrandLogos } from "@/hooks/useBrandLogos";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export default function AdminBrandsPage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const logos = useBrandLogos();

  const [busyId, setBusyId] = useState<string | null>(null);

  // الصفحة لا تُحمى تلقائياً عبر layout - نتحقق هنا.
  if (!isAdmin) {
    return (
      <div className="card p-8 text-center text-sm text-slate-500">
        هذه الصفحة مخصّصة للأدمن.
      </div>
    );
  }

  const handleUpload = async (brand: CarBrand, file: File) => {
    if (!ALLOWED.includes(file.type)) {
      toast.error("الرجاء اختيار صورة PNG أو JPG أو WebP أو SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("حجم الصورة يتجاوز 2 ميجابايت.");
      return;
    }

    try {
      setBusyId(brand.id);

      // اسم الملف يحتوي طابع زمني كي يتفادى الكاش المحلي للمتصفّح
      // عند تحديث الشعار بصورة جديدة بنفس الامتداد.
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `brand-logos/${brand.id}-${Date.now()}.${ext}`;
      const ref = storageRef(storage, path);

      await uploadBytes(ref, file, { contentType: file.type });
      const url = await getDownloadURL(ref);

      // اكتب في Firestore - هذا هو ما يُلزَم بأن يكون أدمن.
      await setDoc(doc(db, "brandLogos", brand.id), {
        brandId: brand.id,
        logoUrl: url,
        updatedAt: serverTimestamp(),
      });

      toast.success(`تم رفع شعار ${brand.nameAr}.`);
    } catch (err: any) {
      const msg =
        err?.code === "storage/unauthorized"
          ? "صلاحية الرفع مرفوضة. تأكد من قواعد Storage."
          : err?.code === "permission-denied"
          ? "Permission Denied. تأكد من نشر قواعد Firestore."
          : err?.message || "تعذّر رفع الشعار.";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (brand: CarBrand) => {
    const ok = await confirm({
      title: `إزالة شعار ${brand.nameAr}؟`,
      message: "سيختفي الشعار من القائمة الرئيسية ويعود الـfallback التلقائي.",
      confirmLabel: "إزالة",
      cancelLabel: "إلغاء",
      tone: "danger",
    });
    if (!ok) return;

    try {
      setBusyId(brand.id);
      // نحذف وثيقة Firestore فقط. الملف يبقى في Storage يتيماً —
      // ليس ضاراً ويمكن تنظيفه يدوياً لاحقاً من Firebase Console.
      await deleteDoc(doc(db, "brandLogos", brand.id));
      toast.success(`تمت إزالة شعار ${brand.nameAr}.`);
    } catch (err: any) {
      toast.error(err?.message || "تعذّر الحذف.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="section-title">شعارات الماركات</h1>
        <p className="section-subtitle">
          ارفع شعار كل ماركة (PNG شفافة يفضّل). الشعار يظهر فوراً في قسم
          "تصفح حسب الماركة" بدون نشر Vercel.
        </p>
      </div>

      <div className="card border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 dark:border-amber-700/40 dark:bg-amber-900/20 dark:text-amber-200">
        <strong>نصائح:</strong>
        <ul className="mt-1.5 list-disc space-y-1 pr-4">
          <li>الحجم الأمثل: 200×200 أو 400×400 بكسل، خلفية شفافة.</li>
          <li>الصيغ المدعومة: PNG، JPG، WebP، SVG. الحد الأقصى: 2MB.</li>
          <li>عند رفع شعار جديد، يحلّ محل القديم تلقائياً.</li>
        </ul>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CAR_BRANDS.map((brand) => {
          const currentLogo = logos[brand.id];
          const isBusy = busyId === brand.id;

          return (
            <div
              key={brand.id}
              className="card flex items-center gap-4 p-4"
            >
              <BrandLogo brand={brand} size={64} overrideUrl={currentLogo} />

              <div className="min-w-0 flex-1">
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {brand.nameAr}
                </div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                  {brand.nameEn}
                </div>
                <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold">
                  {currentLogo ? (
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ● شعار مرفوع
                    </span>
                  ) : (
                    <span className="text-slate-400">○ بدون شعار</span>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-1.5">
                <label
                  className={`
                    inline-flex h-9 cursor-pointer items-center justify-center
                    gap-1 rounded-xl border border-brand-200 bg-brand-50 px-3
                    text-[11px] font-black text-brand-700 transition
                    hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-900/30
                    dark:text-brand-300 dark:hover:bg-brand-900/50
                    ${isBusy ? "pointer-events-none opacity-60" : ""}
                  `}
                >
                  {isBusy ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : currentLogo ? (
                    <Upload size={13} />
                  ) : (
                    <ImagePlus size={13} />
                  )}
                  {currentLogo ? "تغيير" : "رفع"}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    className="sr-only"
                    disabled={isBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void handleUpload(brand, f);
                    }}
                  />
                </label>

                {currentLogo && (
                  <button
                    type="button"
                    onClick={() => void handleRemove(brand)}
                    disabled={isBusy}
                    className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 text-[11px] font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                  >
                    <Trash2 size={13} />
                    إزالة
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
