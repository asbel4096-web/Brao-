"use client";

import { Clapperboard, Crown, ListChecks, MessagesSquare } from "lucide-react";
import {
  CONTENT_TYPE_LABEL,
  STATUS_META,
  displayStatus,
  statusLabel,
  type ContentItem,
  type ContentType,
} from "@/lib/moderation/content";

const pill = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1";

export function StatusBadge({ item }: { item: ContentItem }) {
  const st = displayStatus(item);
  return <span className={`${pill} ${STATUS_META[st].cls}`}>{statusLabel(item.type, st)}</span>;
}

const TYPE_ICON = { listing: ListChecks, post: MessagesSquare, story: Clapperboard } as const;

export function TypeBadge({ type }: { type: ContentType }) {
  const Icon = TYPE_ICON[type];
  return (
    <span className={`${pill} bg-brand-50 text-brand-700 ring-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-900`}>
      <Icon size={11} />
      {CONTENT_TYPE_LABEL[type]}
    </span>
  );
}

/** «مدفوع» (نفس شرط الخادم) + تسميات الترويج الفعّال. */
export function PaidBadge({ item }: { item: ContentItem }) {
  if (!item.paid && item.promotions.length === 0) return null;
  const labels = Array.from(new Set(item.promotions.map((p) => p.label)));
  return (
    <span className={`${pill} bg-action-50 text-action-700 ring-action-200 dark:bg-action-500/15 dark:text-action-300 dark:ring-action-700/40`}>
      <Crown size={11} />
      {item.paid ? "مدفوع" : "ترويج"}
      {labels.length > 0 && <span className="font-bold opacity-80">· {labels.slice(0, 3).join("، ")}</span>}
    </span>
  );
}
