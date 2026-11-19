"use client";

/**
 * إنشاء منشور في «منشورات المجتمع» — نفس مُنشئ التطبيق (FridayCreatePostScreen):
 * 10 أنواع، حقول حسب النوع، حتى 10 صور، والمنشور يُرسل للمراجعة (status 'pending') دائماً.
 * النشر ممكن بنصّ أو صورة واحدة على الأقل؛ نوع «صورة» يحتاج صورة.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ImagePlus, Loader2, MapPin, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { libyaCities } from "@/lib/categories";
import { Avatar } from "@/components/community/post-card";
import {
  createPost,
  deleteUploaded,
  MAX_IMAGES,
  MAX_TEXT,
  POST_TYPES,
  type PostType,
  showsBudget,
  showsCategory,
  showsCondition,
  showsPrice,
  showsTitle,
  titleHint,
  uploadPostImages,
} from "@/lib/community/posts";

const HERE = "/friday-market/create-post";
const digits = (v: string) => v.replace(/\D/g, "");

export default function CreateCommunityPostPage() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, loading: authLoading } = useAuth();

  const [type, setType] = useState<PostType>("general");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [budget, setBudget] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploaded, setUploaded] = useState(0);
  const [success, setSuccess] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?redirect=${encodeURIComponent(HERE)}`);
  }, [authLoading, user, router]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const canPublish =
    !submitting &&
    (text.trim().length > 0 || files.length > 0) &&
    !(type === "image" && files.length === 0);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const imgs = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const room = MAX_IMAGES - files.length;
    if (imgs.length > room) toast.error(`الحد الأقصى ${MAX_IMAGES} صور`);
    setFiles((prev) => [...prev, ...imgs.slice(0, Math.max(0, room))]);
  };

  const publish = async () => {
    if (!user || !canPublish) return;
    setSubmitting(true);
    setUploaded(0);
    let urls: string[] = [];
    try {
      urls = await uploadPostImages(user.uid, files, (i) => setUploaded(i + 1));
      const phoneToUse = digits(phone) || digits(profile?.phone || "");
      await createPost({
        uid: user.uid,
        type,
        text,
        title,
        images: urls,
        price: showsPrice(type) && digits(price) ? Number(digits(price)) : null,
        budget: showsBudget(type) && digits(budget) ? Number(digits(budget)) : null,
        category,
        city,
        condition,
        phone: showsCategory(type) && phoneToUse ? phoneToUse : null,
        authorName: profile?.name || "",
        authorPhotoUrl: profile?.photoURL || "",
      });
      setSuccess(true);
      setTimeout(() => router.push("/friday-market"), 1200);
    } catch {
      if (urls.length) await deleteUploaded(urls);
      setSubmitting(false);
      toast.error("تعذّر النشر، حاول مجددًا.");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center" dir="rtl">
        <CheckCircle2 size={56} className="text-emerald-500" />
        <h1 className="mt-3 text-lg font-black text-slate-900 dark:text-white">تم إرسال منشورك للمراجعة</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">سيظهر في منشورات المجتمع بعد الاعتماد.</p>
      </div>
    );
  }

  const field =
    "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white";

  return (
    <div className="pb-28" dir="rtl">
      <section className="container mx-auto max-w-2xl pt-4">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.push("/friday-market")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700"
            aria-label="إغلاق"
          >
            <X size={18} />
          </button>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">إنشاء منشور</h1>
          <button
            type="button"
            onClick={() => void publish()}
            disabled={!canPublish}
            className="inline-flex h-10 items-center rounded-full bg-brand-700 px-4 text-sm font-black text-white transition hover:bg-brand-800 disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-slate-700"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : "نشر"}
          </button>
        </div>

        <div className="mt-4 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          {/* الكاتب */}
          <div className="flex items-center gap-3">
            <Avatar name={profile?.name || ""} url={profile?.photoURL || undefined} />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">{profile?.name || "عضو"}</p>
              <p className="text-[11px] font-semibold text-slate-500">
                عام{city ? ` · ${city}` : ""}
              </p>
            </div>
          </div>

          {/* نوع المنشور */}
          <p className="mt-4 text-[12px] font-black text-slate-500">نوع المنشور</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {POST_TYPES.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => setType(t.type)}
                className={`rounded-full px-3 py-1.5 text-[12px] font-black transition ${
                  type === t.type
                    ? "bg-brand-700 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {type === "video" && (
            <p className="mt-2 text-[11px] font-bold text-amber-600">رفع الفيديو قريباً — يمكنك النشر بنصّ أو صور الآن.</p>
          )}

          {/* النص */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
            placeholder="بماذا تفكر؟"
            rows={5}
            className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-white p-3 text-[15px] leading-7 outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          <p className="mt-1 text-left text-[11px] font-semibold text-slate-400">
            {text.length} / {MAX_TEXT}
          </p>

          {/* الحقول حسب النوع */}
          <div className="mt-2 space-y-2">
            {showsTitle(type) && (
              <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titleHint(type)} />
            )}
            {showsPrice(type) && (
              <input className={field} inputMode="numeric" value={price} onChange={(e) => setPrice(digits(e.target.value))} placeholder="السعر (اختياري) — د.ل" />
            )}
            {showsBudget(type) && (
              <input className={field} inputMode="numeric" value={budget} onChange={(e) => setBudget(digits(e.target.value))} placeholder="الميزانية (اختياري) — د.ل" />
            )}
            {showsCategory(type) && (
              <input className={field} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="الفئة (اختياري)" />
            )}
            {showsCondition(type) && (
              <div className="flex gap-2">
                {["جديد", "مستعمل"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(condition === c ? "" : c)}
                    className={`h-10 flex-1 rounded-2xl text-sm font-black transition ${
                      condition === c
                        ? "bg-brand-700 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {showsCategory(type) && (
              <input className={field} inputMode="tel" value={phone} onChange={(e) => setPhone(digits(e.target.value))} placeholder="رقم للتواصل (اختياري)" />
            )}
            <div className="relative">
              <MapPin size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select className={`${field} pr-9`} value={city} onChange={(e) => setCity(e.target.value)}>
                <option value="">المدينة (اختياري)</option>
                {libyaCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* الصور */}
          <div className="mt-4">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            {files.length > 0 && (
              <div className="mb-3 grid grid-cols-4 gap-2">
                {previews.map((src, i) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-full w-full object-cover" />
                    {!submitting && (
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute left-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                        aria-label="حذف الصورة"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={submitting || files.length >= MAX_IMAGES}
              onClick={() => fileInput.current?.click()}
              className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-slate-100 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
            >
              <ImagePlus size={16} />
              صور ({files.length}/{MAX_IMAGES})
            </button>
          </div>
        </div>

        {/* زر النشر — ضمن الصفحة (لا ثابت) حتى لا يغطيه شريط التنقل السفلي */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void publish()}
            disabled={!canPublish}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-700 text-base font-black text-white shadow-blue transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none dark:disabled:bg-slate-700"
          >
            {submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {files.length ? `جارٍ رفع الصور ${uploaded}/${files.length}…` : "جارٍ النشر…"}
              </>
            ) : (
              "نشر"
            )}
          </button>
          <p className="mt-1.5 text-center text-[11px] font-semibold text-slate-400">
            يظهر منشورك بعد مراجعة الإدارة.
          </p>
        </div>
      </section>
    </div>
  );
}
