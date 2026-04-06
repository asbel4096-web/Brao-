"use client";

import { FormEvent, useEffect, useState } from "react";
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function ListingComments({ listingId }: { listingId: string }) {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'listings', listingId, 'comments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [listingId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return alert('سجل الدخول أولًا لإضافة تعليق.');
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'listings', listingId, 'comments'), {
        text: text.trim(),
        userId: user.uid,
        userName: user.displayName || user.email || user.phoneNumber || 'مستخدم',
        userPhoto: user.photoURL || '',
        createdAt: serverTimestamp()
      });
      setText('');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, userId: string) => {
    const user = auth.currentUser;
    if (!user) return;
    if (user.uid !== userId && user.email !== 'asbel4096@gmail.com') return;
    await deleteDoc(doc(db, 'listings', listingId, 'comments', id));
  };

  return (
    <div className="card p-6">
      <h2 className="section-title !text-3xl">التعليقات</h2>
      <form onSubmit={handleAdd} className="mt-6 space-y-4">
        <textarea className="input min-h-[160px] resize-y" value={text} onChange={(e) => setText(e.target.value)} placeholder="اكتب تعليقك على الإعلان" />
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'جارٍ الإضافة...' : 'إضافة تعليق'}</button>
      </form>

      <div className="mt-8 space-y-4">
        {loading ? <div className="text-slate-500">جارٍ تحميل التعليقات...</div> : null}
        {!loading && !comments.length ? <div className="text-slate-500">لا توجد تعليقات بعد.</div> : null}
        {comments.map((comment) => (
          <div key={comment.id} className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-900/60">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {comment.userPhoto ? (
                  <img src={comment.userPhoto} alt={comment.userName} className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-lime-600 text-2xl font-black text-white">
                    {(comment.userName || 'ب').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-2xl font-black dark:text-white">{comment.userName}</div>
                  <div className="text-sm text-slate-500">{comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleString('ar-EG') : 'الآن'}</div>
                </div>
              </div>
              {(auth.currentUser?.uid === comment.userId || auth.currentUser?.email === 'asbel4096@gmail.com') ? (
                <button type="button" className="rounded-2xl border border-red-200 px-5 py-3 font-black text-red-600" onClick={() => handleDelete(comment.id, comment.userId)}>حذف</button>
              ) : null}
            </div>
            <p className="mt-5 text-xl leading-9 text-slate-800 dark:text-slate-100">{comment.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
