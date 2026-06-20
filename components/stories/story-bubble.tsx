"use client";

import { memo } from "react";
import Image from "next/image";
import { Play, Wrench } from "lucide-react";
import type { StoryDisplayItem } from "@/lib/stories/types";

interface Props {
  stories: StoryDisplayItem[];
  seen?: boolean;
  onClick: () => void;
}

function StoryBubbleImpl({ stories, seen = false, onClick }: Props) {
  const first = stories[0];
  const owner = first.ownerName || "مستخدم";
  const firstMedia = first.media[0];
  const videoUrl = firstMedia?.kind === "video" ? firstMedia.url : null;
  const posterImage =
    [first.coverUrl, firstMedia?.thumbnailUrl].find(
      (u) => u && u !== videoUrl
    ) || null;
  const cover = posterImage || "/icons/car-card.svg";
  const hasVideo = stories.some((story) => story.media.some((media) => media.kind === "video"));
  const isService = first.type === "service";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex shrink-0 flex-col items-center gap-1 focus:outline-none"
      aria-label={`قصص ${owner}`}
    >
      <div
        className={[
          "relative rounded-full p-[2.5px] transition-transform group-active:scale-95",
          seen
            ? "bg-slate-300 dark:bg-slate-600"
            : "bg-gradient-to-br from-brand-700 via-action-500 to-brand-500",
        ].join(" ")}
      >
        <div className="relative rounded-full bg-white p-[2px] dark:bg-slate-950">
          {posterImage ? (
            <Image
              src={cover}
              alt={owner}
              width={68}
              height={68}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover sm:h-[68px] sm:w-[68px]"
            />
          ) : videoUrl ? (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-slate-600 to-slate-800 sm:h-[68px] sm:w-[68px]">
              <Play size={20} className="text-white/80" fill="currentColor" />
            </div>
          ) : (
            <Image
              src={cover}
              alt={owner}
              width={68}
              height={68}
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full object-cover sm:h-[68px] sm:w-[68px]"
            />
          )}

          {hasVideo ? (
            <span className="absolute inset-x-0 bottom-1 mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur">
              <Play size={10} className="translate-x-[1px]" fill="currentColor" />
            </span>
          ) : null}

          {isService ? (
            <span className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 text-white dark:border-slate-950">
              <Wrench size={10} />
            </span>
          ) : null}
        </div>

        {stories.length > 1 ? (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-action-500 px-1 text-[10px] font-black text-white dark:border-slate-950">
            {stories.length}
          </span>
        ) : null}
      </div>

      <span className="max-w-[74px] truncate text-[11px] font-bold text-slate-700 dark:text-slate-300">
        {owner}
      </span>
    </button>
  );
}

export const StoryBubble = memo(StoryBubbleImpl);
