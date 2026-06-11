"use client";

import {
  collection,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Banned Words System
 *
 * البنية في Firestore:
 *   bannedWords/{wordId} = { word, severity, addedBy, addedAt }
 *
 * severity:
 *  - "block": يمنع النشر تماماً (الكلمات الأشد)
 *  - "warn":  ينبّه المستخدم لكنه يسمح بالنشر (مؤجَّل للأدمن للمراجعة)
 *
 * الفلسفة:
 *  - الكلمات تُحمّل مرة واحدة عند فتح التطبيق وتُحفظ في الـcache.
 *  - الفحص client-side قبل الإرسال — تجربة سريعة، لا تأخير شبكة.
 *  - الفحص يستخدم word boundary regex لتجنّب false positives
 *    (مثلاً "كلب" لا يطابق "كلباز").
 *  - المطابقة diacritics-insensitive (يتجاهل الحركات).
 *
 * Note: قاعدة Firestore تسمح بقراءة bannedWords فقط للأدمن. لذا الفحص
 * client-side محدود للأدمن. للمستخدمين العاديين، نُغلّف الفحص في
 * try/catch ونتجاهل الفشل (الـserver-side rules تظل خط الدفاع الثاني).
 *
 * **بديل عملي**: نضع `read: if true` على bannedWords لتعمل client-side
 * فلترة. الـtradeoff: قائمة الكلمات تصبح public (المتلاعبون يرون ما
 * يجب تجنّبه). لكن هذا مقبول لأن الفلترة client-side هي مجرد UX
 * تحسين — الحماية الفعلية في الـrules التي تمنع الكتابة على الـcollection.
 */

export interface BannedWord {
  id: string;
  word: string;
  severity: "block" | "warn";
  addedBy?: string;
  addedAt?: any;
}

// تطبيع النص: lowercase + إزالة diacritics العربية + تكوين موحَّد
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .trim();
}

// ============================================================
// In-memory cache + subscription
// ============================================================
let cachedWords: BannedWord[] = [];
let cacheLoaded = false;
let subscribers: Array<(words: BannedWord[]) => void> = [];
let unsubscribe: Unsubscribe | null = null;

/**
 * يبدأ subscription على bannedWords. آمن للاستدعاء المتكرّر - يبدأ مرّة
 * واحدة فعلياً، باقي المشتركين يستمعون لنفس الـstream.
 *
 * يُرجِع دالة unsubscribe خاصة بهذا المشترك (لا يُغلق الـstream الفعلي
 * حتى آخر مشترك).
 */
export function subscribeBannedWords(
  callback: (words: BannedWord[]) => void
): () => void {
  subscribers.push(callback);

  // إذا الـcache محمَّل، نُرسل القيمة فوراً
  if (cacheLoaded) {
    callback(cachedWords);
  }

  // ابدأ الـstream لو لم يُبدأ بعد
  if (!unsubscribe) {
    unsubscribe = onSnapshot(
      collection(db, "bannedWords"),
      (snap) => {
        cachedWords = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as BannedWord[];
        cacheLoaded = true;
        for (const sub of subscribers) sub(cachedWords);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.warn("[bannedWords] subscription error (ignored):", err?.code);
        // فشل القراءة (مستخدم عادي) → cache فارغ، لا فلترة
        cachedWords = [];
        cacheLoaded = true;
        for (const sub of subscribers) sub(cachedWords);
      }
    );
  }

  return () => {
    subscribers = subscribers.filter((s) => s !== callback);
    if (subscribers.length === 0 && unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  };
}

/**
 * فحص نص ضد قائمة الكلمات المحظورة.
 *
 * @returns null إذا النص نظيف، أو { matchedWord, severity } إذا وُجد منع
 */
export function checkBannedWords(
  text: string,
  words: BannedWord[] = cachedWords
): { matchedWord: string; severity: "block" | "warn" } | null {
  if (!text || !words.length) return null;

  const normalized = normalizeText(text);

  for (const w of words) {
    const normWord = normalizeText(w.word);
    if (!normWord) continue;

    // فحص word boundary: نتجاهل أحرف عربية ولاتينية على الأطراف.
    // regex: (^|[^أ-ي\w])word($|[^أ-ي\w])
    // لتبسيط: نستخدم indexOf بدون regex لتجنّب escape مشاكل.
    // الفحص: الكلمة موجودة + ما قبلها وما بعدها ليس حرفاً.
    let idx = 0;
    while ((idx = normalized.indexOf(normWord, idx)) !== -1) {
      const before = idx === 0 ? "" : normalized[idx - 1];
      const after =
        idx + normWord.length >= normalized.length
          ? ""
          : normalized[idx + normWord.length];

      // فحص: الحرف قبل/بعد ليس جزءاً من كلمة (حرف عربي/لاتيني/رقم)
      const isWordChar = (c: string) => /[\u0621-\u064Aa-z0-9]/.test(c);
      const okBefore = !before || !isWordChar(before);
      const okAfter = !after || !isWordChar(after);

      if (okBefore && okAfter) {
        return { matchedWord: w.word, severity: w.severity };
      }

      idx += normWord.length;
    }
  }

  return null;
}
