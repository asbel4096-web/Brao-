"use client";

import { useCallback, useEffect, useState } from "react";
import {
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
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import type { CmsPage } from "@/lib/cms/types";

/**
 * إدارة صفحات CMS.
 *
 * - listPages(): قائمة كل الصفحات (للقائمة)
 * - getPage(slug): صفحة واحدة بكامل المحتوى
 * - savePage(slug, data): إنشاء أو تحديث
 * - deletePage(slug): حذف
 *
 * كل العمليات تستخدم Firestore client SDK مباشرة (لا API route)
 * لأن القواعد تسمح للأدمن بالكتابة. السبب: محتوى CMS لا يحتاج
 * server-side validation معقّدة.
 */

export function useCmsPages() {
  const { profile } = useAuth();
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await getDocs(
        query(collection(db, "cmsPages"), orderBy("title"))
      );
      setPages(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as CmsPage[]
      );
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("[cms] list error:", err?.code);
      setError(err?.message || "فشل التحميل");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const savePage = useCallback(
    async (
      slug: string,
      data: { title: string; contentMarkdown: string; published: boolean }
    ) => {
      const ref = doc(db, "cmsPages", slug);
      const existing = await getDoc(ref);
      const isNew = !existing.exists();
      await setDoc(
        ref,
        {
          ...data,
          slug,
          updatedAt: serverTimestamp(),
          updatedBy: profile?.email || "",
          updatedByEmail: profile?.email || "",
          ...(isNew && { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      await refresh();
    },
    [profile, refresh]
  );

  const deletePage = useCallback(
    async (slug: string) => {
      await deleteDoc(doc(db, "cmsPages", slug));
      await refresh();
    },
    [refresh]
  );

  return {
    pages,
    loading,
    error,
    refresh,
    savePage,
    deletePage,
  };
}

/**
 * Hook لجلب صفحة واحدة (للمحرّر).
 */
export function useCmsPage(slug: string | null) {
  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "cmsPages", slug));
        if (!snap.exists()) {
          setNotFound(true);
          setPage(null);
        } else {
          setPage({ id: snap.id, ...(snap.data() as any) } as CmsPage);
        }
      } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error("[cms] get error:", err?.code);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  return { page, loading, notFound };
}
