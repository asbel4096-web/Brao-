"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { DealerStory, StoryCategory } from "@/lib/dealer/stories";
import {
  STORY_CATEGORIES,
  groupStoriesByCategory,
  isStoryActive,
} from "@/lib/dealer/stories";

/**
 * Hook لقراءة stories معرض معيَّن.
 *
 * يقرأ:
 *  - آخر 50 story للـdealerUid
 *  - يفلتر المنتهية client-side
 *  - يجمعها حسب التصنيف
 *
 * realtime + يدعم الـviewer (يفتح كل قصص تصنيف معاً).
 */
export function useDealerStories(dealerUid: string | undefined) {
  const [stories, setStories] = useState<DealerStory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dealerUid) {
      setStories([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "dealerStories"),
      where("dealerUid", "==", dealerUid),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as DealerStory[];
        // فلتر المنتهية client-side
        const active = all.filter(isStoryActive);
        setStories(active);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[dealerStories] error:", err?.code);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [dealerUid]);

  const grouped = groupStoriesByCategory(stories);

  // قائمة التصنيفات بمعلومات كل واحد + كم قصة فيه
  const categoryRings = STORY_CATEGORIES.map((cat) => {
    const items = grouped[cat.key] || [];
    return {
      ...cat,
      count: items.length,
      latestThumb: items[0]?.mediaURL || null,
      stories: items,
    };
  });

  return {
    stories,
    grouped,
    categoryRings,
    loading,
    totalCount: stories.length,
  };
}

/**
 * Hook لقراءة قصة واحدة (للـviewer fullscreen).
 */
export function useStoriesByCategory(
  dealerUid: string | undefined,
  category: StoryCategory | undefined
) {
  const { grouped, loading } = useDealerStories(dealerUid);
  const items = category && grouped[category] ? grouped[category] : [];
  return { stories: items, loading };
}
