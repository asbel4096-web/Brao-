"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ref as storageRef, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  DEFAULT_HOMEPAGE_CONFIG,
  type HomepageBanner,
  type HomepageConfig,
} from "@/lib/cms/types";

/**
 * إدارة إعدادات الصفحة الرئيسية + البنرات.
 *
 * البنية:
 *   - homepageConfig/main → ترتيب الأقسام + featured listings IDs
 *   - homepageConfig/main/banners/{bannerId} → كل بنر وثيقة منفصلة (subcollection)
 *
 * هذا أفضل من array داخل main لأن:
 *   - كل بنر له URL صورة منفصل، الـorder/active قابل للتعديل دون كتابة كاملة
 *   - تجنّب race conditions عند تعديل بنرين متزامنين
 *
 * الصور تُرفع لـFirebase Storage (مسار: homepage/banners/{bannerId}/...)
 */

export function useHomepageConfig() {
  const { profile } = useAuth();
  const [config, setConfig] = useState<HomepageConfig>(DEFAULT_HOMEPAGE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "homepageConfig", "main"));
      if (snap.exists()) {
        setConfig({
          ...DEFAULT_HOMEPAGE_CONFIG,
          ...(snap.data() as any),
        });
      } else {
        // الـdoc غير موجود → الإعدادات الافتراضية
        setConfig(DEFAULT_HOMEPAGE_CONFIG);
      }
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[homepage-config] load:", err?.code);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(
    async (patch: Partial<HomepageConfig>) => {
      setSaving(true);
      try {
        const ref = doc(db, "homepageConfig", "main");
        await setDoc(
          ref,
          {
            ...config,
            ...patch,
            updatedAt: serverTimestamp(),
            updatedBy: profile?.email || "",
          },
          { merge: true }
        );
        setConfig((p) => ({ ...p, ...patch }));
      } finally {
        setSaving(false);
      }
    },
    [config, profile]
  );

  return { config, loading, saving, save, refresh: load };
}

/**
 * إدارة بنرات الصفحة الرئيسية.
 */
export function useBanners() {
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(
        query(
          collection(db, "homepageConfig", "main", "banners"),
          orderBy("order", "asc")
        )
      );
      setBanners(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as HomepageBanner[]
      );
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[banners] load:", err?.code);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addBanner = useCallback(
    async (data: Omit<HomepageBanner, "id" | "createdAt">) => {
      const colRef = collection(db, "homepageConfig", "main", "banners");
      await addDoc(colRef, {
        ...data,
        createdAt: serverTimestamp(),
      });
      await load();
    },
    [load]
  );

  const updateBanner = useCallback(
    async (id: string, patch: Partial<HomepageBanner>) => {
      const ref = doc(db, "homepageConfig", "main", "banners", id);
      await setDoc(ref, patch, { merge: true });
      await load();
    },
    [load]
  );

  const deleteBanner = useCallback(
    async (id: string, imageUrl?: string) => {
      // حذف الـdoc أولاً
      await deleteDoc(doc(db, "homepageConfig", "main", "banners", id));
      // ثم محاولة حذف الصورة من Storage (best-effort)
      if (imageUrl && imageUrl.includes("firebasestorage")) {
        try {
          // استخراج الـpath من الـURL: /o/{encodedPath}?...
          const match = imageUrl.match(/\/o\/([^?]+)/);
          if (match) {
            const path = decodeURIComponent(match[1]);
            await deleteObject(storageRef(storage, path));
          }
        } catch {
          /* تجاهل - الصورة قد تكون قُلدت أو محذوفة */
        }
      }
      await load();
    },
    [load]
  );

  return {
    banners,
    loading,
    addBanner,
    updateBanner,
    deleteBanner,
    refresh: load,
  };
}
