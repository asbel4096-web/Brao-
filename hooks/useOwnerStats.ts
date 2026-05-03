"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collectionGroup, query, where, getCountFromServer, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsListingOwner } from "./useIsListingOwner";

/**
 * بنية الإحصائيات الخاصة بالمالك.
 *
 * كل الحقول optional لأن:
 * - بعضها يُحسب من collections منفصلة (favorites, click events).
 * - بعضها قد يحتاج Cloud Functions لتجميعه (مكلف للقراءة المباشرة).
 *
 * فلسفة التوسّع:
 * - views: من listing.views مباشرة (موجود الآن).
 * - favoritesCount: من collectionGroup('favorites') حيث listingId == X.
 * - chatClicks / phoneClicks / whatsappClicks: تُسجَّل في
 *   collection منفصل: listings/{id}/events أو في حقول counter في listing نفسه.
 */
export interface OwnerStats {
  /** عدد المشاهدات (من listing.views) */
  views?: number;
  /** عدد من أضافوا الإعلان للمفضلة */
  favoritesCount?: number;
  /** عدد النقرات على زر "ابدأ دردشة" */
  chatClicks?: number;
  /** عدد النقرات على زر الاتصال */
  phoneClicks?: number;
  /** عدد النقرات على زر واتساب */
  whatsappClicks?: number;
}

interface UseOwnerStatsOptions {
  listingId: string;
  ownerId?: string | null;
  /** القيمة الأوّلية للمشاهدات (من document نفسه) */
  initialViews?: number;
  /** هل نحسب favoritesCount من collectionGroup */
  enableFavoritesCount?: boolean;
}

interface UseOwnerStatsResult {
  stats: OwnerStats;
  loading: boolean;
  isOwner: boolean;
}

/**
 * يجلب الإحصائيات الخاصة بالمالك فقط.
 *
 * إذا كان المستخدم الحالي ليس المالك → لا يقوم بأي طلب لـ Firestore
 * (حماية إضافية + توفير reads).
 *
 * استخدام:
 *   const { stats, isOwner } = useOwnerStats({
 *     listingId: listing.id,
 *     ownerId: listing.ownerId,
 *     initialViews: listing.views,
 *   });
 *
 *   if (isOwner) return <OwnerStatsBar stats={stats} />;
 */
export function useOwnerStats({
  listingId,
  ownerId,
  initialViews,
  enableFavoritesCount = true,
}: UseOwnerStatsOptions): UseOwnerStatsResult {
  const isOwner = useIsListingOwner(ownerId);

  const [stats, setStats] = useState<OwnerStats>({
    views: initialViews,
  });
  const [loading, setLoading] = useState(false);

  /* ----------------------------------------------------------
   * 1) views — اشتراك مباشر على document الإعلان
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!isOwner || !listingId) return;

    const unsub = onSnapshot(
      doc(db, "listings", listingId),
      (snap) => {
        const data = snap.data();
        if (data) {
          setStats((s) => ({
            ...s,
            views: typeof data.views === "number" ? data.views : s.views,
            // عند تفعيل counters في listing نفسه:
            chatClicks: typeof data.chatClicks === "number" ? data.chatClicks : s.chatClicks,
            phoneClicks: typeof data.phoneClicks === "number" ? data.phoneClicks : s.phoneClicks,
            whatsappClicks:
              typeof data.whatsappClicks === "number" ? data.whatsappClicks : s.whatsappClicks,
          }));
        }
      },
      () => {/* تجاهل بصمت */}
    );

    return () => unsub();
  }, [isOwner, listingId]);

  /* ----------------------------------------------------------
   * 2) favoritesCount — استعلام collectionGroup
   *
   * يتطلب فهرس على collectionGroup('favorites') مع
   * field 'listingId'. التفاصيل في README.
   * ---------------------------------------------------------- */
  useEffect(() => {
    if (!isOwner || !listingId || !enableFavoritesCount) return;

    let cancelled = false;
    setLoading(true);

    const fetchFavoritesCount = async () => {
      try {
        const q = query(
          collectionGroup(db, "favorites"),
          where("listingId", "==", listingId)
        );
        const snap = await getCountFromServer(q);
        if (!cancelled) {
          setStats((s) => ({ ...s, favoritesCount: snap.data().count }));
        }
      } catch {
        // فهرس غير موجود أو قواعد غير مسموح بها → اتركه undefined
        if (!cancelled) {
          setStats((s) => ({ ...s, favoritesCount: undefined }));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchFavoritesCount();
    return () => {
      cancelled = true;
    };
  }, [isOwner, listingId, enableFavoritesCount]);

  // عند عدم كون المستخدم هو المالك، نرجع stats فارغة
  if (!isOwner) {
    return { stats: {}, loading: false, isOwner: false };
  }

  return { stats, loading, isOwner };
}

/**
 * Helper مستقل لتسجيل event نقرة من البطاقة أو صفحة التفاصيل.
 *
 * لا يحتاج صلاحيات خاصة - يكتب في collection events داخل listing.
 * في firestore.rules يُسمح للجميع بالكتابة، لكن القراءة للمالك فقط.
 *
 * استخدام:
 *   onClick={() => { recordListingEvent(listing.id, "phone_click"); ... }}
 */
export type ListingEventType =
  | "view"
  | "chat_click"
  | "phone_click"
  | "whatsapp_click";

export async function recordListingEvent(
  listingId: string,
  type: ListingEventType,
  meta?: Record<string, unknown>
): Promise<void> {
  // توليد ID فريد للحدث
  const eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  try {
    const { setDoc, serverTimestamp } = await import("firebase/firestore");
    await setDoc(doc(collection(db, "listings", listingId, "events"), eventId), {
      type,
      createdAt: serverTimestamp(),
      ...meta,
    });
  } catch {
    // تسجيل event ليس حرجاً - نتجاهل بصمت لكي لا نعطّل التجربة
  }
}
