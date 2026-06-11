"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  addTowFavorite,
  removeTowFavorite,
  subscribeTowFavorites,
} from "@/lib/tow-favorites";

/**
 * Hook موحّد لقائمة "ساحباتي المفضلة" + toggle.
 *
 * يستخدم realtime subscription حتى أي تغيير من جهاز ثاني للمستخدم نفسه
 * يظهر فوراً (مثلاً أضاف ساحبة من الموبايل، يراها على الديسكتوب).
 *
 * المُخرجات:
 *  - ids: Set<string> للبحث O(1) (`isFavorite(id)`).
 *  - orderedIds: المصفوفة المرتّبة (الأحدث أولاً) - للعرض في الشريط.
 *  - toggle(id): يُضيف أو يُزيل. يُرجِع `true` إذا أصبحت مُضافة بعد التبديل.
 *  - loading: قبل أول snapshot، أو حين لا يوجد مستخدم.
 *  - signedIn: هل المستخدم مسجَّل دخول.
 */
export function useTowFavorites() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!uid) {
      // زائر غير مسجَّل: لا مفضلة. ننهي loading فوراً.
      setOrderedIds([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeTowFavorites(uid, (ids) => {
      setOrderedIds(ids);
      setLoading(false);
    });

    return () => unsub();
  }, [uid, authLoading]);

  const ids = useMemo(() => new Set(orderedIds), [orderedIds]);

  const isFavorite = useCallback(
    (id: string) => ids.has(id),
    [ids]
  );

  const toggle = useCallback(
    async (id: string): Promise<boolean> => {
      if (!uid) {
        // غير مسجَّل - نرمي خطأ يُلتقط على الـcallsite ليعرض toast.
        throw new Error("UNAUTHENTICATED");
      }
      const currentlyFav = ids.has(id);
      try {
        if (currentlyFav) {
          await removeTowFavorite(uid, id);
          return false;
        } else {
          await addTowFavorite(uid, id);
          return true;
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[useTowFavorites] toggle failed:", err?.code, err?.message);
        throw err;
      }
    },
    [uid, ids]
  );

  return {
    /** Set للبحث السريع. */
    ids,
    /** المصفوفة المرتّبة (الأحدث أولاً). */
    orderedIds,
    /** عدد المفضلة. */
    count: orderedIds.length,
    isFavorite,
    toggle,
    loading,
    signedIn: Boolean(uid),
  };
}
