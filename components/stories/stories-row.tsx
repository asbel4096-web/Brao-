"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useStories } from "@/hooks/useStories";
import { getSeenStoryIdsLocal, groupByOwner, markStorySeenLocal } from "@/lib/stories/helpers";
import { AddStoryBubble } from "./add-story-bubble";
import { StoryBubble } from "./story-bubble";

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

          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 sm:gap-4">
            <AddStoryBubble onClick={handleAddStory} />

            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex shrink-0 flex-col items-center gap-1">
                    <div className="h-16 w-16 animate-pulse rounded-full bg-slate-200 dark:bg-slate-800 sm:h-[68px] sm:w-[68px]" />
                    <div className="h-2.5 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  </div>
                ))
              : groups.map((group, idx) => (
                  <StoryBubble
                    key={group[0].ownerId}
                    stories={group}
                    seen={group.every((story) => seenStoryIds.has(story.id))}
                    onClick={() => setViewerGroupIndex(idx)}
                  />
                ))}

            {!loading && groups.length === 0 && (
              <div className="flex min-h-[68px] items-center rounded-3xl border border-dashed border-slate-300 px-4 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                لا توجد قصص حالياً — كن أول من ينشر.
              </div>
            )}
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
