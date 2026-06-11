import type { Timestamp } from "firebase/firestore";

/**
 * Dealer Stories System
 *
 * نظام stories مستقل للمعارض الموثقة (منفصل عن الـstories العامة).
 *
 * الفرق:
 *  - الـstories العامة: في الـhome، لكل المستخدمين، 24 ساعة
 *  - الـdealer stories: في صفحة المعرض فقط، مُصنَّفة، مدة أطول (30 يوماً)
 *
 * البنية في Firestore:
 *   dealerStories/{storyId}:
 *     dealerUid: string                   (مالك القصة)
 *     dealerName: string                  (نسخة للقراءة السريعة)
 *     dealerLogo?: string
 *     category: StoryCategory
 *     mediaURL: string                    (صورة/فيديو)
 *     mediaType: "image" | "video"
 *     caption?: string
 *     listingId?: string                  (لو القصة تشير لإعلان)
 *     viewCount: number
 *     createdAt: Timestamp
 *     expiresAt: Timestamp                (createdAt + 30 يوم)
 *
 * التصنيفات الأساسية (مفروضة):
 *   - new_arrivals: وصل حديثاً
 *   - offers: عروض اليوم
 *   - showroom: داخل المعرض
 *   - test_drive: تجربة قيادة
 */

export type StoryCategory =
  | "new_arrivals"
  | "offers"
  | "showroom"
  | "test_drive";

export interface StoryCategoryMeta {
  key: StoryCategory;
  label: string;
  shortLabel: string;
  fallbackIcon: string;
  gradient: string;
}

export const STORY_CATEGORIES: StoryCategoryMeta[] = [
  {
    key: "new_arrivals",
    label: "وصل حديثاً",
    shortLabel: "وصل حديثاً",
    fallbackIcon: "🚗",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    key: "offers",
    label: "عروض اليوم",
    shortLabel: "عروض",
    fallbackIcon: "🔥",
    gradient: "from-orange-500 to-red-600",
  },
  {
    key: "showroom",
    label: "داخل المعرض",
    shortLabel: "المعرض",
    fallbackIcon: "🏢",
    gradient: "from-purple-500 to-pink-600",
  },
  {
    key: "test_drive",
    label: "تجربة قيادة",
    shortLabel: "تجربة",
    fallbackIcon: "🛣️",
    gradient: "from-emerald-500 to-teal-600",
  },
];

/** TTL للـdealer stories: 30 يوماً (أطول من 24h للستوريز العامة). */
export const DEALER_STORY_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** أقصى عدد قصص في كل تصنيف. */
export const MAX_STORIES_PER_CATEGORY = 20;

/** أقصى عدد إجمالي قصص نشطة لمعرض. */
export const MAX_TOTAL_ACTIVE_STORIES = 50;

export interface DealerStory {
  id: string;
  dealerUid: string;
  dealerName?: string;
  dealerLogo?: string;
  category: StoryCategory;
  mediaURL: string;
  mediaType: "image" | "video";
  caption?: string;
  listingId?: string;
  viewCount?: number;
  createdAt?: Timestamp | null;
  expiresAt?: Timestamp | null;
}

/**
 * Dealer Gallery - صور إضافية للمعرض.
 * تُخزَّن مباشرة في users/{uid}.dealerGallery كـarray من URLs.
 * أقصى 12 صورة.
 */
export const MAX_DEALER_GALLERY_IMAGES = 12;

export interface DealerGalleryImage {
  url: string;
  caption?: string;
  uploadedAt?: number;
}

// ============================================================
// Helpers
// ============================================================

export function findCategory(key: string): StoryCategoryMeta | null {
  return STORY_CATEGORIES.find((c) => c.key === key) || null;
}

export function isStoryActive(story: DealerStory): boolean {
  const ms = story.expiresAt?.toMillis?.();
  if (!ms) return false;
  return ms > Date.now();
}

/** تجميع stories حسب التصنيف. */
export function groupStoriesByCategory(
  stories: DealerStory[]
): Record<StoryCategory, DealerStory[]> {
  const result: Record<StoryCategory, DealerStory[]> = {
    new_arrivals: [],
    offers: [],
    showroom: [],
    test_drive: [],
  };
  for (const story of stories) {
    if (result[story.category]) {
      result[story.category].push(story);
    }
  }
  return result;
}

/** صياغة عدد المشاهدات بصيغة مختصرة. */
export function formatViewsCompact(n: number): string {
  if (!n || n < 0) return "0";
  if (n < 1000) return String(n);
  if (n < 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (n < 1_000_000) return `${Math.floor(n / 1000)}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}
