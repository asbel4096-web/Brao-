"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useStories } from "@/hooks/useStories";
import { groupByOwner } from "@/lib/stories/helpers";
import { AddStoryBubble } from "./add-story-bubble";
import { StoryBubble } from "./story-bubble";
import { StoryCreateModal } from "./story-create-modal";
import { StoryViewer } from "./story-viewer";

export function StoriesRow() {
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { items, loading } = useStories();

  const [createOpen, setCreateOpen] = useState(false);
  const [viewerGroupIndex, setViewerGroupIndex] = useState<number | null>(null);

  const groups = useMemo(() => groupByOwner(items), [items]);

  const handleAddStory = () => {
    if (!user) {
      toast.info("سجّل الدخول لنشر قصة.");
      router.push("/login?redirect=/");
      return;
    }
    setCreateOpen(true);
  };

  const handleOpenGroup = (groupIndex: number) => {
    setViewerGroupIndex(groupIndex);
  };

  const handleCloseViewer = () => setViewerGroupIndex(null);

  const handleCompleteOwner = () => {
    // الانتقال للمالك التالي تلقائياً (مثل Facebook)
    if (viewerGroupIndex === null) return;
    const next = viewerGroupIndex + 1;
    if (next < groups.length) {
      setViewerGroupIndex(next);
    } else {
      setViewerGroupIndex(null);
    }
  };

  return (
    <>
      <section
        aria-label="القصص"
        className="border-b border-slate-200/70 bg-white py-3 dark:border-slate-800 dark:bg-slate-950 sm:py-4"
      >
        <div className="container">
          <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1 sm:gap-4">
            {/* الفقاعة الأولى دائماً: إضافة قصة */}
            <AddStoryBubble onClick={handleAddStory} />

            {loading
              ? // skeleton placeholders
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="shrink-0 flex flex-col items-center gap-1"
                  >
                    <div className="h-16 w-16 sm:h-[68px] sm:w-[68px] rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    <div className="h-2.5 w-12 rounded bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  </div>
                ))
              : groups.map((group, idx) => (
                  <StoryBubble
                    key={group[0].ownerId}
                    stories={group}
                    onClick={() => handleOpenGroup(idx)}
                  />
                ))}

            {!loading && groups.length === 0 && (
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                لا توجد قصص حالياً — كن أوّل من ينشر!
              </div>
            )}
          </div>
        </div>
      </section>

      <StoryCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {viewerGroupIndex !== null && groups[viewerGroupIndex] && (
        <StoryViewer
          stories={groups[viewerGroupIndex]}
          startIndex={0}
          onClose={handleCloseViewer}
          onCompleteOwner={handleCompleteOwner}
        />
      )}
    </>
  );
}
