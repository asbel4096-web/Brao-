"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Filter, ShieldAlert } from "lucide-react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import type { BannedWord } from "@/lib/moderation/banned-words";

/**
 * صفحة إدارة الكلمات المحظورة.
 *
 * - قائمة كلمات realtime (subscribe على collection)
 * - نموذج إضافة كلمة + اختيار severity (block/warn)
 * - حذف كلمة من القائمة
 *
 * الصلاحية: content.edit
 */

export default function BannedWordsPage() {
  const { can } = useAdminRole();
  const toast = useToast();
  const confirm = useConfirm();

  const [words, setWords] = useState<BannedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [severity, setSeverity] = useState<"block" | "warn">("block");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!can("content.edit")) return;
    const q = query(
      collection(db, "bannedWords"),
      orderBy("addedAt", "desc")
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setWords(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))
        );
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[banned-words] err:", err?.code);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [can]);

  if (!can("content.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة الكلمات المحظورة.
      </div>
    );
  }

  const handleAdd = async () => {
    const word = newWord.trim();
    if (!word || word.length < 2) {
      toast.warning("اكتبي كلمة (حرفان على الأقل)");
      return;
    }
    setAdding(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/admin/banned-words", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ word, severity }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشلت الإضافة");
        return;
      }
      setNewWord("");
      toast.success("تمت الإضافة");
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string, word: string) => {
    const ok = await confirm({
      title: "حذف الكلمة؟",
      message: `سيُسمح بنشر الكلمة "${word}" مجدداً.`,
      confirmLabel: "حذف",
      tone: "danger",
    });
    if (!ok) return;
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/admin/banned-words/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${idToken || ""}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل الحذف");
        return;
      }
      toast.success("تم الحذف");
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    }
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
          <Filter size={20} strokeWidth={2.2} />
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">
            الكلمات المحظورة
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 sm:text-sm">
            تُمنع هذه الكلمات تلقائياً في التعليقات والإعلانات.
          </p>
        </div>
      </header>

      {/* Add form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <p className="mb-2 text-xs font-black text-slate-700 dark:text-slate-300">
          إضافة كلمة جديدة
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !adding && handleAdd()}
            disabled={adding}
            placeholder="اكتبي الكلمة هنا..."
            maxLength={80}
            className="h-10 flex-1 rounded-2xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-rose-400 dark:border-slate-700 dark:bg-slate-900 disabled:opacity-60"
          />
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
            disabled={adding}
            className="h-10 rounded-2xl border border-slate-200 bg-white px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="block">منع تام (block)</option>
            <option value="warn">تحذير فقط (warn)</option>
          </select>
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding || !newWord.trim()}
            className="inline-flex h-10 items-center gap-1.5 rounded-2xl bg-rose-600 px-4 text-xs font-black text-white transition hover:bg-rose-700 active:scale-95 disabled:opacity-60"
          >
            {adding ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              <>
                <Plus size={14} />
                إضافة
              </>
            )}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          الكلمات تُحفظ بصيغة lowercase + بدون حركات. المطابقة تتجاهل الحركات
          العربية.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
            />
          ))}
        </div>
      ) : words.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <ShieldAlert
            size={36}
            className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
          />
          <p className="text-sm font-black text-slate-700 dark:text-slate-200">
            لا توجد كلمات محظورة بعد
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            أضيفي أول كلمة من النموذج أعلاه.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <p className="px-1 text-[11px] text-slate-500 dark:text-slate-400">
            {words.length} كلمة محظورة
          </p>
          {words.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-sm font-black text-slate-900 dark:text-white">
                  {w.word}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                    w.severity === "block"
                      ? "bg-rose-500 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {w.severity === "block" ? "منع" : "تحذير"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(w.id, w.word)}
                aria-label="حذف"
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
