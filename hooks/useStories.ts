"use client";

import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { StoryDisplayItem, StoryDocument } from "@/lib/stories/types";
import { toDisplayItem } from "@/lib/stories/helpers";

export function useStories() {
  const [items, setItems] = useState<StoryDisplayItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = Timestamp.now();

    // نجلب فقط أحدث القصص (لا نُحمّل آلاف القصص دفعة واحدة).
    // orderBy(expiresAt desc) = الأحدث انتهاءً = الأحدث نشراً.
    const q = query(
      collection(db, "stories"),
      where("expiresAt", ">", now),
      orderBy("expiresAt", "desc"),
      limit(60)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const nowMs = Date.now();
        const nextItems: StoryDisplayItem[] = [];

        snap.forEach((docSnap) => {
          const raw = docSnap.data() as Omit<StoryDocument, "id">;
          const story = {
            ...raw,
            id: docSnap.id,
          } as StoryDocument;

          const display = toDisplayItem(story);
          if (display && display.expiresAtMs > nowMs) {
            nextItems.push(display);
          }
        });

        nextItems.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setItems(nextItems);
        setLoading(false);
      },
      () => {
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { items, loading };
}
