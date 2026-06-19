"use client";

import { FRIDAY_CATEGORIES } from "@/lib/friday-market/types";
import { cn } from "@/lib/utils";

interface Props {
  value: string; // "all" أو مفتاح القسم
  onChange: (value: string) => void;
  className?: string;
}

export function CategoryChips({ value, onChange, className = "" }: Props) {
  const chips = [
    { key: "all", label: "الكل", emoji: "🛒" },
    ...FRIDAY_CATEGORIES,
  ];

  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      {chips.map((c) => {
        const active = value === c.key;
        return (
          <button
            key={c.key}
            type="button"
            onClick={() => onChange(c.key)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-[13px] font-bold transition active:scale-95",
              active
                ? "bg-action-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            )}
          >
            <span className="ml-1" aria-hidden>
              {c.emoji}
            </span>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
