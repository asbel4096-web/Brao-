"use client";

import { useEffect, useState } from "react";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Hook لإحصاءات Dashboard الأدمن.
 *
 * يستخدم realtime subscriptions على collections الأساسية، ويحسب:
 *  - إجمالي/جديد آخر 7 أيام للمستخدمين والإعلانات
 *  - إعلانات معلَّقة، طلبات تمييز، بلاغات معلّقة
 *  - إجمالي المشاهدات
 *  - عدد فتاوى المراجعة (alerts للأدمن)
 *
 * الأداء:
 *  - subscriptions منفصلة لكل collection (Firebase يدمج listeners مكرّرة)
 *  - الحسابات client-side خفيفة (مرور مرة على الـdocs)
 *  - لمشروع كبير لاحقاً، نُحرّك للـserver-side عبر analytics/daily collection
 */

export interface AdminStats {
  // إعلانات
  listingsTotal: number;
  listingsPending: number;
  listingsApproved: number;
  listingsRejected: number;
  listingsNewLast7Days: number;
  listingsViews: number;

  // مستخدمون
  usersTotal: number;
  usersNewLast7Days: number;
  usersBanned: number;

  // طلبات
  featuredRequestsPending: number;
  reportsPending: number;

  // العدّاد الموحّد للتنبيهات (يظهر badge أحمر في dashboard)
  alertsCount: number;

  loading: boolean;
  error: string | null;
}

const INITIAL_STATS: AdminStats = {
  listingsTotal: 0,
  listingsPending: 0,
  listingsApproved: 0,
  listingsRejected: 0,
  listingsNewLast7Days: 0,
  listingsViews: 0,
  usersTotal: 0,
  usersNewLast7Days: 0,
  usersBanned: 0,
  featuredRequestsPending: 0,
  reportsPending: 0,
  alertsCount: 0,
  loading: true,
  error: null,
};

export function useAdminStats(): AdminStats {
  const [stats, setStats] = useState<AdminStats>(INITIAL_STATS);

  useEffect(() => {
    const sevenDaysAgo = Timestamp.fromMillis(
      Date.now() - 7 * 24 * 60 * 60 * 1000
    );

    // Listings
    const unsubListings = onSnapshot(
      collection(db, "listings"),
      (snap) => {
        let total = 0,
          pending = 0,
          approved = 0,
          rejected = 0,
          newRecent = 0,
          views = 0;
        snap.forEach((d) => {
          const data = d.data() as any;
          total++;
          if (data.status === "pending") pending++;
          else if (data.status === "approved") approved++;
          else if (data.status === "rejected") rejected++;
          views += Number(data.views) || 0;
          if (
            data.createdAt &&
            data.createdAt.toMillis &&
            data.createdAt.toMillis() > sevenDaysAgo.toMillis()
          ) {
            newRecent++;
          }
        });
        setStats((p) => ({
          ...p,
          listingsTotal: total,
          listingsPending: pending,
          listingsApproved: approved,
          listingsRejected: rejected,
          listingsNewLast7Days: newRecent,
          listingsViews: views,
          loading: false,
        }));
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[useAdminStats] listings error:", err);
        setStats((p) => ({ ...p, error: err.message, loading: false }));
      }
    );

    // Users
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        let total = 0,
          newRecent = 0,
          banned = 0;
        snap.forEach((d) => {
          const data = d.data() as any;
          total++;
          if (data.banned === true) banned++;
          if (
            data.createdAt &&
            data.createdAt.toMillis &&
            data.createdAt.toMillis() > sevenDaysAgo.toMillis()
          ) {
            newRecent++;
          }
        });
        setStats((p) => ({
          ...p,
          usersTotal: total,
          usersNewLast7Days: newRecent,
          usersBanned: banned,
        }));
      },
      () => {
        /* تجاهل بصمت - الـusers ليس critical للـdashboard الأولي */
      }
    );

    // طلبات التمييز المعلَّقة
    const unsubFR = onSnapshot(
      query(
        collection(db, "featuredRequests"),
        where("status", "==", "pending")
      ),
      (snap) => {
        setStats((p) => ({ ...p, featuredRequestsPending: snap.size }));
      },
      () => {
        /* قد لا يكون موجود بعد - تجاهل */
      }
    );

    // بلاغات معلَّقة (collection جديد - قد يكون فارغاً)
    const unsubReports = onSnapshot(
      query(collection(db, "reports"), where("status", "==", "pending")),
      (snap) => {
        setStats((p) => ({ ...p, reportsPending: snap.size }));
      },
      () => {
        /* لم نُنشئ بعد - تجاهل */
      }
    );

    return () => {
      unsubListings();
      unsubUsers();
      unsubFR();
      unsubReports();
    };
  }, []);

  // الـalertsCount يُحسب من stats الأخرى (إعلانات معلّقة + بلاغات + طلبات)
  const alertsCount =
    stats.listingsPending + stats.featuredRequestsPending + stats.reportsPending;

  return { ...stats, alertsCount };
}
