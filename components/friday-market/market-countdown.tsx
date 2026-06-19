"use client";

import { countdownParts, formatCountdown } from "@/lib/friday-market/market-time";
import { cn } from "@/lib/utils";

interface Props {
  /** ملي ثانية متبقية. */
  ms: number;
  /** "boxes" خانات أرقام | "text" نص ودّي. */
  variant?: "boxes" | "text";
  /** نص يسبق العدّاد (للنسخة النصّية). */
  prefix?: string;
  className?: string;
  /** ألوان فاتحة فوق خلفية داكنة (للبانر). */
  onDark?: boolean;
}

function Box({ value, label, onDark }: { value: number; label: string; onDark?: boolean }) {
  const v = value < 10 ? `0${value}` : String(value);
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "min-w-[44px] rounded-2xl px-2.5 py-2 text-center tabular-nums",
          "text-xl font-black leading-none",
          onDark
            ? "bg-white/15 text-white ring-1 ring-white/20 backdrop-blur"
            : "bg-action-50 text-action-700 ring-1 ring-action-100 dark:bg-action-500/10 dark:text-action-300"
        )}
      >
        {v}
      </div>
      <span
        className={cn(
          "text-[10px] font-bold",
          onDark ? "text-white/70" : "text-slate-500 dark:text-slate-400"
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function MarketCountdown({
  ms,
  variant = "text",
  prefix = "متبقٍ",
  className = "",
  onDark = false,
}: Props) {
  if (variant === "boxes") {
    const { days, hours, minutes, seconds } = countdownParts(ms);
    return (
      <div className={cn("flex items-end gap-2", className)} dir="ltr">
        {days > 0 && <Box value={days} label="يوم" onDark={onDark} />}
        <Box value={hours} label="ساعة" onDark={onDark} />
        <Box value={minutes} label="دقيقة" onDark={onDark} />
        <Box value={seconds} label="ثانية" onDark={onDark} />
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-bold tabular-nums",
        className
      )}
    >
      <span aria-hidden>⏳</span>
      <span>
        {prefix} {formatCountdown(ms)}
      </span>
    </span>
  );
}
