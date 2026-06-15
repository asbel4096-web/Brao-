"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { FileText } from "lucide-react";
import { db } from "@/lib/firebase";
import { MarkdownContent } from "@/components/cms/markdown-content";
import type { CmsPage } from "@/lib/cms/types";

/**
 * عرض صفحة CMS من الـpublic side (/p/[slug]).
 *
 * - يقرأ من cmsPages/{slug}
 * - يعرض فقط إذا published=true (المسوّدات لا تظهر للزوار)
 * - 404 لو الصفحة غير موجودة أو غير منشورة
 */

export default function PublicCmsPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [page, setPage] = useState<CmsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "cmsPages", slug));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data() as any;
        if (!data.published) {
          // مسوّدة - لا تظهر للزوار
          setNotFound(true);
          return;
        }
        setPage({ id: snap.id, ...data } as CmsPage);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  if (loading) {
    return (
      <section className="container py-10">
        <div className="mx-auto max-w-3xl space-y-3">
          <div className="h-10 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
          <div className="h-72 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        </div>
      </section>
    );
  }

  if (notFound || !page) {
    return (
      <section className="container py-16 text-center">
        <FileText
          size={48}
          className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
        />
        <h1 className="text-xl font-black text-slate-900 dark:text-white">
          الصفحة غير موجودة
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          ربما تم حذفها أو نقلها.
        </p>
      </section>
    );
  }

  return (
    <section className="container py-6 pb-20 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-5 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
          {page.title}
        </h1>
        <MarkdownContent markdown={page.contentMarkdown} />
      </article>
    </section>
  );
}
