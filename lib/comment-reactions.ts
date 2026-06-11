/**
 * تفاعلات التعليقات في براتشو كار.
 *
 * هذه الستة هي المفتاح الوحيد المسموح به في حقل
 * `comments/{id}.reactions[uid]`. القواعد على Firestore تتحقّق من المفتاح
 * عبر hasOnly، لذا أي اسم خارج هذه القائمة سيُرفض.
 *
 * إن أردت إضافة/حذف تفاعل في المستقبل:
 *   1) عدّل القائمة هنا.
 *   2) عدّل قاعدة `comments/update` في firestore.rules لتشمل الاسم الجديد
 *      ضمن allowedReactionKeys (أو احذفه منها).
 *   3) لا حاجة لـmigration على الوثائق الموجودة - الحقل ينمو طبيعياً.
 */

export const COMMENT_REACTIONS = [
  { key: "like",    label: "إعجاب",   emoji: "👍", color: "#3b82f6" },
  { key: "love",    label: "حب",       emoji: "❤️", color: "#ef4444" },
  { key: "haha",    label: "ضحك",      emoji: "😂", color: "#f59e0b" },
  { key: "wow",     label: "اندهاش",   emoji: "😮", color: "#a855f7" },
  { key: "sad",     label: "حزن",      emoji: "😢", color: "#64748b" },
  { key: "angry",   label: "غضب",      emoji: "😡", color: "#dc2626" },
] as const;

export type CommentReactionKey = typeof COMMENT_REACTIONS[number]["key"];

/** قائمة المفاتيح فقط - مفيدة للتحقّق السريع. */
export const REACTION_KEYS: readonly CommentReactionKey[] =
  COMMENT_REACTIONS.map((r) => r.key);

/** يبحث عن بيانات تفاعل بالمفتاح. يرجّع null إذا غير معروف. */
export function getReactionMeta(
  key: string | undefined | null
): (typeof COMMENT_REACTIONS)[number] | null {
  if (!key) return null;
  return COMMENT_REACTIONS.find((r) => r.key === key) || null;
}

/**
 * يُحوّل خريطة `reactions: { [uid]: key }` إلى ملخّص:
 *   - counts: كم تفاعل من كل نوع
 *   - top3: أكثر 3 تفاعلات شيوعاً (للعرض المضغوط تحت التعليق)
 *   - total: المجموع الكلي
 */
export function summarizeReactions(
  reactions: Record<string, string> | undefined
): {
  counts: Record<CommentReactionKey, number>;
  top3: { key: CommentReactionKey; count: number }[];
  total: number;
} {
  const counts: Record<string, number> = {};
  let total = 0;

  if (reactions) {
    for (const key of Object.values(reactions)) {
      if (!REACTION_KEYS.includes(key as CommentReactionKey)) continue;
      counts[key] = (counts[key] || 0) + 1;
      total += 1;
    }
  }

  const top3 = (Object.entries(counts) as [CommentReactionKey, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([key, count]) => ({ key, count }));

  // املأ الأنواع الناقصة بـ0 حتى يكون النوع counts كاملاً
  const fullCounts = {} as Record<CommentReactionKey, number>;
  for (const k of REACTION_KEYS) fullCounts[k] = counts[k] || 0;

  return { counts: fullCounts, top3, total };
}
