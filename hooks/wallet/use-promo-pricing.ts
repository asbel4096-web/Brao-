"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_PROMO_PRICING,
  sanitizePromoPricing,
  type PromoServiceKey,
} from "@/lib/wallet/promo-pricing";

/**
 * usePromoPricing — أسعار باقات الترقية الفعّالة للعرض.
 *
 * تجلب من /api/pricing (يقرأ config/app عبر Admin SDK)، مع cache مشترك
 * ورجوع للقيم الافتراضية عند أي فشل — فلا تتعطّل الواجهة أبداً.
 * ملاحظة: هذا للعرض فقط؛ الشحن الفعلي يتحقّق منه السيرفر.
 */
let _cache: Record<PromoServiceKey, number> | null = null;
let _at = 0;
const TTL = 60_000;

export function usePromoPricing() {
  const [pricing, setPricing] = useState<Record<PromoServiceKey, number>>(
    _cache || DEFAULT_PROMO_PRICING
  );
  const [loading, setLoading] = useState(_cache === null);

  useEffect(() => {
    let cancelled = false;
    if (_cache && Date.now() - _at < TTL) {
      setPricing(_cache);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/pricing");
        const data = await res.json().catch(() => ({}));
        const clean = sanitizePromoPricing(data?.pricing);
        if (cancelled) return;
        _cache = clean;
        _at = Date.now();
        setPricing(clean);
      } catch {
        if (!cancelled) setPricing(DEFAULT_PROMO_PRICING);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { pricing, loading };
}
