"use client";

import { useEffect, useRef } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { createNotification } from "@/lib/notifications";
import { matchesAlert } from "@/lib/search-alert-match";
import type { Listing, SearchAlert } from "@/lib/types";

/**
 * يُحدّد متى يفحص الـmatcher آخر تشغيل عبر sessionStorage حتى لا يفحص
 * كل ركوب للصفحة (سيكون مزعجاً ومكلفاً للقراءات).
 * يفحص مرة واحدة كل 10 دقائق لكل جلسة، وأيضاً بعد إعادة التحميل.
 */
const COOLDOWN_MS = 10 * 60 * 1000;
const SESSION_KEY = "bratsho:search-alert-matcher:last-run";


/**
 * Hook يُشغَّل عند تسجيل دخول المستخدم. عند الاستدعاء:
 *  1) يقرأ تنبيهات المستخدم النشطة.
 *  2) يقرأ آخر N إعلان معتمد.
 *  3) لكل تنبيه × إعلان، يفحص المطابقة.
 *  4) إذا تطابقا ولم نرسل عنه إشعاراً سابقاً، نُنشئ إشعاراً
 *     ونُضيف الـlistingId إلى notifiedListingIds في التنبيه.
 *
 * كل العمليات تُجرى على بيانات المستخدم الحالي فقط. القواعد تمنعه من
 * قراءة تنبيهات الآخرين.
 */
export function useSearchAlertMatcher(uid: string | null | undefined) {
  const ran = useRef(false);

  useEffect(() => {
    if (!uid || ran.current) return;
    ran.current = true;

    // فحص التبريد عبر الجلسة.
    try {
      const lastRunStr = sessionStorage.getItem(SESSION_KEY);
      if (lastRunStr) {
        const lastRun = Number(lastRunStr);
        if (Date.now() - lastRun < COOLDOWN_MS) {
          return;
        }
      }
    } catch {
      /* sessionStorage قد لا يكون متاحاً (incognito/SSR) */
    }

    const run = async () => {
      try {
        // (1) قرأ التنبيهات النشطة للمستخدم.
        const alertsSnap = await getDocs(
          query(
            collection(db, "users", uid, "searchAlerts"),
            where("isActive", "==", true)
          )
        );
        if (alertsSnap.empty) return;

        const alerts: SearchAlert[] = alertsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // (2) قرأ آخر 30 إعلان معتمد. هذا حد محافظ يبقي القراءات منخفضة.
        const listingsSnap = await getDocs(
          query(
            collection(db, "listings"),
            where("status", "==", "approved"),
            orderBy("createdAt", "desc"),
            limit(30)
          )
        );
        if (listingsSnap.empty) return;

        const listings: Listing[] = listingsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        // (3) فحص المطابقات.
        for (const alert of alerts) {
          const already = new Set(alert.notifiedListingIds || []);
          const newMatches: Listing[] = [];

          for (const listing of listings) {
            // تخطّى إعلانات المستخدم نفسه.
            if (listing.ownerId === uid) continue;
            // تخطّى ما أُرسل عنه إشعار سابقاً.
            if (already.has(listing.id)) continue;
            if (matchesAlert(listing, alert)) {
              newMatches.push(listing);
            }
          }

          if (newMatches.length === 0) continue;

          // (4) أنشئ إشعاراً لكل مطابقة جديدة + حدّث التنبيه.
          for (const listing of newMatches) {
            await createNotification({
              userId: uid,
              type: "search_alert_match",
              title: "وصل إعلان مطابق لبحثك",
              body: `${listing.title} بسعر ${listing.price.toLocaleString("ar-LY")} د.ل في ${listing.city}`,
              link: `/listings/${listing.id}`,
              meta: {
                listingId: listing.id,
                alertId: alert.id,
                alertLabel: alert.label || "",
              },
            });
          }

          // أضف الإعلانات الجديدة لقائمة المُبلَّغ عنها (حدّ أقصى 200 لتجنّب
          // نموّ الحقل بلا حدود).
          const updatedIds = [
            ...(alert.notifiedListingIds || []),
            ...newMatches.map((l) => l.id),
          ].slice(-200);

          await updateDoc(
            doc(db, "users", uid, "searchAlerts", alert.id),
            {
              notifiedListingIds: updatedIds,
              lastMatchedAt: serverTimestamp(),
            }
          );
        }

        // سجّل وقت آخر فحص.
        try {
          sessionStorage.setItem(SESSION_KEY, String(Date.now()));
        } catch {
          /* تجاهل */
        }
      } catch (err) {
        // فشل صامت — لا نريد كسر تجربة المستخدم بسبب التنبيهات.
        // eslint-disable-next-line no-console
        console.warn("[useSearchAlertMatcher] فشل الفحص:", err);
      }
    };

    void run();
  }, [uid]);
}
