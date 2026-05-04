"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { Flag, MessageSquare, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { timeAgo } from "@/lib/utils";
import type { Listing } from "@/lib/types";

interface ListingCommentsProps {
  listingId: string;
  commentsEnabled?: boolean;
  ownerId?: string;
}

interface ListingCommentItem {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt?: any;
}

export default function ListingComments({
  listingId,
  commentsEnabled = true,
  ownerId,
}: ListingCommentsProps) {
  const { user, profile, isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = useState<ListingCommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "listings", listingId, "comments"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ListingCommentItem) })));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [listingId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.warning("سجّل الدخول أولاً لإضافة تعليق.");
      return;
    }
    if (!commentsEnabled) {
      toast.info("التعليقات مغلقة لهذا الإعلان.");
      return;
    }
    if (!text.trim()) return;

    setSaving(true);
    try {
      const listingRef = doc(db, "listings", listingId);
      const commentsRef = collection(db, "listings", listingId, "comments");

      await runTransaction(db, async (tx) => {
        tx.set(doc(commentsRef), {
          text: text.trim(),
          userId: user.uid,
          userName: profile?.businessName || profile?.name || user.displayName || user.email || user.phoneNumber || "مستخدم",
          userPhoto: profile?.photoURL || user.photoURL || "",
          ownerId: ownerId || "",
          createdAt: serverTimestamp(),
        });
        tx.update(listingRef, { commentsCount: increment(1) });
      });

      setText("");
      toast.success("تمت إضافة التعليق.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إضافة التعليق.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (commentId: string, commentOwnerId: string) => {
    if (!user) return;
    if (user.uid !== commentOwnerId && !isAdmin && user.uid !== ownerId) return;

    const ok = await confirm({
      title: "حذف التعليق؟",
      message: "سيتم حذف التعليق نهائياً.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;

    try {
      await runTransaction(db, async (tx) => {
        tx.delete(doc(db, "listings", listingId, "comments", commentId));
        tx.update(doc(db, "listings", listingId), { commentsCount: increment(-1) });
      });
      toast.success("تم حذف التعليق.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر حذف التعليق.");
    }
  };

  const handleReport = async (comment: ListingCommentItem) => {
    if (!user) {
      toast.info("سجّل الدخول أولاً للإبلاغ عن التعليق.");
      return;
    }
    try {
      const reportId = `${comment.id}_${user.uid}`;
      await setDoc(doc(db, "commentReports", reportId), {
        commentId: comment.id,
        listingId,
        commentOwnerId: comment.userId,
        reportedBy: user.uid,
        reportedAt: serverTimestamp(),
        text: comment.text,
      });
      toast.success("تم إرسال البلاغ إلى الإدارة.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إرسال البلاغ.");
    }
  };

  const userCanComment = !!user && commentsEnabled;

  return (
    <div id="comments" className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <MessageSquare size={20} className="text-brand-700 dark:text-brand-300" />
        <h2 className="text-xl font-black dark:text-white">التعليقات ({comments.length})</h2>
      </div>

      {!commentsEnabled ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-sm font-bold text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
          التعليقات مغلقة لهذا الإعلان من قبل التاجر أو الإدارة.
        </div>
      ) : null}

      {userCanComment ? (
        <form onSubmit={handleAdd} className="mt-4 space-y-3">
          <textarea
            className="input min-h-[100px] resize-y"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="اكتب تعليقك..."
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">{text.length}/500</span>
            <button type="submit" className="btn-primary" disabled={saving || !text.trim()}>
              {saving ? "جارٍ الإضافة..." : "إضافة تعليق"}
            </button>
          </div>
        </form>
      ) : !user ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          سجّل الدخول لإضافة تعليق على هذا الإعلان.
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-center text-slate-500">جارٍ تحميل التعليقات...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-slate-500">لا توجد تعليقات بعد.</div>
        ) : (
          comments.map((comment) => {
            const canDelete = user?.uid === comment.userId || isAdmin || user?.uid === ownerId;
            return (
              <div key={comment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {comment.userPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={comment.userPhoto} alt={comment.userName} referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-black text-white">
                        {(comment.userName || "ب").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-black dark:text-white">{comment.userName}</div>
                      <div className="text-xs text-slate-500">{timeAgo(comment.createdAt)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void handleReport(comment)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-amber-600 dark:hover:bg-slate-700"
                      aria-label="إبلاغ"
                    >
                      <Flag size={15} />
                    </button>
                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(comment.id, comment.userId)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                        aria-label="حذف"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-800 dark:text-slate-100">{comment.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
