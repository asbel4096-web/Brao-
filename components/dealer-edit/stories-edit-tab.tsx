"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import {
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  Clock,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { useDealerStories } from "@/hooks/dealer/use-dealer-stories";
import {
  STORY_CATEGORIES,
  type StoryCategory,
  type DealerStory,
  DEALER_STORY_TTL_MS,
  MAX_STORIES_PER_CATEGORY,
  MAX_TOTAL_ACTIVE_STORIES,
  findCategory,
} from "@/lib/dealer/stories";
import {
  uploadStoryImage,
  validateImageFile,
  deleteImageByURL,
} from "@/lib/dealer/storage";
import { getTraderDisplayName } from "@/lib/utils";

/**
 * Tab: إنشاء وإدارة Dealer Stories.
 *
 * - عرض كل التصنيفات + القصص فيها
 * - زر "إضافة قصة" لكل تصنيف → modal بسيط (صورة + caption + تصنيف)
 * - حذف فردي لكل قصة
 */

export function StoriesEditTab() {
  const { user, profile } = useAuth();
  const { grouped, totalCount, loading } = useDealerStories(profile?.uid);
  const [createOpen, setCreateOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState<StoryCategory>(
    "new_arrivals"
  );

  const handleAdd = (cat: StoryCategory) => {
    setCreateCategory(cat);
    setCreateOpen(true);
  };

  if (!user || !profile) {
    return (
      <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm font-bold text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        جارٍ التحميل...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-[12px] font-black text-slate-700 dark:text-slate-300">
          <Clock size={13} />
          {totalCount} قصة نشطة
        </div>
        <span className="text-[10px] text-slate-500">
          (الحد الأقصى {MAX_TOTAL_ACTIVE_STORIES})
        </span>
      </div>

      {/* Categories */}
      {STORY_CATEGORIES.map((cat) => {
        const items = grouped[cat.key] || [];
        const canAdd = items.length < MAX_STORIES_PER_CATEGORY && totalCount < MAX_TOTAL_ACTIVE_STORIES;

        return (
          <CategorySection
            key={cat.key}
            category={cat}
            stories={items}
            canAdd={canAdd}
            onAdd={() => handleAdd(cat.key)}
          />
        );
      })}

      {/* Create modal */}
      {createOpen && (
        <CreateStoryModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          dealerUid={user.uid}
          dealerName={getTraderDisplayName(profile)}
          dealerLogo={(profile as any).dealerLogo || profile.photoURL}
          initialCategory={createCategory}
        />
      )}
    </div>
  );
}

// ============================================================
// Category Section
// ============================================================
function CategorySection({
  category,
  stories,
  canAdd,
  onAdd,
}: {
  category: typeof STORY_CATEGORIES[number];
  stories: DealerStory[];
  canAdd: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br ${category.gradient} text-lg`}>
            {category.fallbackIcon}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">
              {category.label}
            </h3>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {stories.length} / {MAX_STORIES_PER_CATEGORY}
            </p>
          </div>
        </div>
        {canAdd && (
          <motion.button
            type="button"
            onClick={onAdd}
            whileTap={{ scale: 0.95 }}
            className="
              inline-flex items-center gap-1 rounded-full
              bg-blue-600 px-3 py-1.5 text-[11px] font-black text-white
              shadow-sm transition hover:bg-blue-700
            "
          >
            <Plus size={11} />
            إضافة
          </motion.button>
        )}
      </div>

      {stories.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-5">
          <AnimatePresence>
            {stories.map((story) => (
              <StoryThumb key={story.id} story={story} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Story Thumbnail (with delete)
// ============================================================
function StoryThumb({ story }: { story: DealerStory }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    const ok = await confirm({
      title: "حذف هذه القصة؟",
      message: "ستختفي القصة فوراً من صفحة المعرض.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;

    setDeleting(true);
    try {
      // حذف من Storage (best-effort)
      if (story.mediaURL) {
        await deleteImageByURL(story.mediaURL);
      }
      // حذف من Firestore
      await deleteDoc(doc(db, "dealerStories", story.id));
      toast.success("تم حذف القصة");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
      setDeleting(false);
    }
  };

  const remainingDays = (() => {
    const ms = story.expiresAt?.toMillis?.();
    if (!ms) return 0;
    return Math.max(0, Math.ceil((ms - Date.now()) / (1000 * 60 * 60 * 24)));
  })();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800"
    >
      {story.mediaURL && (
        <Image
          src={story.mediaURL}
          alt={story.caption || ""}
          fill
          className="object-cover"
          sizes="(max-width: 640px) 25vw, 150px"
        />
      )}

      {/* Days remaining */}
      <div className="absolute bottom-1 right-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[9px] font-black text-white">
        {remainingDays}ي
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="
          absolute top-1 left-1 grid h-6 w-6 place-items-center
          rounded-full bg-black/70 text-white backdrop-blur
          transition hover:bg-rose-600 active:scale-90
          disabled:opacity-50
        "
        aria-label="حذف"
      >
        {deleting ? (
          <Loader2 size={9} className="animate-spin" />
        ) : (
          <Trash2 size={9} />
        )}
      </button>
    </motion.div>
  );
}

// ============================================================
// Create Story Modal
// ============================================================
function CreateStoryModal({
  open,
  onClose,
  dealerUid,
  dealerName,
  dealerLogo,
  initialCategory,
}: {
  open: boolean;
  onClose: () => void;
  dealerUid: string;
  dealerName: string;
  dealerLogo?: string;
  initialCategory: StoryCategory;
}) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<StoryCategory>(initialCategory);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const v = validateImageFile(f, { maxMB: 5 });
    if (!v.ok) {
      toast.error(v.error || "ملف غير صالح");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.warning("اختاري صورة أولاً");
      return;
    }

    setSubmitting(true);
    try {
      // 1. رفع الصورة
      const upload = await uploadStoryImage(dealerUid, file);

      // 2. إنشاء وثيقة Firestore
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromMillis(Date.now() + DEALER_STORY_TTL_MS);

      await addDoc(collection(db, "dealerStories"), {
        dealerUid,
        dealerName,
        dealerLogo: dealerLogo || null,
        category,
        mediaURL: upload.url,
        mediaType: "image",
        caption: caption.trim().slice(0, 200) || null,
        viewCount: 0,
        createdAt: serverTimestamp(),
        expiresAt,
      });

      toast.success("تمت إضافة القصة ✨");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "فشلت الإضافة");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm"
        onClick={submitting ? undefined : onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="
          fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md
          -translate-y-1/2 rounded-3xl border border-slate-200
          bg-white p-5 shadow-2xl
          dark:border-slate-800 dark:bg-slate-950
        "
        dir="rtl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white">
            إضافة قصة جديدة
          </h2>
          {!submitting && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category selector */}
        <div>
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
            التصنيف
          </label>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {STORY_CATEGORIES.map((cat) => {
              const isActive = category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`
                    flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-black transition
                    ${isActive
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                    }
                  `}
                >
                  <span className="text-base">{cat.fallbackIcon}</span>
                  {cat.shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Image picker */}
        <div className="mt-4">
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
            الصورة
          </label>
          {preview ? (
            <div className="relative mt-1.5 aspect-[3/4] max-w-[200px] overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
              <Image
                src={preview}
                alt=""
                fill
                className="object-cover"
                sizes="200px"
              />
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-1 left-1 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="
                mt-1.5 flex aspect-[3/4] max-w-[200px] flex-col items-center
                justify-center gap-2 rounded-2xl border-2 border-dashed
                border-slate-300 bg-slate-50 text-slate-400 transition
                hover:border-blue-500 hover:text-blue-500
                dark:border-slate-700 dark:bg-slate-900
              "
            >
              <ImagePlus size={28} />
              <span className="text-[11px] font-black">اختاري صورة</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Caption */}
        <div className="mt-4">
          <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
            وصف (اختياري)
          </label>
          <textarea
            rows={2}
            maxLength={200}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="وصف قصير للقصة..."
            className="
              mt-1.5 w-full resize-none rounded-2xl border border-slate-200
              bg-white px-3 py-2 text-sm outline-none
              focus:border-blue-500
              dark:border-slate-700 dark:bg-slate-900 dark:text-white
            "
          />
        </div>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="
              h-10 rounded-2xl border border-slate-200 px-4 text-xs
              font-black text-slate-700 hover:bg-slate-50
              dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800
              disabled:opacity-60
            "
          >
            إلغاء
          </button>
          <motion.button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !file}
            whileTap={{ scale: 0.97 }}
            className="
              inline-flex h-10 items-center gap-1.5 rounded-2xl
              bg-blue-600 px-5 text-xs font-black text-white shadow-md
              transition hover:bg-blue-700 disabled:opacity-60
            "
          >
            {submitting ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                جارٍ النشر...
              </>
            ) : (
              <>
                <Plus size={12} />
                نشر القصة
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </>
  );
}
