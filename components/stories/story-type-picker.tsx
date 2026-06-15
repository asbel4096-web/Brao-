"use client";

import { Car, Wrench, Tag, X } from "lucide-react";
import type { StoryType } from "@/lib/stories/types";
import { STORY_TYPE_META } from "@/lib/stories/types";

interface Props {
  onSelect: (type: StoryType) => void;
  onClose: () => void;
}

const ICONS: Record<StoryType, typeof Car> = {
  car: Car,
  service: Wrench,
  offer: Tag,
};

const TYPES: StoryType[] = ["car", "service", "offer"];

export function StoryTypePicker({ onSelect, onClose }: Props) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white">
            ما نوع قصتك؟
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            اختر النوع المناسب — تظهر القصة لمدة 24 ساعة.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
          aria-label="إغلاق"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {TYPES.map((t) => {
          const meta = STORY_TYPE_META[t];
          const Icon = ICONS[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onSelect(t)}
              className="
                group flex flex-col items-center gap-3
                rounded-3xl border border-slate-200 bg-white p-5
                text-center transition-all
                hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-blue
                dark:border-slate-700 dark:bg-slate-900
                dark:hover:border-brand-700
              "
            >
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-md ${meta.bgClass}`}
              >
                <Icon size={28} className={meta.iconClass} />
              </div>
              <div>
                <p className="text-base font-black text-slate-900 dark:text-white">
                  {meta.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {meta.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
