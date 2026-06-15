"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getCountFromServer,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface PlatformStatsData {
  cars: number;
  parts: number;
  dealers: number;
  activeUsers: number;
}

interface State {
  data: PlatformStatsData | null;
  loading: boolean;
  error: boolean;
}

// فئات قطع الغيار (كما تُخزَّن في حقل category بالاسم العربي).
const PARTS_CATEGORIES = [
  "قطع غيار سيارات",
  "قطع غيار شاحنات",
  "قطع غيار كهربائية",
  "قطع غيار مستعملة",
  "كماليات سيارات",
];

const CACHE_KEY = "bratsho:platform-stats:v1";
const CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

/**
 * إحصائيات حقيقية من Firestore باستخدام getCountFromServer
 * (عدّ كفؤ على الخادم - لا يقرأ كل المستندات، تكلفة منخفضة).
 *
 * - cars: إعلانات category=سيارات
 * - parts: إعلانات قطع الغيار (عدة فئات)
 * - dealers: مستخدمون verificationType ∈ {dealer, showroom} أو isVerifiedDealer
 * - activeUsers: مستخدمون lastLoginAt خلال آخر 30 يوم
 *
 * يبدأ بـnull (Skeleton)، ويُخزّن النتيجة 10 دقائق لتقليل القراءات.
 */
export function usePlatformStats() {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: false,
  });

  useEffect(() => {
    let cancelled = false;

    // 1) كاش بعد الـhydration
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.ts < CACHE_TTL && parsed.data) {
          setState({ data: parsed.data, loading: false, error: false });
          return;
        }
      }
    } catch {}

    const run = async () => {
      try {
        // 1) المحاولة الأولى: قراءة وثيقة الإحصائيات المُجمّعة مسبقاً
        //    (stats/platform). قراءة واحدة عامة - لا تُرفض بـ403، وأسرع
        //    بكثير من 5 استعلامات aggregate.
        try {
          const statsSnap = await getDoc(doc(db, "stats", "platform"));
          if (!cancelled && statsSnap.exists()) {
            const d = statsSnap.data() as Partial<PlatformStatsData>;
            if (
              typeof d.cars === "number" &&
              typeof d.parts === "number" &&
              typeof d.dealers === "number" &&
              typeof d.activeUsers === "number"
            ) {
              const data: PlatformStatsData = {
                cars: d.cars,
                parts: d.parts,
                dealers: d.dealers,
                activeUsers: d.activeUsers,
              };
              setState({ data, loading: false, error: false });
              try {
                sessionStorage.setItem(
                  CACHE_KEY,
                  JSON.stringify({ ts: Date.now(), data })
                );
              } catch {}
              return;
            }
          }
        } catch {
          // الوثيقة غير موجودة بعد → نكمل للطريقة الاحتياطية (aggregate)
        }

        // 2) احتياطي: عدّ مباشر عبر getCountFromServer (يتطلب القواعد
        //    والفهارس الصحيحة - status==approved على listings).
        const listingsCol = collection(db, "listings");
        const usersCol = collection(db, "users");

        const thirtyDaysAgo = Timestamp.fromMillis(
          Date.now() - 30 * 24 * 60 * 60 * 1000
        );

        // عدّادات متوازية
        const [
          carsSnap,
          partsSnap,
          dealersSnap,
          showroomsSnap,
          activeSnap,
        ] = await Promise.all([
          getCountFromServer(
            query(
              listingsCol,
              where("status", "==", "approved"),
              where("category", "==", "سيارات")
            )
          ),
          getCountFromServer(
            query(
              listingsCol,
              where("status", "==", "approved"),
              where("category", "in", PARTS_CATEGORIES)
            )
          ),
          getCountFromServer(
            query(usersCol, where("verificationType", "==", "dealer"))
          ),
          getCountFromServer(
            query(usersCol, where("verificationType", "==", "showroom"))
          ),
          getCountFromServer(
            query(usersCol, where("lastLoginAt", ">=", thirtyDaysAgo))
          ),
        ]);

        if (cancelled) return;

        const data: PlatformStatsData = {
          cars: carsSnap.data().count,
          parts: partsSnap.data().count,
          dealers: dealersSnap.data().count + showroomsSnap.data().count,
          activeUsers: activeSnap.data().count,
        };

        setState({ data, loading: false, error: false });

        try {
          sessionStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ ts: Date.now(), data })
          );
        } catch {}
      } catch (err) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn("[platform-stats] count failed:", (err as any)?.code);
        setState({ data: null, loading: false, error: true });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
