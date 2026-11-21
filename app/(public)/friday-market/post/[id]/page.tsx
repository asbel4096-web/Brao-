"use client";

/**
 * تفاصيل منشور في «منشورات المجتمع» — نظير FridayPostDetailScreen في التطبيق:
 * المنشور لحظياً من `posts/{id}`، +1 مشاهدة عند الفتح (للمسجّل)، والتعليقات من
 * `posts/{id}/comments` الأحدث أولاً (20 لكل صفحة) مع إضافة تعليق.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Loader2, Send } from "lucide-react";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { timeAgo } from "@/lib/utils";
import { Avatar, PostCard } from "@/components/community/post-card";
import {
  addComment,
  bumpViews,
  type CommunityPost,
  fetchCommentsPage,
  MAX_COMMENT,
  type PostComment,
  watchPost,
} from "@/lib/community/posts";

export default function CommunityPostDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const { user, profile } = useAuth();
  const toast = useToast();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [comments, setComments] = useState<PostComment[]>([]);
  const [last, setLast] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [more, setMore] = useState(false);
  const [loadingComments, setLoadingComments] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const viewed = useRef(false);

  useEffect(() => {
    if (!id) return;
    return watchPost(
      id,
      (p) => {
        setPost(p);
        setState(p ? "ok" : "missing");
      },
      () => setState("missing") // غير معتمد ولا يخصّك = غير متاح
    );
  }, [id]);

  // +1 مشاهدة مرة واحدة لكل فتح (القاعدة تشترط مستخدماً مسجّلاً).
  useEffect(() => {
    if (user && state === "ok" && !viewed.current) {
      viewed.current = true;
      void bumpViews(id);
    }
  }, [user, state, id]);

  const loadComments = useCallback(
    async (after: QueryDocumentSnapshot<DocumentData> | null) => {
      setLoadingComments(true);
      try {
        const r = await fetchCommentsPage(id, after);
        setComments((prev) => {
          const base = after ? prev : [];
          const seen = new Set(base.map((c) => c.id));
          return [...base, ...r.comments.filter((c) => !seen.has(c.id))];
        });
        setLast(r.last);
        setMore(!!r.last && r.comments.length > 0);
      } catch {
        setMore(false);
      } finally {
        setLoadingComments(false);
      }
    },
    [id]
  );

  useEffect(() => {
    if (state === "ok") void loadComments(null);
    // التعليقات تُحمَّل مرة واحدة عند ظهور المنشور.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === "ok", loadComments]);

  const send = async () => {
    const text = draft.trim();
    if (!user || !text || sending) return;
    setSending(true);
    try {
      const cid = await addComment({
        postId: id,
        userId: user.uid,
        userName: profile?.name || "",
        userPhotoURL: profile?.photoURL || "",
        text,
      });
      setComments((prev) => [
        { id: cid, userId: user.uid, userName: profile?.name || "", userPhotoURL: profile?.photoURL || "", text, createdAt: null },
        ...prev,
      ]);
      setDraft("");
    } catch {
      toast.error("تعذّر إرسال التعليق");
    } finally {
      setSending(false);
    }
  };

  if (state === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center" dir="rtl">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (state === "missing" || !post) {
    return (
      <div className="container flex min-h-[60vh] flex-col items-center justify-center text-center" dir="rtl">
        <div className="text-4xl">🔍</div>
        <h1 className="mt-3 text-lg font-black text-slate-800 dark:text-slate-100">المنشور غير متاح</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">ربما حُذف أو ما زال قيد المراجعة.</p>
        <Link href="/friday-market" className="mt-5 rounded-full bg-brand-700 px-6 py-2.5 text-sm font-bold text-white">
          منشورات المجتمع
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-24" dir="rtl">
      <section className="container mx-auto max-w-2xl space-y-4 pt-4">
        <Link href="/friday-market" className="inline-flex items-center gap-1 text-sm font-black text-slate-600 dark:text-slate-300">
          <ArrowRight size={16} />
          منشورات المجتمع
        </Link>

        {post.moderation?.state ? (
          // 2026-11-21: قرار «إدارة المحتوى» مع السبب (لا يراه إلا صاحبه والإدارة).
          <div
            className={`rounded-2xl border p-3 text-xs font-bold leading-6 ${
              post.moderation.state === "removed"
                ? "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-200"
                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"
            }`}
          >
            <p className="font-black">
              {post.moderation.state === "removed"
                ? "حذفت الإدارة هذا المنشور، ولا يظهر لأحد غيرك."
                : "أوقفت الإدارة هذا المنشور مؤقتاً، ولا يظهر للعامة حتى تستأنفه."}
            </p>
            <p>
              السبب: {post.moderation.reason || "مخالفة شروط الاستخدام"}
              {post.moderation.note ? ` — ${post.moderation.note}` : ""}
            </p>
            <Link href={`/moderation/post/${post.id}`} className="font-black underline underline-offset-2">
              تفاصيل القرار والتواصل مع الدعم
            </Link>
          </div>
        ) : (
          post.status !== "approved" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              {post.status === "pending"
                ? "منشورك قيد المراجعة، ولا يراه غيرك حتى يُعتمد."
                : post.status === "rejected"
                  ? `لم يُعتمد هذا المنشور${post.rejectionReason ? `: ${post.rejectionReason}` : "."}`
                  : "هذا المنشور غير ظاهر للعامة حالياً."}
            </div>
          )
        )}

        <PostCard post={post} inDetail />

        {/* التعليقات */}
        <div id="comments" className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
          <h2 className="text-sm font-black text-slate-900 dark:text-white">التعليقات</h2>

          {user ? (
            <div className="mt-3 flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, MAX_COMMENT))}
                placeholder="اكتب تعليقاً…"
                rows={2}
                className="min-h-[44px] flex-1 resize-y rounded-2xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!draft.trim() || sending}
                aria-label="إرسال التعليق"
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-white disabled:bg-slate-300 dark:disabled:bg-slate-700"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/friday-market/post/${id}`)}`}
              className="mt-3 block rounded-2xl bg-slate-50 p-3 text-center text-sm font-bold text-brand-700 dark:bg-slate-800 dark:text-brand-300"
            >
              سجّل الدخول لتعلّق
            </Link>
          )}

          <ul className="mt-4 space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="flex gap-2.5">
                <Avatar name={c.userName} url={c.userPhotoURL || undefined} size={34} />
                <div className="min-w-0 flex-1 rounded-2xl bg-slate-50 px-3 py-2 dark:bg-slate-800">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-black text-slate-900 dark:text-white">{c.userName || "عضو"}</span>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">{timeAgo(c.createdAt ?? null)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-[13px] leading-6 text-slate-700 dark:text-slate-200">{c.text}</p>
                </div>
              </li>
            ))}
          </ul>
          {loadingComments && <Loader2 className="mx-auto mt-3 animate-spin text-slate-400" size={18} />}
          {!loadingComments && comments.length === 0 && (
            <p className="mt-2 text-center text-xs font-bold text-slate-400">لا توجد تعليقات بعد — كن أول من يعلّق</p>
          )}
          {!loadingComments && more && (
            <button
              type="button"
              onClick={() => void loadComments(last)}
              className="mt-3 w-full rounded-2xl bg-slate-50 py-2 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              عرض المزيد من التعليقات
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
