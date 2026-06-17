"use client";

import { useEffect, useState } from "react";

/**
 * useCategoryImages — يجلب خريطة صور الأقسام (slug → url) من /api/category-images
 * مع cache مشترك ورجوع لخريطة فارغة عند الفشل (لا تتعطّل الواجهة).
 */
let _cache: Record<string, string> | null = null;
let _at = 0;
const TTL = 120_000;

export function useCategoryImages() {
  const [images, setImages] = useState<Record<string, string>>(_cache || {});

  useEffect(() => {
    let cancelled = false;
    if (_cache && Date.now() - _at < TTL) {
      setImages(_cache);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/category-images");
        const data = await res.json().catch(() => ({}));
        const map = data?.images && typeof data.images === "object" ? data.images : {};
        if (cancelled) return;
        _cache = map;
        _at = Date.now();
        setImages(map);
      } catch {
        if (!cancelled) setImages({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return images;
}
