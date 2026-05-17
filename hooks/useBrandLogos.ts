"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * يقرأ خرائط شعارات الماركات من Firestore (collection `brandLogos`).
 * المفتاح: brand id (مثل "toyota")، القيمة: رابط الشعار.
 *
 * يُستخدم في:
 * - BrandLogo (لتحديد ما يُعرض).
 * - BrowseByBrand (شبكة الماركات).
 *
 * يعمل بدون قواعد جديدة لأن brandLogos مفتوح للقراءة (public read).
 */
export function useBrandLogos(): Record<string, string> {
  const [logos, setLogos] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "brandLogos"),
      (snap) => {
        const map: Record<string, string> = {};
        snap.docs.forEach((d) => {
          const data = d.data() as { logoUrl?: string };
          if (data.logoUrl) {
            map[d.id] = data.logoUrl;
          }
        });
        setLogos(map);
      },
      () => {
        // تجاهل صامت - الـfallback في BrandLogo يكفي.
      }
    );
    return () => unsub();
  }, []);

  return logos;
}
