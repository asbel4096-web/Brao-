"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Plus,
  Eye,
  EyeOff,
  Edit3,
  Trash2,
  X,
  ExternalLink,
} from "lucide-react";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useCmsPages } from "@/hooks/admin/use-cms-pages";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { KNOWN_PAGE_SLUGS } from "@/lib/cms/types";

/**
 * قائمة صفحات CMS + إنشاء صفحة جديدة.
 */

export default function CmsPagesListPage() {
  const { can } = useAdminRole();
  const { pages, loading, savePage, deletePage } = useCmsPages();
  const toast = useToast();
  const confirm = useConfirm();
  const [newSlugDialog, setNewSlugDialog] = useState(false);

  if (!can("content.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة المحتوى.
      </div>
    );
  }

  const existingSlugs = new Set(pages.map((p) => p.slug));
  const suggestedToCreate = KNOWN_PAGE_SLUGS.filter(
    (s) => !existingSlugs.has(s.slug)
  );

  const handleDelete = async (slug: string, title: string) => {
    const ok = await confirm({
      title: "حذف الصفحة؟",
      message: `سيختفي محتوى "${title}" نهائياً من الموقع. لا يمكن التراجع.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deletePage(slug);
      toast.success("تم الحذف");
    } catch (err: any) {
      toast.error(err?.message || "فشل الحذف");
    }
  };

  const handleCreate = async (slug: string, title: string) => {
    if (!slug.match(/^[a-z0-9-]+$/)) {
      toast.warning("الـslug يجب أن يحوي حروف إنجليزية صغيرة وأرقام و - فقط");
      return;
    }
    if (existingSlugs.has(slug)) {
      toast.warning("هذا الـslug موجود بالفعل");
      return;
    }
    try {
      await savePage(slug, {
        title,
        contentMarkdown: `# ${title}\n\nاكتبي محتوى الصفحة هنا...`,
        published: false,
      });
      toast.success("تم إنشاء الصفحة");
      setNewSlugDialog(false);
    } catch (err: any) {
      toast.error(err?.message || "فشل الإنشاء");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            <FileText size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
              صفحات الموقع
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
              إدارة الصفحات النصية (سياسة الخصوصية، الشروط، الأسئلة، ...).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNewSlugDialog(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-action-500 px-3 text-xs font-black text-white shadow-sm transition hover:bg-action-600 active:scale-95"
        >
          <Plus size={14} />
          صفحة جديدة
        </button>
      </header>

      {/* Suggested templates */}
      {suggestedToCreate.length > 0 && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/50">
          <h2 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            قوالب مقترحة (لم تُنشأ بعد)
          </h2>
          <div className="flex flex-wrap gap-2">
            {suggestedToCreate.map((s) => (
              <button
                key={s.slug}
                type="button"
                onClick={() => handleCreate(s.slug, s.title)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              >
                <Plus size={11} />
                {s.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Pages list */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <FileText
            size={36}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            لا توجد صفحات بعد
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            ابدئي بإحدى القوالب المقترحة أعلاه.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((p) => (
            <article
              key={p.id}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
            >
              <Link
                href={`/admin/content/pages/${p.slug}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    p.published
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                  }`}
                >
                  {p.published ? <Eye size={16} /> : <EyeOff size={16} />}
                </div>
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-black text-slate-900 dark:text-white">
                    {p.title}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono" dir="ltr">
                      /{p.slug}
                    </span>
                    {!p.published && (
                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        مسوّدة
                      </span>
                    )}
                  </div>
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-1">
                {p.published && (
                  <Link
                    href={`/p/${p.slug}`}
                    target="_blank"
                    rel="noopener"
                    aria-label="فتح في الموقع"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800"
                  >
                    <ExternalLink size={14} />
                  </Link>
                )}
                <Link
                  href={`/admin/content/pages/${p.slug}`}
                  aria-label="تحرير"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-brand-700 dark:hover:bg-slate-800"
                >
                  <Edit3 size={14} />
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(p.slug, p.title)}
                  aria-label="حذف"
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* New slug dialog */}
      {newSlugDialog && (
        <NewSlugDialog
          onClose={() => setNewSlugDialog(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  );
}

function NewSlugDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (slug: string, title: string) => void;
}) {
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              صفحة جديدة
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              ستظهر على الموقع في /p/[slug]
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={14} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              عنوان الصفحة
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً: شروط الاستخدام"
              maxLength={100}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              Slug (في الرابط)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="terms-2024"
              maxLength={50}
              dir="ltr"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-mono outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
            />
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              حروف إنجليزية صغيرة، أرقام، شُرَط فقط (مثل: terms-2024)
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={() => onCreate(slug, title)}
            disabled={!slug || !title}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-action-500 px-4 text-xs font-black text-white shadow-sm transition hover:bg-action-600 active:scale-95 disabled:opacity-50"
          >
            <Plus size={14} />
            إنشاء
          </button>
        </div>
      </div>
    </>
  );
}
