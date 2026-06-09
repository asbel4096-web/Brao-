"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  type HomepageBanner,
  type HomepageConfig,
} from "@/lib/cms/types";

/**
 * Hook عام (public-side) لقراءة إعدادات الصفحة الرئيسية + البنرات.
 *
 * - One-shot read (لا realtime)
 * - cache في sessionStorage لمدة دقيقتين
 * - فلترة الـbanners (active=true) + ترتيب client-side لتجنّب الحاجة
 *   لـcomposite index في Firestore (where + orderBy)
 * - يُرجِع الإعدادات الافتراضية لو الـdoc غير موجود
 *
 * تكلفة Firestore:
 *  - 1 read للـconfig
 *  - N reads للبنرات (عادة 1-5)
 *  → ~6 reads أول مرة، 0 reads داخل cache window
 */

const CACHE_KEY = "bratsho:homepage-config:v1";
const CACHE_TTL_MS = 2 * 60 * 1000;

interface CachedData {
  config: HomepageConfig;
  banners: HomepageBanner[];
  ts: number;
}

function loadCache(): CachedData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedData;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveCache(data: Omit<CachedData, "ts">) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ...data, ts: Date.now() })
    );
  } catch {
    /* تجاهل - sessionStorage قد يكون ممتلئاً أو معطّلاً */
  }
}

export function usePublicHomepageConfig() {
  // مهم: نبدأ دائماً بالافتراضي على السيرفر *و* أول رندر للعميل،
  // كي يتطابق رندر الخادم مع رندر الـhydration (تفادي React #310).
  // الـcache يُقرأ لاحقاً داخل useEffect (بعد الـhydration).
  const [config, setConfig] = useState<HomepageConfig>(
    DEFAULT_HOMEPAGE_CONFIG
  );
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1) محاولة استخدام الـcache (بعد الـhydration فقط - آمن الآن).
    const cached = loadCache();
    if (cached) {
      setConfig(cached.config);
      setBanners(cached.banners);
      setLoading(false);
      return; // cache صالح، لا نقرأ من Firestore
    }

    (async () => {
      try {
        // قراءة بالتوازي. ملاحظة: لا نستخدم where+orderBy معاً
        // لتجنّب الحاجة لـcomposite index في Firestore. نجلب كل البنرات
        // ونفلتر+نُرتّب client-side (العدد عادة < 10، التكلفة لا تُذكر).
        const [configSnap, bannersSnap] = await Promise.all([
          getDoc(doc(db, "homepageConfig", "main")),
          getDocs(collection(db, "homepageConfig", "main", "banners")),
        ]);

        if (cancelled) return;

        const nextConfig: HomepageConfig = configSnap.exists()
          ? { ...DEFAULT_HOMEPAGE_CONFIG, ...(configSnap.data() as any) }
          : DEFAULT_HOMEPAGE_CONFIG;

        const allBanners = bannersSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as HomepageBanner[];

        // فلترة active=true + ترتيب حسب order (client-side)
        const nextBanners = allBanners
          .filter((b) => b.active === true)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        setConfig(nextConfig);
        setBanners(nextBanners);
        setLoading(false);

        saveCache({ config: nextConfig, banners: nextBanners });
      } catch (err: any) {
        if (cancelled) return;
        // eslint-disable-next-line no-console
        console.warn("[homepage-config] read failed:", err?.code);
        // عند الفشل، نستخدم defaults (لا نُفشل الصفحة الرئيسية)
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { config, banners, loading };
}
