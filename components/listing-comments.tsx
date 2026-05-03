"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp,
} from "firebase/firestore";
import { Trash2, MessageSquare } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { timeAgo } from "@/lib/utils";

export default function ListingComments({ listingId }: { listingId: string }) {
  const { user, profile, isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "listings", listingId, "comments"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
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
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "listings", listingId, "comments"), {
        text: text.trim(),
        userId: user.uid,
        userName:
          profile?.name || user.displayName || user.email || user.phoneNumber || "مستخدم",
        userPhoto: profile?.photoURL || user.photoURL || "",
        createdAt: serverTimestamp(),
      });
      setText("");
      toast.success("تمت إضافة التعليق.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر إضافة التعليق.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    if (!user) return;
    if (user.uid !== userId && !isAdmin) return;
    const ok = await confirm({
      title: "حذف التعليق؟",
      message: "سيتم حذف التعليق نهائياً.",
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "listings", listingId, "comments", id));
      toast.success("تم حذف التعليق.");
    } catch (err: any) {
      toast.error(err?.message || "تعذّر حذف التعليق.");
    }
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center gap-2">
        <MessageSquare size={20} className="text-brand-700 dark:text-brand-300" />
        <h2 className="text-xl font-black dark:text-white">
          التعليقات ({comments.length})
        </h2>
      </div>

      {user ? (
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
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || !text.trim()}
            >
              {saving ? "جارٍ الإضافة..." : "إضافة تعليق"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          سجّل الدخول لإضافة تعليق على هذا الإعلان.
        </div>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-center text-slate-500">جارٍ تحميل التعليقات...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-slate-500">لا توجد تعليقات بعد.</div>
        ) : (
          comments.map((c) => {
            const canDelete = user?.uid === c.userId || isAdmin;
            return (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {c.userPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.userPhoto}
                        alt={c.userName}
                        referrerPolicy="no-referrer"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-700 text-sm font-black text-white">
                        {(c.userName || "ب").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-black dark:text-white">
                        {c.userName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {timeAgo(c.createdAt)}
                      </div>
                    </div>
                  </div>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c.id, c.userId)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30"
                      aria-label="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-800 dark:text-slate-100">
                  {c.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
