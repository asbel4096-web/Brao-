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
import type { StoryDisplayItem, StoryDocument } from "@/lib/stories/types";
import { toDisplayItem } from "@/lib/stories/helpers";

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
        const nowMs = Date.now();
        const nextItems: StoryDisplayItem[] = [];

        console.log("STORIES SNAPSHOT SIZE:", snap.size);

        snap.forEach((docSnap) => {
          const raw = docSnap.data() as Omit<StoryDocument, "id">;

          const story = {
            ...raw,
            id: docSnap.id,
          } as StoryDocument;

          console.log("RAW STORY:", story);

          const display = toDisplayItem(story);
          console.log("DISPLAY STORY:", display);

          if (display && display.expiresAtMs > nowMs) {
            nextItems.push(display);
          }
        });

        nextItems.sort((a, b) => b.createdAtMs - a.createdAtMs);
        console.log("VISIBLE STORIES:", nextItems);

        setItems(nextItems);
        setLoading(false);
      },
      (error) => {
        console.error("USE STORIES ERROR:", error);
        console.error("USE STORIES CODE:", (error as any)?.code);
        console.error("USE STORIES MESSAGE:", (error as any)?.message);
        setItems([]);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { items, loading };
}
