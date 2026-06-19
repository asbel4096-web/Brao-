/**
 * مطابقة الكلمات المحظورة — منطق صرف (pure) بلا اعتماد على Firebase أو
 * المتصفح، كي يُستخدم على الخادم (API routes عبر Admin SDK) وأي مكان آخر.
 *
 * مطابق تماماً لمنطق lib/moderation/banned-words.ts (client) لكن بدون
 * طبقة الـsubscription، حتى تكون نتيجة الفحص على الخادم والعميل متطابقة.
 */

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .trim();
}

export interface BannedWordLike {
  word: string;
  severity: "block" | "warn";
}

/**
 * يفحص نصاً ضد قائمة كلمات. يُرجِع أول تطابق (بحدود الكلمة) أو null.
 */
export function matchBannedWords(
  text: string,
  words: BannedWordLike[]
): { matchedWord: string; severity: "block" | "warn" } | null {
  if (!text || !words || words.length === 0) return null;
  const normalized = normalizeText(text);

  const isWordChar = (c: string) => /[\u0621-\u064Aa-z0-9]/.test(c);

  for (const w of words) {
    const normWord = normalizeText(w.word || "");
    if (!normWord) continue;

    let idx = 0;
    while ((idx = normalized.indexOf(normWord, idx)) !== -1) {
      const before = idx === 0 ? "" : normalized[idx - 1];
      const after =
        idx + normWord.length >= normalized.length
          ? ""
          : normalized[idx + normWord.length];

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
