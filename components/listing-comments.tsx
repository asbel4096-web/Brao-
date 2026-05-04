"use client";

import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";
import { AlertTriangle, MessageCircle, Send, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { ListingComment } from "@/lib/types";

type Props = {
  listingId: string;
  ownerId: string;
  commentsEnabled?: boolean;
};

export default function ListingComments({
  listingId,
  ownerId,
  commentsEnabled = true,
}: Props) {
  const { user, profile } = useAuth();
  const toast = useToast();

  const [comments, setComments] = useState<ListingComment[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "listings", listingId, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const nextComments = snap.docs.map((d) => {
          const data = d.data() as Omit<ListingComment, "id">;
          return {
            ...data,
            id: d.id,
          } as ListingComment;
        });

        setComments(nextComments);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [listingId]);

  const canPost = useMemo(() => {
    return Boolean(user && text.trim().length >= 2 && commentsEnabled && !sending);
  }, [user, text, commentsEnabled, sending]);

  const handleSubmit = async () => {
    const value = text.trim();

    if (!user) {
      toast.warning("سجّل الدخول أولًا لإضافة تعليق.");
      return;
    }

    if (!commentsEnabled) {
      toast.warning("التعليقات مغلقة لهذا الإعلان.");
      return;
    }

    if (value.length < 2) {
      toast.warning("اكتب تعليقًا واضحًا.");
      return;
    }

    try {
      setSending(true);

      await addDoc(collection(db, "listings", listingId, "comments"), {
        userId: user.uid,
        userName:
          profile?.businessName ||
          profile?.name ||
          user.displayName ||
          user.email ||
          "مستخدم",
        userPhotoURL: profile?.photoURL || user.photoURL || "",
        text: value,
        createdAt: serverTimestamp(),
        reported: false,
        reportedCount: 0,
      });

      await updateDoc(doc(db, "listings", listingId), {
        commentsCount: increment(1),
      });

      setText("");
      toast.success("تمت إضافة التعليق.");
    } catch (error: any) {
      toast.error(error?.message || "تعذّر إضافة التعليق.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (comment: ListingComment) => {
    if (!user) return;

    const isOwner = comment.userId === user.uid;
    const isAdmin = profile?.role === "admin";
    const isListingOwner = ownerId === user.uid;

    if (!isOwner && !isAdmin && !isListingOwner) {
      toast.warning("ليس لديك صلاحية حذف هذا التعليق.");
      return;
    }

    try {
      setBusyId(comment.id);

      await deleteDoc(doc(db, "listings", listingId, "comments", comment.id));
      await updateDoc(doc(db, "listings", listingId), {
        commentsCount: increment(-1),
      });

      toast.success("تم حذف التعليق.");
    } catch (error: any) {
      toast.error(error?.message || "تعذّر حذف التعليق.");
    } finally {
      setBusyId(null);
    }
  };

  const handleReport = async (comment: ListingComment) => {
    if (!user) {
      toast.warning("سجّل الدخول أولًا للتبليغ.");
      return;
    }

    if (comment.userId === user.uid) {
      toast.warning("لا يمكنك التبليغ عن تعليقك.");
      return;
    }

    try {
      setBusyId(comment.id);

      await updateDoc(doc(db, "listings", listingId, "comments", comment.id), {
        reported: true,
        reportedCount: increment(1),
        lastReportedAt: serverTimestamp(),
      });

      toast.success("تم إرسال البلاغ.");
    } catch (error: any) {
      toast.error(error?.message || "تعذّر إرسال البلاغ.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-brand-700 dark:text-brand-300" />
        <h3 className="text-base font-black dark:text-white">
          التعليقات ({comments.length})
        </h3>
      </div>

      {!commentsEnabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
          التعليقات مغلقة لهذا الإعلان.
        </div>
      ) : (
        <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={user ? "اكتب تعليقك هنا..." : "سجّل الدخول حتى تتمكن من التعليق"}
            disabled={!user || sending}
            rows={3}
            className="w-full resize-none rounded-2xl border border-transparent bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-400 dark:bg-slate-900"
          />
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              كن محترمًا في التعليقات.
            </span>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canPost}
              className="btn-action disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {sending ? "جارٍ الإرسال..." : "إضافة تعليق"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
          لا توجد تعليقات بعد.
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => {
            const isOwner = user?.uid === comment.userId;
            const isAdmin = profile?.role === "admin";
            const isListingOwner = user?.uid === ownerId;
            const canDelete = Boolean(isOwner || isAdmin || isListingOwner);
            const isBusy = busyId === comment.id;

            return (
              <div
                key={comment.id}
                className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    {comment.userPhotoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={comment.userPhotoURL}
                        alt={comment.userName}
                        className="h-10 w-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 font-black text-white">
                        {(comment.userName || "م").charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {comment.userName}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-200">
                        {comment.text}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isOwner ? (
                      <button
                        type="button"
                        onClick={() => void handleReport(comment)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-amber-300 hover:text-amber-700 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300"
                      >
                        <AlertTriangle size={14} />
                        تبليغ
                      </button>
                    ) : null}

                    {canDelete ? (
                      <button
                        type="button"
                        onClick={() => void handleDelete(comment)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-rose-600 transition hover:border-rose-300 disabled:opacity-60 dark:border-slate-700"
                      >
                        <Trash2 size={14} />
                        حذف
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
