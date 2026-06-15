"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FLAG_METADATA,
  type FeatureFlagDoc,
  type FeatureFlagKey,
} from "@/lib/features/types";

/**
 * Hook موحَّد لقراءة feature flags.
 *
 * - يشترك مرة واحدة على collection (cache مشترك بين كل الـcomponents)
 * - يستخدم realtime (onSnapshot) لتفعيل/إيقاف فوري بدون إعادة تحميل
 * - يُرجِع `defaultEnabled` لو الـdoc غير موجود (آمن)
 *
 * الاستخدام:
 *   const walletEnabled = useFeatureFlag("wallet");
 *   if (!walletEnabled) return null;
 */

// ============================================================
// Singleton subscription (لتجنّب 10 listeners على نفس الـcollection)
// ============================================================
let cachedFlags: Map<string, boolean> | null = null;
let cachedDocs: Map<string, FeatureFlagDoc> = new Map();
let loaded = false;
let subscribers: Array<() => void> = [];
let unsubscribe: Unsubscribe | null = null;

function startSubscription() {
  if (unsubscribe) return;
  unsubscribe = onSnapshot(
    collection(db, "featureFlags"),
    (snap) => {
      cachedFlags = new Map();
      cachedDocs = new Map();
      snap.forEach((d) => {
        const data = d.data() as FeatureFlagDoc;
        cachedFlags!.set(d.id, data.enabled === true);
        cachedDocs.set(d.id, { ...data, key: d.id as any });
      });
      loaded = true;
      for (const sub of subscribers) sub();
    },
    (err) => {
      // eslint-disable-next-line no-console
      console.warn("[feature-flags] subscription error:", err?.code);
      // عند الفشل: نُعلِم المشتركين بالـdefaults
      cachedFlags = new Map();
      loaded = true;
      for (const sub of subscribers) sub();
    }
  );
}

function stopSubscriptionIfIdle() {
  if (subscribers.length === 0 && unsubscribe) {
    unsubscribe();
    unsubscribe = null;
    cachedFlags = null;
    cachedDocs = new Map();
    loaded = false;
  }
}

// ============================================================
// Public hook
// ============================================================

/**
 * يُرجِع true/false لـflag معيّن.
 *
 * @param key مفتاح الـflag (مثلاً "wallet")
 * @returns boolean - افتراضياً defaultEnabled من FLAG_METADATA لو غير موجود
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const sub = () => forceUpdate({});
    subscribers.push(sub);
    startSubscription();
    return () => {
      subscribers = subscribers.filter((s) => s !== sub);
      stopSubscriptionIfIdle();
    };
  }, []);

  if (!loaded || !cachedFlags) {
    // أثناء التحميل، نُرجِع defaultEnabled (آمن)
    return FLAG_METADATA[key]?.defaultEnabled === true;
  }

  if (cachedFlags.has(key)) {
    return cachedFlags.get(key)!;
  }
  // الـdoc غير موجود → افتراضي
  return FLAG_METADATA[key]?.defaultEnabled === true;
}

/**
 * يُرجِع كل الـflags مع وثائقها (للأدمن).
 */
export function useAllFeatureFlags(): {
  flags: Map<string, FeatureFlagDoc>;
  loaded: boolean;
} {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const sub = () => forceUpdate({});
    subscribers.push(sub);
    startSubscription();
    return () => {
      subscribers = subscribers.filter((s) => s !== sub);
      stopSubscriptionIfIdle();
    };
  }, []);

  return {
    flags: cachedDocs,
    loaded,
  };
}

/**
 * فحص synchronous (لـcontexts خارج React).
 * تنبيه: ترجِع false لو لم يبدأ الـsubscription بعد - استخدمي useFeatureFlag في الـcomponents.
 */
export function isFeatureEnabledSync(key: FeatureFlagKey): boolean {
  if (!loaded || !cachedFlags) return FLAG_METADATA[key]?.defaultEnabled === true;
  return cachedFlags.has(key)
    ? cachedFlags.get(key)!
    : FLAG_METADATA[key]?.defaultEnabled === true;
}
