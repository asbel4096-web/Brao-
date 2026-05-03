"use client";

import Image from "next/image";
import { memo } from "react";
import type { StoryDisplayItem } from "@/lib/stories/types";

interface Props {
  /** كل قصص نفس المالك (لعرضها كمجموعة بالتسلسل) */
  stories: StoryDisplayItem[];
  /** هل المستخدم الحالي شاهد كل هذه القصص (للون الـ ring) */
  seen?: boolean;
  onClick: () => void;
}

function StoryBubbleImpl({ stories, seen = false, onClick }: Props) {
  const first = stories[0];
  const owner = first.ownerName;
  const photo = first.ownerPhotoURL || first.imageUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex shrink-0 flex-col items-center gap-1 focus:outline-none"
      aria-label={`قصص ${owner}`}
    >
      {/* الـ ring */}
      <div
        className={`
          relative rounded-full p-[2.5px] transition-transform group-active:scale-95
          ${
            seen
              ? "bg-slate-300 dark:bg-slate-600"
              : "bg-gradient-to-br from-brand-700 via-action-500 to-brand-500"
          }
        `}
      >
        <div className="rounded-full bg-white p-[2px] dark:bg-slate-950">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt={owner}
            referrerPolicy="no-referrer"
            className="h-16 w-16 rounded-full object-cover sm:h-[68px] sm:w-[68px]"
          />
        </div>

        {/* عداد القصص للمالك (لو عنده أكثر من 1) */}
        {stories.length > 1 && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-action-500 px-1 text-[10px] font-black text-white dark:border-slate-950">
            {stories.length}
          </span>
        )}
      </div>

      {/* الاسم */}
      <span className="max-w-[72px] truncate text-[11px] font-bold text-slate-700 dark:text-slate-300">
        {owner || "مستخدم"}
      </span>
    </button>
  );
}

export const StoryBubble = memo(StoryBubbleImpl);
