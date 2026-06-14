"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  ArrowRight,
  Check,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type {
  CarStoryPayload,
  OfferStoryPayload,
  ServiceStoryPayload,
  StoryMediaItem,
  StoryPayload,
  StoryType,
  StoryUploadDraft,
} from "@/lib/stories/types";
import {
  revokeStoryDraftsMedia,
  STORY_LIFETIME_MS,
  STORY_MAX_VIDEO_DURATION_SEC,
  STORY_IMAGE_LIMIT,
  validateStoryFiles,
} from "@/lib/stories/helpers";
import { STORY_TYPE_META } from "@/lib/stories/types";
import { StoryTypePicker } from "./story-type-picker";
import { CarFields } from "./story-fields/car-fields";
import { ServiceFields } from "./story-fields/service-fields";
import { OfferFields } from "./story-fields/offer-fields";

type CreateStep = "type" | "media" | "preview";

interface Props {
  open: boolean;
  onClose: () => void;
}

function deepRemoveUndefined(value: any): any {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (Array.isArray(value)) {
    return value.map(deepRemoveUndefined).filter((v) => v !== undefined);
  }

  if (
    value &&
    typeof value === "object" &&
    typeof value.toMillis === "function"
  ) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .map(([key, val]) => [key, deepRemoveUndefined(val)])
        .filter(([, val]) => val !== undefined)
    );
  }

  return value;
}

