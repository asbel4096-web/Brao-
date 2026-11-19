"use client";

/**
 * مراجعة «منشورات المجتمع» — نظير شاشة التطبيق /admin/friday-posts:
 * تبويبات (قيد المراجعة/معتمد/مرفوض/مخفي/متوقف)، ونفس الانتقالات بين الحالات،
 * والرفض بسبب اختياري يُحفظ في rejectionReason ويراه صاحب المنشور.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, MessagesSquare } from "lucide-react";
import { AdminPermissionGate } from "@/components/admin/ui/admin-permission-gate";
import { useToast } from "@/contexts/ToastContext";
import { formatPrice, timeAgo } from "@/lib/utils";
import { Avatar } from "@/components/community/post-card";
import {
  type CommunityPost,
  type PostStatus,
  REVIEW_TABS,
  type ReviewAction,
  reviewActionsFor,
  setPostStatus,
  showsBudget,
  showsPrice,
  typeLabel,
  watchByStatus,
} from "@/lib/community/posts";

const TONE: Record<ReviewAction["tone"], { filled: string; outline: string }> = {
  green: { filled: "bg-emerald-600 text-white hover:bg-emerald-700", outline: "border border-emerald-200 text-emerald-700 hover:bg-emerald-50" },
  red: { filled: "bg-rose-600 text-white hover:bg-rose-700", outline: "border border-rose-200 text-rose-700 hover:bg-rose-50" },
  navy: { filled: "bg-slate-800 text-white", outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 dark:text-slate-200" },
  amber: { filled: "bg-amber-500 text-white", outline: "border border-amber-200 text-amber-700 hover:bg-amber-50" },
  blue: { filled: "bg-brand-700 text-white", outline: "border border-brand-200 text-brand-700 hover:bg-brand-50 dark:text-brand-300" },
};

function AdminCommunityPostsContent() {
  const toast = useToast();
  const [tab, setTab] = useState<PostStatus>("pending");
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<CommunityPost | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setPosts(null);
    setError(false);
    return watchByStatus(
      tab,
      (list) => setPosts(list),
      () => setError(true)
    );
  }, [tab]);

  const apply = async (p: CommunityPost, target: PostStatus, why?: string) => {
    setBusyId(p.id);
    try {
      await setPostStatus(p.id, target, why);
      toast.success("تم تحديث حالة المنشور");
    } catch {
      toast.error("تعذّر تنفيذ الإجراء");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
          <MessagesSquare size={20} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">منشورات المجتمع</h1>
          <p className="text-xs font-semibold text-slate-500">مراجعة منشورات الأعضاء — نفس قائمة التطبيق</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {REVIEW_TABS.map((t) => (
          <button
            key={t.status}
            type="button"
            onClick={() => setTab(t.status)}
            className={`rounded-2xl px-3 py-2 text-xs font-black transition ${
              tab === t.status ? "bg-brand-700 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:ring-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700">تعذّر تحميل المنشورات</p>
      ) : posts === null ? (
        <Loader2 className="mx-auto animate-spin text-slate-400" />
      ) : posts.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm font-bold text-slate-500 ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          لا توجد منشورات في هذا القسم
        </p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
              <div className="flex items-center gap-3">
                <Avatar name={p.authorName} url={p.authorPhotoUrl || undefined} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-slate-900 dark:text-white">{p.authorName || "عضو"}</p>
                  <p className="text-[11px] font-semibold text-slate-500">
                    {typeLabel(p.type)} · {timeAgo(p.submittedAt ?? p.createdAt ?? null)}
                    {p.city ? ` · ${p.city}` : ""}
                  </p>
                </div>
                <Link
                  href={`/friday-market/post/${p.id}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-1 text-xs font-black text-brand-700 hover:bg-brand-50 dark:text-brand-300"
                >
                  عرض <ExternalLink size={13} />
                </Link>
              </div>

              {p.title.trim() && <p className="mt-3 text-sm font-black text-slate-900 dark:text-white">{p.title}</p>}
              {p.text.trim() && (
                <p className="mt-1 line-clamp-4 whitespace-pre-line text-[13px] leading-6 text-slate-700 dark:text-slate-200">{p.text}</p>
              )}
              {(showsPrice(p.type) && p.price != null) || (showsBudget(p.type) && p.budget != null) ? (
                <p className="mt-1 text-xs font-black text-brand-700 dark:text-brand-300">
                  {showsPrice(p.type) && p.price != null ? formatPrice(p.price) : `الميزانية: ${formatPrice(p.budget)}`}
                </p>
              ) : null}
              {p.images.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {p.images.slice(0, 4).map((src) => (
                    <a key={src} href={src} target="_blank" rel="noopener noreferrer" className="block aspect-square overflow-hidden rounded-xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                    </a>
                  ))}
                </div>
              )}
              {p.rejectionReason && p.status === "rejected" && (
                <p className="mt-2 rounded-xl bg-rose-50 p-2 text-[12px] font-bold text-rose-700">سبب الرفض: {p.rejectionReason}</p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {reviewActionsFor(p.status).map((a) => (
                  <button
                    key={a.label}
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => {
                      if (a.reason) {
                        setReason("");
                        setRejecting(p);
                      } else void apply(p, a.target);
                    }}
                    className={`inline-flex h-9 items-center rounded-2xl px-3 text-xs font-black transition disabled:opacity-50 ${
                      a.filled ? TONE[a.tone].filled : TONE[a.tone].outline
                    }`}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      {rejecting && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={() => setRejecting(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-5 dark:bg-slate-900" onClick={(e) => e.stopPropagation()} dir="rtl">
            <h2 className="text-base font-black text-slate-900 dark:text-white">رفض المنشور</h2>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              rows={3}
              placeholder="سبب الرفض (اختياري) — يراه صاحب المنشور"
              className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setRejecting(null)} className="h-10 flex-1 rounded-2xl border border-slate-200 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200">
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = rejecting;
                  setRejecting(null);
                  void apply(p, "rejected", reason);
                }}
                className="h-10 flex-1 rounded-2xl bg-rose-600 text-sm font-black text-white"
              >
                رفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminCommunityPostsPage() {
  return (
    <AdminPermissionGate permission="listings.approve" label="مراجعة منشورات المجتمع">
      <AdminCommunityPostsContent />
    </AdminPermissionGate>
  );
}
