"use client";

import { useEffect, useState } from "react";
import {
  subscribeBannedWords,
  checkBannedWords,
  type BannedWord,
} from "@/lib/moderation/banned-words";

/**
 * Hook لاستخدام banned words في النماذج (تعليقات، إعلانات).
 *
 * استخدام:
 *   const { check, ready } = useBannedWordsCheck();
 *   const result = check(commentText);
 *   if (result?.severity === "block") {
 *     toast.error(`الكلمة "${result.matchedWord}" غير مسموحة.`);
 *     return;
 *   }
 *
 * ready: false في أول تحميل، true بعد جلب القائمة (أو الفشل).
 */
export function useBannedWordsCheck() {
  const [words, setWords] = useState<BannedWord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribeBannedWords((w) => {
      setWords(w);
      setReady(true);
    });
    return () => unsub();
  }, []);

  const check = (text: string) => checkBannedWords(text, words);

  return { check, ready, words };
}
