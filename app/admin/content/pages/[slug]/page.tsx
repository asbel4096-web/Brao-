"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Save,
  Eye,
  EyeOff,
  FileText,
  ExternalLink,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useCmsPage, useCmsPages } from "@/hooks/admin/use-cms-pages";
import { useToast } from "@/contexts/ToastContext";
import { MarkdownContent } from "@/components/cms/markdown-content";

/**
 * محرّر صفحة CMS - split view (Markdown على اليمين، معاينة على اليسار).
 *
 * UX:
 *  - dirty state: نُعلّم التغييرات غير المحفوظة
 *  - زر "حفظ" يبقى مُعطَّلاً حتى يوجد تغيير فعلي
 *  - منع المغادرة المفاجئة مع تغييرات (browser confirm)
 *  - زر "نشر/مسوّدة" toggle منفصل
 */

export default function CmsPageEditorPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;

  const { can } = useAdminRole();
  const { page, loading, notFound } = useCmsPage(slug);
  const { savePage } = useCmsPages();
  const toast = useToast();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // hydrate state من الصفحة المحمَّلة
  useEffect(() => {
    if (page && !hydrated) {
      setTitle(page.title || "");
      setContent(page.contentMarkdown || "");
      setPublished(page.published === true);
      setHydrated(true);
    }
  }, [page, hydrated]);

  // dirty check
  const isDirty =
    page !== null &&
    (title !== page.title ||
      content !== page.contentMarkdown ||
      published !== page.published);

  // browser warning عند المغادرة مع تغييرات
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  if (!can("content.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة المحتوى.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  if (notFound || !slug) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <FileText size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
        <p className="text-sm font-black text-slate-700 dark:text-slate-200">
          الصفحة غير موجودة
        </p>
        <Link
          href="/admin/content/pages"
          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:underline dark:text-brand-300"
        >
          العودة للقائمة
          <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast.warning("اكتبي عنواناً للصفحة");
      return;
    }
    setSaving(true);
    try {
      await savePage(slug, {
        title: title.trim(),
        contentMarkdown: content,
        published,
      });
      toast.success("تم الحفظ");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <Link
          href="/admin/content/pages"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-700 dark:text-slate-400 dark:hover:text-brand-300"
        >
          <ArrowRight size={12} />
          العودة للقائمة
        </Link>
        <div className="flex items-center gap-2">
          {published && (
            <Link
              href={`/p/${slug}`}
              target="_blank"
              rel="noopener"
              className="inline-flex h-9 items-center gap-1 rounded-xl border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:border-brand-300 dark:border-slate-700 dark:text-slate-300"
            >
              <ExternalLink size={12} />
              معاينة حية
            </Link>
          )}
          <button
            type="button"
            onClick={() => setPublished((p) => !p)}
            className={`inline-flex h-9 items-center gap-1 rounded-xl px-3 text-[11px] font-black transition ${
              published
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            }`}
          >
            {published ? <Eye size={12} /> : <EyeOff size={12} />}
            {published ? "منشورة" : "مسوّدة"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || saving}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-action-500 px-4 text-xs font-black text-white shadow-sm transition hover:bg-action-600 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                حفظ...
              </>
            ) : (
              <>
                <Save size={12} />
                حفظ
                {isDirty && <span className="-mr-1 h-1.5 w-1.5 rounded-full bg-white" />}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="عنوان الصفحة"
        maxLength={100}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-black text-slate-900 outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />

      <p className="px-1 text-[10px] text-slate-400 dark:text-slate-500">
        slug: <span className="font-mono" dir="ltr">/{slug}</span>
      </p>

      {/* Toggle preview */}
      <button
        type="button"
        onClick={() => setShowPreview((p) => !p)}
        className="text-[11px] font-bold text-brand-700 hover:underline dark:text-brand-300 sm:hidden"
      >
        {showPreview ? "إخفاء المعاينة" : "إظهار المعاينة"}
      </button>

      {/* Split editor */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Editor */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Markdown
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="# عنوان&#10;&#10;الفقرة الأولى...&#10;&#10;## قسم فرعي&#10;&#10;- نقطة 1&#10;- نقطة 2"
            rows={20}
            className="w-full resize-none rounded-b-2xl bg-transparent p-3 font-mono text-[13px] leading-6 outline-none"
          />
        </div>

        {/* Preview */}
        <div className={`rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${showPreview ? "block" : "hidden sm:block"}`}>
          <div className="border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
            معاينة
          </div>
          <div className="p-4 sm:p-5">
            {title && (
              <h1 className="mb-3 text-2xl font-black text-slate-900 dark:text-white">
                {title}
              </h1>
            )}
            {content ? (
              <MarkdownContent markdown={content} />
            ) : (
              <p className="text-sm italic text-slate-400">المعاينة فارغة</p>
            )}
          </div>
        </div>
      </div>

      {/* Markdown cheatsheet */}
      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] dark:border-slate-800 dark:bg-slate-900/50">
        <summary className="cursor-pointer font-black text-slate-700 dark:text-slate-300">
          الـMarkdown المدعوم
        </summary>
        <ul className="mt-2 space-y-1 ps-4 text-slate-600 dark:text-slate-400">
          <li><code className="font-mono"># عنوان</code> — عنوان رئيسي</li>
          <li><code className="font-mono">## عنوان فرعي</code></li>
          <li><code className="font-mono">**نص عريض**</code></li>
          <li><code className="font-mono">*نص مائل*</code></li>
          <li><code className="font-mono">[نص الرابط](https://example.com)</code></li>
          <li><code className="font-mono">- نقطة في قائمة</code></li>
          <li><code className="font-mono">1. عنصر مرقَّم</code></li>
        </ul>
      </details>
    </div>
  );
}