export function StoryCreateModal({ open, onClose }: Props) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<CreateStep>("type");
  const [type, setType] = useState<StoryType | null>(null);
  const [drafts, setDrafts] = useState<StoryUploadDraft[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [payload, setPayload] = useState<Partial<StoryPayload>>({});
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (!open) return;
    return () => {
      revokeStoryDraftsMedia(drafts);
    };
  }, [open, drafts]);

  const mediaKind = drafts[0]?.kind;
  const activeDraft = drafts[activeIndex] || null;

  const resetState = () => {
    revokeStoryDraftsMedia(drafts);
    setStep("type");
    setType(null);
    setDrafts([]);
    setActiveIndex(0);
    setPayload({});
    setPublishing(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleSelectType = (nextType: StoryType) => {
    setType(nextType);
    setPayload({ type: nextType } as Partial<StoryPayload>);
    setStep("media");
  };

  const handleBack = () => {
    if (step === "preview") {
      setStep("media");
      return;
    }

    if (step === "media") {
      revokeStoryDraftsMedia(drafts);
      setDrafts([]);
      setActiveIndex(0);
      setPayload({});
      setType(null);
      setStep("type");
    }
  };

  const handleMediaChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;

    const result = await validateStoryFiles(files);
    if (result.error) {
      toast.error(result.error);
      return;
    }

    revokeStoryDraftsMedia(drafts);
    setDrafts(result.drafts || []);
    setActiveIndex(0);
  };

  const removeDraft = (draftId: string) => {
    setDrafts((current) => {
      const target = current.find((item) => item.id === draftId);
      if (target?.previewUrl) {
        try {
          URL.revokeObjectURL(target.previewUrl);
        } catch {}
      }
      const next = current.filter((item) => item.id !== draftId);
      setActiveIndex((prev) => {
        if (prev >= next.length) return Math.max(next.length - 1, 0);
        return prev;
      });
      return next;
    });
  };

  const validatePayload = (): string | null => {
    if (!type) return "اختر نوع القصة أولًا.";
    if (!drafts.length) return "أضف صورًا أو فيديو قبل المتابعة.";

    if (type === "car") {
      const p = payload as Partial<CarStoryPayload>;
      if (!p.title?.trim()) return "أضف عنوانًا قصيرًا للسيارة.";
      if (!p.city?.trim()) return "اختر المدينة.";
    }

    if (type === "service") {
      const p = payload as Partial<ServiceStoryPayload>;
      if (!p.serviceName?.trim()) return "أضف اسم الخدمة.";
      if (!p.description?.trim()) return "أضف وصفًا للخدمة.";
      if (!p.city?.trim()) return "اختر المدينة.";
      if (!p.phone?.trim()) return "أضف رقم الاتصال للخدمة.";
    }

    if (type === "offer") {
      const p = payload as Partial<OfferStoryPayload>;
      if (!p.title?.trim()) return "أضف عنوان العرض.";
      if (!p.discount?.trim()) return "أضف تفاصيل العرض أو الخصم.";
      if (!p.city?.trim()) return "اختر المدينة.";
    }

    return null;
  };

  const goToPreview = () => {
    const error = validatePayload();
    if (error) {
      toast.error(error);
      return;
    }
    setStep("preview");
  };

  const handlePublish = async () => {
    if (!user || !user.uid) {
      toast.error("سجّل الدخول أولًا حتى تتمكن من نشر القصة.");
      router.push("/login?redirect=/");
      return;
    }

    const liveUser = auth.currentUser;
    if (!liveUser || liveUser.uid !== user.uid) {
      toast.error("انتهت جلستك. يُرجى تسجيل الدخول من جديد.");
      router.push("/login?redirect=/");
      return;
    }

    const error = validatePayload();
    if (error || !type || !drafts.length) {
      toast.error(error || "البيانات غير مكتملة.");
      return;
    }

    setPublishing(true);

    const uploadedPaths: string[] = [];

    try {
      const uploadedMedia: StoryMediaItem[] = [];

      for (const [index, draft] of drafts.entries()) {
        const safeName = draft.file.name.replace(/\s+/g, "-").toLowerCase();
        const storagePath = `stories/${user.uid}/${Date.now()}-${index + 1}-${safeName}`;
        const storageRef = ref(storage, storagePath);

        await uploadBytes(storageRef, draft.file, {
          contentType: draft.file.type,
          cacheControl: "public, max-age=31536000",
        });
        uploadedPaths.push(storagePath);

        const url = await getDownloadURL(storageRef);

        uploadedMedia.push(
          deepRemoveUndefined({
            id: draft.id,
            kind: draft.kind,
            url,
            storagePath,
            mimeType: draft.mimeType,
            sizeBytes: draft.sizeBytes,
            durationSec: draft.durationSec,
            width: draft.width,
            height: draft.height,
            thumbnailUrl: draft.kind === "video" ? url : undefined,
          })
        );
      }

      const coverUrl = uploadedMedia[0]?.thumbnailUrl || uploadedMedia[0]?.url || "";
      const expiresAt = Timestamp.fromMillis(Date.now() + STORY_LIFETIME_MS);

      const storyDoc = {
        ownerId: user.uid,
        ownerName:
          profile?.businessName ||
          profile?.name ||
          user.displayName ||
          user.email ||
          user.phoneNumber ||
          "مستخدم",
        ownerPhotoURL: profile?.photoURL || user.photoURL || "",
        ownerRole: type === "service" ? "service_provider" : "trader",
        type,
        coverUrl,
        media: uploadedMedia.map((item) => deepRemoveUndefined(item)),
        payload: deepRemoveUndefined(payload as StoryPayload),
        viewsCount: 0,
        createdAt: serverTimestamp(),
        expiresAt,
      };

      await addDoc(collection(db, "stories"), storyDoc);

      toast.success("تم نشر القصة بنجاح وتبقى لمدة 24 ساعة.");
      handleClose();
    } catch (error: any) {
      for (const path of uploadedPaths) {
        try {
          await deleteObject(ref(storage, path));
        } catch {}
      }

      const code: string = error?.code || "";
      let message = error?.message || "تعذّر نشر القصة الآن.";

      if (code === "storage/unauthorized" || code === "permission-denied") {
        message =
          "صلاحية الرفع مرفوضة. تأكّد من تسجيل الدخول وأن قواعد Firebase Storage محدّثة لمسار stories/{userId}.";
      } else if (code === "storage/unauthenticated") {
        message = "انتهت جلستك. يُرجى تسجيل الدخول من جديد.";
      } else if (code === "storage/canceled") {
        message = "تم إلغاء عملية الرفع.";
      } else if (code === "storage/quota-exceeded") {
        message = "تجاوزت سعة التخزين المتاحة. تواصل مع الدعم.";
      }

      toast.error(message);
    } finally {
      setPublishing(false);
    }
  };

  const previewTitle = useMemo(() => {
    if (!type) return "";
    return STORY_TYPE_META[type].label;
  }, [type]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[130] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        className="max-h-[94vh] w-full max-w-2xl overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        {step === "type" ? <StoryTypePicker onSelect={handleSelectType} onClose={handleClose} /> : null}

        {step !== "type" && type ? (
          <div
            className="flex max-h-[94vh] flex-col overflow-y-auto"
            style={{
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="رجوع"
                >
                  <ArrowRight size={18} />
                </button>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    {step === "media" ? `إنشاء قصة ${previewTitle}` : `معاينة قصة ${previewTitle}`}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {step === "media"
                      ? "اختر الوسائط ثم راجع القصة قبل النشر"
                      : "هذه هي المعاينة النهائية قبل النشر"}
                  </p>
                </div>
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

            {step === "media" ? (
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white">
                          الوسائط
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          الصور حتى {STORY_IMAGE_LIMIT} — أو فيديو واحد قصير حتى {STORY_MAX_VIDEO_DURATION_SEC} ثانية
                        </p>
                      </div>

                      <label className="btn-secondary cursor-pointer !px-4 !py-2.5 text-xs">
                        <Upload size={15} />
                        رفع ملفات
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime"
                          multiple
                          className="hidden"
                          onChange={(event) => void handleMediaChange(event)}
                        />
                      </label>
                    </div>

                    {drafts.length ? (
                      <div className="mt-4 space-y-3">
                        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-black dark:border-slate-800">
                          <div className="relative aspect-[9/16] w-full bg-black">
                            {activeDraft?.kind === "video" ? (
                              <video
                                src={activeDraft.previewUrl}
                                className="h-full w-full object-cover"
                                controls
                                playsInline
                                muted
                              />
                            ) : activeDraft ? (
                              <img
                                src={activeDraft.previewUrl}
                                alt="معاينة القصة"
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                        </div>

                        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                          {drafts.map((draft, index) => (
                            <button
                              key={draft.id}
                              type="button"
                              onClick={() => setActiveIndex(index)}
                              className={[
                                "relative overflow-hidden rounded-2xl border transition",
                                activeIndex === index
                                  ? "border-brand-500 ring-2 ring-brand-200 dark:ring-brand-900/40"
                                  : "border-slate-200 dark:border-slate-700",
                              ].join(" ")}
                            >
                              <div className="relative h-16 w-14 bg-slate-200 dark:bg-slate-800">
                                {draft.kind === "video" ? (
                                  <video
                                    src={draft.previewUrl}
                                    className="h-full w-full object-cover"
                                    muted
                                    playsInline
                                  />
                                ) : (
                                  <img
                                    src={draft.previewUrl}
                                    alt={`وسيط ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="absolute inset-x-0 bottom-0 bg-black/55 px-1 py-0.5 text-[10px] font-bold text-white">
                                {draft.kind === "video" ? "فيديو" : `صورة ${index + 1}`}
                              </span>
                            </button>
                          ))}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {drafts.map((draft) => (
                            <button
                              key={draft.id}
                              type="button"
                              onClick={() => removeDraft(draft.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:border-rose-300 dark:border-slate-700"
                            >
                              <Trash2 size={12} />
                              حذف {draft.kind === "video" ? "الفيديو" : "صورة"}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center dark:border-slate-700 dark:bg-slate-900">
                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
                          <Upload size={24} />
                        </div>
                        <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">
                          ارفع صورًا أو فيديو واحدًا
                        </p>
                        <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                          صور متعددة كشرائح، أو فيديو واحد قصير يظهر داخل عارض القصص
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    {type === "car" ? (
                      <CarFields
                        payload={payload as Partial<CarStoryPayload>}
                        onChange={(next) => setPayload((current) => ({ ...current, ...next, type }))}
                      />
                    ) : null}

                    {type === "service" ? (
                      <ServiceFields
                        payload={payload as Partial<ServiceStoryPayload>}
                        onChange={(next) => setPayload((current) => ({ ...current, ...next, type }))}
                      />
                    ) : null}

                    {type === "offer" ? (
                      <OfferFields
                        payload={payload as Partial<OfferStoryPayload>}
                        onChange={(next) => setPayload((current) => ({ ...current, ...next, type }))}
                      />
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={goToPreview}
                      className="btn-primary flex-1"
                      disabled={!drafts.length}
                    >
                      <Check size={16} />
                      معاينة القصة
                    </button>
                    <button type="button" onClick={handleClose} className="btn-secondary flex-1">
                      إلغاء
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {step === "preview" ? (
              <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-black shadow-card dark:border-slate-800">
                    <div className="relative aspect-[9/16] w-full bg-black">
                      {activeDraft?.kind === "video" ? (
                        <video
                          src={activeDraft.previewUrl}
                          className="h-full w-full object-cover"
                          controls
                          playsInline
                          muted
                        />
                      ) : activeDraft ? (
                        <img
                          src={activeDraft.previewUrl}
                          alt="معاينة القصة"
                          className="h-full w-full object-cover"
                        />
                      ) : null}

                      <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 text-white">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold text-white/75">{previewTitle}</div>
                            <div className="text-sm font-black">
                              {profile?.businessName || profile?.name || user?.displayName || "براتشو كار"}
                            </div>
                          </div>
                          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold backdrop-blur">
                            {mediaKind === "video" ? "فيديو" : `${drafts.length} صور`}
                          </span>
                        </div>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 text-white">
                        <PreviewPayloadContent type={type} payload={payload} />
                      </div>
                    </div>
                  </div>

                  {drafts.length > 1 ? (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {drafts.map((draft, index) => (
                        <button
                          key={draft.id}
                          type="button"
                          onClick={() => setActiveIndex(index)}
                          className={[
                            "overflow-hidden rounded-2xl border transition",
                            activeIndex === index
                              ? "border-brand-500 ring-2 ring-brand-200 dark:ring-brand-900/40"
                              : "border-slate-200 dark:border-slate-700",
                          ].join(" ")}
                        >
                          <div className="relative h-16 w-14 bg-slate-200 dark:bg-slate-800">
                            <img src={draft.previewUrl} alt={`معاينة ${index + 1}`} className="h-full w-full object-cover" />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">ملخص القصة</h4>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>نوع القصة</span>
                        <span className="font-black text-slate-900 dark:text-white">{previewTitle}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>نوع الوسائط</span>
                        <span className="font-black text-slate-900 dark:text-white">
                          {mediaKind === "video" ? "فيديو" : "صور"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>عدد العناصر</span>
                        <span className="font-black text-slate-900 dark:text-white">{drafts.length}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>ظهور المشاهدات</span>
                        <span className="font-black text-slate-900 dark:text-white">لصاحب القصة فقط</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>مدة الظهور</span>
                        <span className="font-black text-slate-900 dark:text-white">24 ساعة</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => void handlePublish()}
                      className="btn-action flex-1"
                      disabled={publishing}
                    >
                      {publishing ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                      {publishing ? "جارٍ النشر..." : "نشر القصة"}
                    </button>
                    <button type="button" onClick={handleBack} className="btn-secondary flex-1" disabled={publishing}>
                      تعديل
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PreviewPayloadContent({
  type,
  payload,
}: {
  type: StoryType;
  payload: Partial<StoryPayload>;
}) {
  if (type === "car") {
    const data = payload as Partial<CarStoryPayload>;
    return (
      <div>
        <div className="text-lg font-black leading-tight">{data.title || "عنوان السيارة"}</div>
        <div className="mt-1 text-xs text-white/80">
          {[data.city, typeof data.price === "number" ? `${data.price.toLocaleString("ar-LY")} د.ل` : null]
            .filter(Boolean)
            .join(" • ")}
        </div>
      </div>
    );
  }

  if (type === "service") {
    const data = payload as Partial<ServiceStoryPayload>;
    return (
      <div>
        <div className="text-lg font-black leading-tight">{data.serviceName || "اسم الخدمة"}</div>
        <div className="mt-1 line-clamp-2 text-xs text-white/80">{data.description || "وصف قصير للخدمة"}</div>
      </div>
    );
  }

  const data = payload as Partial<OfferStoryPayload>;
  return (
    <div>
      <div className="text-lg font-black leading-tight">{data.title || "عنوان العرض"}</div>
      <div className="mt-1 text-xs text-white/80">{data.discount || "تفاصيل الخصم أو العرض"}</div>
    </div>
  );
}
