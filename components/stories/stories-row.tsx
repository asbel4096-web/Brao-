"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useStories } from "@/hooks/useStories";
import { getSeenStoryIdsLocal, groupByOwner, markStorySeenLocal } from "@/lib/stories/helpers";
import { StoryCard } from "./story-card";

/**
 * Lazy load المكوّنات الثقيلة:
 * - StoryCreateModal (621 سطر، tabs + media upload + form)
 * - StoryViewer (433 سطر، video player + progress + viewers)
 *
 * هذه تُفتح عند نقرة المستخدم فقط، فلا داعي لتحميلها في initial bundle.
 * النتيجة: تقليل JS bundle بـ ~1000+ سطر من الكود من الصفحة الرئيسية.
 *
 * `ssr: false` لأن كلاهما يستخدم browser-only APIs (FileReader, video, etc).
 */
const StoryCreateModal = dynamic(
  () => import("./story-create-modal").then((m) => m.StoryCreateModal),
  { ssr: false }
);

const StoryViewer = dynamic(
  () => import("./story-viewer").then((m) => m.StoryViewer),
  { ssr: false }
);

export function StoriesRow() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { items, loading } = useStories();

  const [createOpen, setCreateOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);
  const [seenStoryIds, setSeenStoryIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSeenStoryIds(new Set(getSeenStoryIdsLocal()));
  }, []);

  const groups = useMemo(() => groupByOwner(items), [items]);

  const handleAddStory = () => {
    if (!user) {
      toast.info("سجّل الدخول أولًا حتى تتمكن من نشر قصة.");
      router.push("/login?redirect=/");
      return;
    }
    setCreateOpen(true);
  };

  const handleCompleteOwner = () => {
    setViewerGroupIndex((current) => {
      if (current === null) return null;
      const next = current + 1;
      return next < groups.length ? next : null;
    });
  };

  const handleViewedStory = (storyId: string) => {
    const next = markStorySeenLocal(storyId);
    setSeenStoryIds(new Set(next));
  };

  return (
    <>
      <section
        aria-label="القصص"
        className="border-b border-slate-200/70 bg-white py-3 dark:border-slate-800 dark:bg-slate-950 sm:py-4"
      >
        <div className="container">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white sm:text-base">
                قصص براتشو كار
              </h2>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">
                صور وفيديوهات سريعة تختفي بعد 24 ساعة
              </p>
            </div>
          </div>

          <div className="flex items-stretch gap-2.5 overflow-x-auto no-scrollbar pb-1 sm:gap-3">
            {/* بطاقة "أضف قصة" كبيرة */}
            <button
              type="button"
              onClick={handleAddStory}
              aria-label="أضف قصة"
              className="
                group relative flex h-[184px] w-[124px] shrink-0 flex-col items-center
                justify-center gap-2 overflow-hidden rounded-3xl border-2 border-dashed
                border-brand-300 bg-brand-50/60 transition active:scale-[0.97]
                hover:border-brand-400 dark:border-brand-800 dark:bg-brand-900/20
                sm:h-[210px] sm:w-[142px]
              "
            >
              <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-white shadow-lg shadow-brand-600/30 transition group-active:scale-90">
                <Plus size={24} strokeWidth={2.5} />
              </span>
              <span className="text-[12px] font-black text-brand-700 dark:text-brand-300">
                أضف قصة
              </span>
            </button>

            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[184px] w-[124px] shrink-0 animate-pulse rounded-3xl bg-slate-200 dark:bg-slate-800 sm:h-[210px] sm:w-[142px]"
                  />
                ))
              : groups.map((group, idx) => (
                  <StoryCard
                    key={group[0].ownerId}
                    stories={group}
                    seen={group.every((story) => seenStoryIds.has(story.id))}
                    onClick={() => setViewerGroupIndex(idx)}
                  />
                ))}
          </div>
        </div>
      </section>

      <StoryCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {viewerGroupIndex !== null && groups[viewerGroupIndex] ? (
        <StoryViewer
          stories={groups[viewerGroupIndex]}
          onClose={() => setViewerGroupIndex(null)}
          onCompleteOwner={handleCompleteOwner}
          onViewedStory={handleViewedStory}
        />
      ) : null}
    </>
  );
}
