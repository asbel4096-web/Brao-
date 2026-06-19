"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  FRIDAY_CATEGORIES,
  FRIDAY_MAX_IMAGES,
  FRIDAY_TITLE_MAX,
} from "@/lib/friday-market/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  onPosted: () => void;
  weekKey: string | null;
  isLive: boolean;
}

interface PickedImage {
  file: File;
  preview: string;
}

export function PostSheet({ open, onClose, onPosted, weekKey, isLive }: Props) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [images, setImages] = useState<PickedImage[]>([]);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>("cars");
  const [submitting, setSubmitting] = useState(false);

  // تعبئة الهاتف من الملف الشخصي
  useEffect(() => {
    if (open) {
      setPhone((p) => p || profile?.phone || "");
    }
  }, [open, profile?.phone]);

  // تنظيف الـpreviews
  useEffect(() => {
    return () => {
      images.forEach((im) => URL.revokeObjectURL(im.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    images.forEach((im) => URL.revokeObjectURL(im.preview));
    setImages([]);
    setTitle("");
    setPrice("");
    setCategory("cars");
  };

  const pickImages = (files: FileList | null) => {
    if (!files) return;
    const room = FRIDAY_MAX_IMAGES - images.length;
    const picked = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }));
    setImages((prev) => [...prev, ...picked]);
  };

  const removeImage = (i: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const submit = async () => {
    if (!user) {
      toast.warning("سجّل الدخول أولاً للنشر");
      return;
    }
    if (!isLive) {
      toast.warning("السوق مغلق الآن — يفتح يوم الجمعة فقط");
      return;
    }
    if (images.length < 1) return toast.warning("أضف صورة واحدة على الأقل");
    if (title.trim().length < 2) return toast.warning("اكتب اسم المنتج");
    if (!price || Number(price) < 0) return toast.warning("أدخل السعر");
    if (phone.trim().length < 6) return toast.warning("أدخل رقم الهاتف");

    setSubmitting(true);
    try {
      // 1) رفع الصور إلى مسار listing-images (مسموح في قواعد Storage)
      const urls: string[] = [];
      for (let i = 0; i < images.length; i++) {
        const f = images[i].file;
        const safe = (f.name || "img").replace(/\s+/g, "-").toLowerCase();
        const r = ref(
          storage,
          `listing-images/${user.uid}/friday/${weekKey || "session"}/${Date.now()}-${i + 1}-${safe}`
        );
        await uploadBytes(r, f, { contentType: f.type });
        urls.push(await getDownloadURL(r));
      }

      // 2) إرسال للـAPI (يفرض الجمعة + يضبط weekKey)
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/friday-market/post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          price: Number(price),
          phone: phone.trim(),
          whatsapp: profile?.whatsapp || "",
          city: profile?.city || "",
          category,
          images: urls,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data?.error || "تعذّر النشر");
      }

      toast.success("تم نشر إعلانك في سوق الجمعة 🔥");
      reset();
      onPosted();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر النشر، حاول مجدداً");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-white p-5 dark:bg-slate-900"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            dir="rtl"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                🛒 نشر سريع في سوق الجمعة
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            {/* الصور */}
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
              صور المنتج ({images.length}/{FRIDAY_MAX_IMAGES})
            </label>
            <div className="mb-4 flex flex-wrap gap-2.5">
              {images.map((im, i) => (
                <div key={i} className="relative h-20 w-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={im.preview}
                    alt=""
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -left-1.5 -top-1.5 rounded-full bg-rose-500 p-0.5 text-white shadow"
                    aria-label="حذف الصورة"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              {images.length < FRIDAY_MAX_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 dark:border-slate-700"
                >
                  <ImagePlus size={22} />
                  <span className="text-[10px] font-bold">إضافة</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => pickImages(e.target.files)}
              />
            </div>

            {/* الاسم */}
            <Field label="اسم المنتج">
              <input
                value={title}
                maxLength={FRIDAY_TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="مثال: تويوتا كامري 2015"
                className={inputCls}
              />
            </Field>

            {/* السعر */}
            <Field label="السعر (د.ل)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                placeholder="0"
                className={cn(inputCls, "tabular-nums")}
              />
            </Field>

            {/* الهاتف */}
            <Field label="رقم الهاتف">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="09xxxxxxxx"
                className={cn(inputCls, "tabular-nums")}
              />
            </Field>

            {/* القسم */}
            <Field label="القسم">
              <div className="flex flex-wrap gap-2">
                {FRIDAY_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "rounded-full px-3 py-2 text-[13px] font-bold transition active:scale-95",
                      category === c.key
                        ? "bg-action-500 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </Field>

            <button
              onClick={submit}
              disabled={submitting || !isLive}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-orange-500 to-red-600 py-3.5 text-[15px] font-black text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> جاري النشر...
                </>
              ) : (
                <>🔥 انشر الآن</>
              )}
            </button>

            {!isLive && (
              <p className="mt-2 text-center text-xs font-semibold text-rose-500">
                السوق مغلق الآن — يفتح يوم الجمعة فقط
              </p>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-800 outline-none focus:border-action-400 focus:ring-2 focus:ring-action-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
