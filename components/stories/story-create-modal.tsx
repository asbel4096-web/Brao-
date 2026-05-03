"use client";

import { ChangeEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ArrowRight, Loader2, Upload, X } from "lucide-react";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type {
  CarStoryPayload,
  OfferStoryPayload,
  ServiceStoryPayload,
  StoryPayload,
  StoryType,
} from "@/lib/stories/types";
import { STORY_LIFETIME_MS } from "@/lib/stories/helpers";
import { STORY_TYPE_META } from "@/lib/stories/types";
import { StoryTypePicker } from "./story-type-picker";
import { CarFields } from "./story-fields/car-fields";
import { ServiceFields } from "./story-fields/service-fields";
import { OfferFields } from "./story-fields/offer-fields";

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

export function StoryCreateModal({ open, onClose }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [type, setType] = useState<StoryType | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [payload, setPayload] = useState<Partial<StoryPayload>>({});
  const [publishing, setPublishing] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    setType(null);
    setImageFile(null);
    setImagePreview("");
    setPayload({});
    setPublishing(false);
    onClose();
  };

  const handleSelectType = (t: StoryType) => {
    setType(t);
    setPayload({ type: t } as Partial<StoryPayload>);
  };

  const handleBack = () => {
    setType(null);
    setImageFile(null);
    setImagePreview("");
    setPayload({});
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      toast.error("حجم الصورة يجب أن يكون أقل من 5 ميجابايت.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("الملف يجب أن يكون صورة.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validatePayload = (): string | null => {
    if (!type) return "اختر نوع القصة.";
    if (!imageFile) return "أضف صورة للقصة.";

    if (type === "car") {
      const p = payload as Partial<CarStoryPayload>;
      if (!p.title?.trim()) return "أضف عنواناً للسيارة.";
      if (!p.city) return "اختر المدينة.";
    }
    if (type === "service") {
      const p = payload as Partial<ServiceStoryPayload>;
      if (!p.serviceName?.trim()) return "أضف اسم الخدمة.";
      if (!p.description?.trim()) return "أضف وصفاً قصيراً.";
      if (!p.city) return "اختر المدينة.";
      if (!p.phone?.trim()) return "أضف رقم اتصال.";
    }
    if (type === "offer") {
      const p = payload as Partial<OfferStoryPayload>;
      if (!p.title?.trim()) return "أضف عنوان العرض.";
      if (!p.discount?.trim()) return "أضف تفاصيل الخصم أو السعر.";
      if (!p.city) return "اختر المدينة.";
    }
    return null;
  };

  const handlePublish = async () => {
    if (!user) {
      toast.error("يجب تسجيل الدخول لنشر قصة.");
      router.push("/login?redirect=/");
      return;
    }
    const err = validatePayload();
    if (err) {
      toast.error(err);
      return;
    }
    if (!imageFile || !type) return;

    setPublishing(true);
    try {
      // 1) رفع الصورة إلى Storage
      const safeName = imageFile.name.replace(/\s+/g, "-");
      const storageRef = ref(
        storage,
        `stories/${user.uid}/${Date.now()}-${safeName}`
      );
      await uploadBytes(storageRef, imageFile, { contentType: imageFile.type });
      const imageUrl = await getDownloadURL(storageRef);

      // 2) إنشاء مستند القصة
      const expiresAt = Timestamp.fromMillis(Date.now() + STORY_LIFETIME_MS);

      await addDoc(collection(db, "stories"), {
        ownerId: user.uid,
        ownerName:
          profile?.name ||
          user.displayName ||
          user.email ||
          user.phoneNumber ||
          "مستخدم",
        ownerPhotoURL: profile?.photoURL || user.photoURL || "",
        type,
        imageUrl,
        payload: payload as StoryPayload,
        createdAt: serverTimestamp(),
        expiresAt,
        viewsCount: 0,
      });

      toast.success("تم نشر القصة! تظهر لمدة 24 ساعة.");
      handleClose();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر نشر القصة. حاول مجدداً.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        className="
          w-full max-w-lg overflow-hidden
          rounded-t-3xl border border-slate-200 bg-white shadow-2xl
          animate-slide-up max-h-[92vh] overflow-y-auto
          dark:border-slate-700 dark:bg-slate-900
          sm:rounded-3xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* الخطوة 1: اختيار النوع */}
        {!type && <StoryTypePicker onSelect={handleSelectType} onClose={handleClose} />}

        {/* الخطوة 2: الصورة + الحقول */}
        {type && (
          <div className="flex flex-col">
            {/* الرأس */}
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="رجوع"
              >
                <ArrowRight size={18} />
              </button>
              <div className="text-center">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  قصة {STORY_TYPE_META[type].label}
                </h3>
                <p className="text-[11px] text-slate-500">
                  تظهر لمدة 24 ساعة
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                aria-label="إغلاق"
              >
                <X size={18} />
              </button>
            </div>

            {/* الصورة */}
            <div className="p-4">
              <label
                htmlFor="story-image-input"
                className={`
                  block cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed
                  ${
                    imagePreview
                      ? "border-brand-300"
                      : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/30 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-brand-700"
                  }
                `}
              >
                {imagePreview ? (
                  <div className="relative aspect-[3/4] w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="معاينة"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-center text-xs font-bold text-white">
                      اضغط لتغيير الصورة
                    </span>
                  </div>
                ) : (
                  <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                      <Upload size={24} />
                    </div>
                    <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                      اضغط لاختيار صورة
                    </p>
                    <p className="text-xs text-slate-500">
                      JPG / PNG / WebP — حد أقصى 5 ميجابايت
                    </p>
                  </div>
                )}
                <input
                  id="story-image-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            {/* الحقول حسب النوع */}
            <div className="px-4 pb-4">
              {type === "car" && (
                <CarFields
                  payload={payload as Partial<CarStoryPayload>}
                  onChange={(next) => setPayload((p) => ({ ...p, ...next, type }))}
                />
              )}
              {type === "service" && (
                <ServiceFields
                  payload={payload as Partial<ServiceStoryPayload>}
                  onChange={(next) => setPayload((p) => ({ ...p, ...next, type }))}
                />
              )}
              {type === "offer" && (
                <OfferFields
                  payload={payload as Partial<OfferStoryPayload>}
                  onChange={(next) => setPayload((p) => ({ ...p, ...next, type }))}
                />
              )}
            </div>

            {/* زر النشر */}
            <div className="sticky bottom-0 border-t border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || !imageFile}
                className="btn-primary w-full"
              >
                {publishing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جارٍ النشر...
                  </>
                ) : (
                  "نشر القصة"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
