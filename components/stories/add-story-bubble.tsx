"use client";

import { Plus } from "lucide-react";

interface Props {
  onClick: () => void;
}

export function AddStoryBubble({ onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex shrink-0 flex-col items-center gap-1 focus:outline-none"
      aria-label="إضافة قصة"
    >
      <div className="rounded-full bg-gradient-to-br from-brand-700 to-brand-500 p-[2.5px] transition-transform group-active:scale-95 shadow-blue">
        <div
          className="
            flex h-16 w-16 items-center justify-center rounded-full
            border-2 border-dashed border-white/60 bg-brand-700/90
            text-white sm:h-[68px] sm:w-[68px]
          "
        >
          <Plus size={28} strokeWidth={2.5} />
        </div>
      </div>
      <span className="text-[11px] font-bold text-brand-700 dark:text-brand-300">
        إضافة قصة
      </span>
    </button>
  );
}
