import type { Timestamp } from "firebase/firestore";
import type { Story, StoryDisplayItem } from "./types";

/** مدة القصة - 24 ساعة */
export const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

/**
 * يحوّل Story (من Firestore) إلى StoryDisplayItem (جاهز للعرض).
 * يطبّع الـ Timestamp إلى ms.
 */
export function toDisplayItem(s: Story): StoryDisplayItem | null {
  const createdAt = (s.createdAt as Timestamp)?.toMillis?.();
  const expiresAt = (s.expiresAt as Timestamp)?.toMillis?.();

  // إذا الـ timestamps لم تُكتب بعد (serverTimestamp pending) - تجاهل
  if (typeof createdAt !== "number" || typeof expiresAt !== "number") {
    return null;
  }

  return {
    id: s.id,
    ownerId: s.ownerId,
    ownerName: s.ownerName,
    ownerPhotoURL: s.ownerPhotoURL,
    type: s.type,
    imageUrl: s.imageUrl,
    payload: s.payload,
    createdAtMs: createdAt,
    expiresAtMs: expiresAt,
    viewsCount: s.viewsCount,
  };
}

/** هل القصة منتهية الصلاحية */
export function isExpired(item: StoryDisplayItem, nowMs = Date.now()): boolean {
  return item.expiresAtMs <= nowMs;
}

/** الوقت المتبقي بصيغة "قبل 3 ساعات" */
export function timeAgo(ms: number, nowMs = Date.now()): string {
  const diffSec = Math.floor((nowMs - ms) / 1000);
  if (diffSec < 60) return "الآن";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `قبل ${diffMin} د`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `قبل ${diffH} س`;
  return "أمس";
}

/**
 * يجمع القصص حسب صاحبها - مهم لعرضها كمجموعة في القارئ
 * (مثل Facebook: نقرة على فقاعة الشخص → عرض كل قصصه بالتسلسل).
 */
export function groupByOwner(items: StoryDisplayItem[]): StoryDisplayItem[][] {
  const map = new Map<string, StoryDisplayItem[]>();
  for (const it of items) {
    const arr = map.get(it.ownerId) || [];
    arr.push(it);
    map.set(it.ownerId, arr);
  }
  // داخل كل مجموعة، رتّبهم من الأقدم للأحدث (للعرض بالتسلسل)
  for (const arr of map.values()) {
    arr.sort((a, b) => a.createdAtMs - b.createdAtMs);
  }
  return Array.from(map.values());
}
