"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Story, StoryDisplayItem } from "@/lib/stories/types";
import { toDisplayItem } from "@/lib/stories/helpers";

/**
 * يجلب القصص النشطة (غير المنتهية).
 *
 * نفلتر بـ expiresAt > now على مستوى Firestore (يحتاج فهرس على expiresAt).
 * ونفلتر مرة أخرى في الواجهة احتياطاً (لو القصة انتهت بين الجلب والعرض).
 */
export function useStories() {
  const [items, setItems] = useState<StoryDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Timestamp.now();
    const q = query(
      collection(db, "stories"),
      where("expiresAt", ">", now),
      orderBy("expiresAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const result: StoryDisplayItem[] = [];
        const nowMs = Date.now();
        snap.forEach((d) => {
          const story = { id: d.id, ...(d.data() as any) } as Story;
          const display = toDisplayItem(story);
          if (display && display.expiresAtMs > nowMs) {
            result.push(display);
          }
        });
        // ترتيب من الأحدث للأقدم
        result.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setItems(result);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, []);

  return { items, loading };
}
