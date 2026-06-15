"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * useWalletEnabled
 *
 * نظام مستقل للتحكم بإظهار/إخفاء المحفظة على مستوى التطبيق كله.
 *
 * مصدر الحقيقة الوحيد:
 *   config/app  →  حقل walletEnabled (boolean)
 *
 * - لو الحقل غير موجود: الافتراضي true (المحفظة ظاهرة)
 * - الأدمن يتحكم به من /admin/wallet-settings
 * - realtime: أي تغيير ينعكس فوراً على كل المستخدمين
 *
 * الاستخدام:
 *   const { enabled, loading } = useWalletEnabled();
 *   if (!enabled) return null; // إخفاء زر المحفظة مثلاً
 */

const CONFIG_DOC = "config";
const CONFIG_ID = "app";

let cachedValue: boolean | null = null; // cache بسيط لتقليل الوميض

export function useWalletEnabled() {
  // نبدأ بالقيمة المخزّنة مؤقتاً (أو true) لتجنّب وميض الإخفاء
  const [enabled, setEnabled] = useState<boolean>(
    cachedValue !== null ? cachedValue : true
  );
  const [loading, setLoading] = useState<boolean>(cachedValue === null);

  useEffect(() => {
    const ref = doc(db, CONFIG_DOC, CONFIG_ID);

    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // الافتراضي true لو الحقل غير موجود
          const val = data?.walletEnabled !== false;
          cachedValue = val;
          setEnabled(val);
        } else {
          // الوثيقة غير موجودة → افتراضي ظاهر
          cachedValue = true;
          setEnabled(true);
        }
        setLoading(false);
      },
      () => {
        // خطأ قراءة → نُبقي المحفظة ظاهرة (fail-open للمستخدم العادي)
        setEnabled(true);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  return { enabled, loading };
}
