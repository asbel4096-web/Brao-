"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

type CommentItem = {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  createdAt?: any;
};

type Props = {
  listingId: string;
};

const ADMIN_EMAIL = "asbel4096@gmail.com";

export default function ListingComments({ listingId }: Props) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "listings", listingId, "comments"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rows: CommentItem[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<CommentItem, "id">)
        }));
        setComments(rows);
        setLoading(false);
      },
      (error) => {
        console.error("Comments load error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [listingId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert("يجب تسجيل الدخول أولًا لإضافة تعليق.");
      return;
    }

    if (!text.trim()) return;

    try {
      setSending(true);

      await addDoc(collection(db, "listings", listingId, "comments"), {
        text: text.trim(),
        userId: currentUser.uid,
        userName:
          currentUser.displayName ||
          currentUser.email ||
          currentUser.phoneNumber ||
          "مستخدم",
        userPhoto: currentUser.photoURL || "",
        createdAt: serverTimestamp()
      });

      setText("");
    } catch (error) {
      console.error("Add comment error:", error);
      alert("حدث خطأ أثناء إضافة التعليق.");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (comment: CommentItem) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const isOwner = currentUser.uid === comment.userId;
    const isAdmin = (currentUser.email || "") === ADMIN_EMAIL;

    if (!isOwner && !isAdmin) return;

    try {
      await deleteDoc(doc(db, "listings", listingId, "comments", comment.id));
    } catch (error) {
      console.error("Delete comment error:", error);
      alert("تعذر حذف التعليق.");
    }
  };

  return (
    <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-2xl font-black text-slate-900">التعليقات</h3>

      <form onSubmit={handleSubmit} className="mb-6 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="اكتب تعليقك على الإعلان"
          className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-2xl bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-60"
        >
          {sending ? "جارٍ الإرسال..." : "إضافة تعليق"}
        </button>
      </form>

      {loading ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">
          جارٍ تحميل التعليقات...
        </div>
      ) : comments.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-slate-500">
          لا توجد تعليقات بعد.
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => {
            const currentUser = auth.currentUser;
            const isOwner = currentUser?.uid === comment.userId;
            const isAdmin = (currentUser?.email || "") === ADMIN_EMAIL;
            const canDelete = isOwner || isAdmin;

            return (
              <div
                key={comment.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {comment.userPhoto ? (
                      <img
                        src={comment.userPhoto}
                        alt={comment.userName}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-lg font-black text-white">
                        {(comment.userName || "م").charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <div className="font-bold text-slate-900">
                        {comment.userName}
                      </div>
                      <div className="text-sm text-slate-500">
                        {comment.createdAt?.toDate
                          ? comment.createdAt.toDate().toLocaleString("ar-EG")
                          : "الآن"}
                      </div>
                    </div>
                  </div>

                  {canDelete ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(comment)}
                      className="rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-bold text-red-600"
                    >
                      حذف
                    </button>
                  ) : null}
                </div>

                <p className="whitespace-pre-wrap text-slate-700">
                  {comment.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
