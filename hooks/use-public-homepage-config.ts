"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
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
 * - One-shot read (لا realtime) - الـconfig لا يتغيّر باستمرار
 * - cache في sessionStorage لمدة دقيقتين لتجنّب reads متكررة
 * - يُرجِع البنرات النشطة فقط (active=true)، مرتَّبة
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
  const cached = typeof window !== "undefined" ? loadCache() : null;

  const [config, setConfig] = useState<HomepageConfig>(
    cached?.config || DEFAULT_HOMEPAGE_CONFIG
  );
  const [banners, setBanners] = useState<HomepageBanner[]>(
    cached?.banners || []
  );
  const [loading, setLoading] = useState(!cached);

  useEffect(() => {
    // إذا cache valid، لا نقرأ
    if (cached) return;

    let cancelled = false;

    (async () => {
      try {
        // قراءة بالتوازي
        const [configSnap, bannersSnap] = await Promise.all([
          getDoc(doc(db, "homepageConfig", "main")),
          getDocs(
            query(
              collection(db, "homepageConfig", "main", "banners"),
              where("active", "==", true),
              orderBy("order", "asc")
            )
          ),
        ]);

        if (cancelled) return;

        const nextConfig: HomepageConfig = configSnap.exists()
          ? { ...DEFAULT_HOMEPAGE_CONFIG, ...(configSnap.data() as any) }
          : DEFAULT_HOMEPAGE_CONFIG;

        const nextBanners = bannersSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as HomepageBanner[];

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
