"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  DEFAULT_FRIDAY_SETTINGS,
  type FridayMarketSettings,
} from "@/lib/friday-market/types";
import {
  computeMarketState,
  type MarketState,
} from "@/lib/friday-market/market-time";

/**
 * useMarketState
 *
 * يجمع:
 *  - إعدادات السوق من config/fridayMarket (realtime)
 *  - حالة الوقت المحسوبة (مفتوح؟ المتبقّي؟ weekKey؟) مع تحديث كل ثانية
 *
 * مصدر القراءة عام (تسمح به قاعدة config/{docId}).
 */

const CONFIG_DOC = "config";
const CONFIG_ID = "fridayMarket";

let cachedSettings: FridayMarketSettings | null = null;

export function useMarketState() {
  const [settings, setSettings] = useState<FridayMarketSettings>(
    cachedSettings || DEFAULT_FRIDAY_SETTINGS
  );
  const [settingsLoading, setSettingsLoading] = useState<boolean>(
    cachedSettings === null
  );
  const [now, setNow] = useState<number>(() => Date.now());
  const mountedRef = useRef(false);

  // اشتراك realtime على الإعدادات
  useEffect(() => {
    mountedRef.current = true;
    const ref = doc(db, CONFIG_DOC, CONFIG_ID);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const merged = {
            ...DEFAULT_FRIDAY_SETTINGS,
            ...(snap.data() as Partial<FridayMarketSettings>),
          };
          cachedSettings = merged;
          setSettings(merged);
        } else {
          cachedSettings = DEFAULT_FRIDAY_SETTINGS;
          setSettings(DEFAULT_FRIDAY_SETTINGS);
        }
        setSettingsLoading(false);
      },
      () => {
        // فشل القراءة → الافتراضي (السوق مفعّل بإعدادات الجمعة القياسية)
        setSettings(DEFAULT_FRIDAY_SETTINGS);
        setSettingsLoading(false);
      }
    );
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, []);

  // عدّاد كل ثانية
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const state: MarketState = useMemo(
    () => computeMarketState(settings, now),
    [settings, now]
  );

  // هل السوق متاح فعلاً؟ (مفعّل من الإعدادات + ضمن نافذة الجمعة)
  const isLive = settings.enabled !== false && state.isOpen;

  return {
    settings,
    loading: settingsLoading,
    ...state,
    /** السوق مفعّل + مفتوح الآن → يُسمح بالنشر والتصفّح الحيّ. */
    isLive,
  };
}
