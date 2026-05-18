"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * يقرأ خرائط شعارات الماركات من Firestore (collection `brandLogos`).
 * المفتاح: brand id (مثل "toyota")، القيمة: رابط الشعار.
 *
 * تحسينات الأداء:
 * - getDocs مرة واحدة بدلاً من onSnapshot المستمر (الشعارات تتغيّر نادراً
 *   فلا داعي لـsubscription مفتوح يستهلك Firestore reads باستمرار).
 * - cache في sessionStorage لمدة ساعة - أي صفحة تستخدم الـhook ضمن
 *   الجلسة لن تستدعي Firestore أصلاً.
 * - الـcache يُقرأ في useState lazy initializer لتفادي flicker للـfallback.
 */

const CACHE_KEY = "bratsho:brand-logos:v1";
const CACHE_TTL_MS = 60 * 60 * 1000; // ساعة

interface CacheShape {
  ts: number;
  logos: Record<string, string>;
}

function readCache(): Record<string, string> | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheShape;
    if (!parsed || typeof parsed !== "object") return null;
    if (Date.now() - parsed.ts > CACHE_TTL_MS) return null;
    return parsed.logos || {};
  } catch {
    return null;
  }
}

function writeCache(logos: Record<string, string>) {
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: Date.now(), logos })
    );
  } catch {
    /* تجاهل - sessionStorage قد لا يكون متاحاً */
  }
}

export function useBrandLogos(): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    return readCache() || {};
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Object.keys(cached).length > 0) {
      // لدينا cache صالح، لا حاجة لـquery جديد.
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDocs(collection(db, "brandLogos"));
        if (cancelled) return;
        const map: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as { logoUrl?: string };
          if (data.logoUrl) map[d.id] = data.logoUrl;
        });
        setLogos(map);
        writeCache(map);
      } catch {
        // تجاهل صامت - الـfallback في BrandLogo يكفي.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return logos;
}
