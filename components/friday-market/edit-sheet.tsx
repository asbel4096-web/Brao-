"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/contexts/ToastContext";
import { useBannedWordsCheck } from "@/hooks/admin/use-banned-words-check";
import {
  FRIDAY_CATEGORIES,
  FRIDAY_TITLE_MAX,
  type FridayMarketItem,
} from "@/lib/friday-market/types";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  item: FridayMarketItem;
  onUpdated: (fields: {
    title: string;
    price: number;
    phone: string;
    category: string;
  }) => void;
}

export function EditSheet({ open, onClose, item, onUpdated }: Props) {
  const toast = useToast();
  const { check: checkBannedWords } = useBannedWordsCheck();

  const [title, setTitle] = useState(item.title || "");
  const [price, setPrice] = useState(String(item.price ?? ""));
  const [phone, setPhone] = useState(item.phone || "");
  const [category, setCategory] = useState<string>(String(item.category || "cars"));
  const [saving, setSaving] = useState(false);

  // مزامنة القيم عند فتح النافذة على عرض مختلف
  useEffect(() => {
    if (open) {
      setTitle(item.title || "");
      setPrice(String(item.price ?? ""));
      setPhone(item.phone || "");
      setCategory(String(item.category || "cars"));
    }
  }, [open, item]);

  const submit = async () => {
    if (title.trim().length < 2) return toast.warning("اكتب اسم المنتج");
    if (!price || Number(price) < 0) return toast.warning("أدخل السعر");
    if (phone.trim().length < 6) return toast.warning("أدخل رقم الهاتف");

    const hit = checkBannedWords(title);
    if (hit && hit.severity === "block") {
      toast.error(`الاسم يحوي كلمة غير مسموحة: "${hit.matchedWord}"`);
      return;
    }

    setSaving(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/friday-market/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          itemId: item.id,
          title: title.trim(),
          price: Number(price),
          phone: phone.trim(),
          category,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data?.error || "تعذّر الحفظ");

      onUpdated({
        title: title.trim(),
        price: Number(price),
        phone: phone.trim(),
        category,
      });
      toast.success("تم حفظ التعديل");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "تعذّر الحفظ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] overflow-y-auto rounded-t-[28px] bg-white p-5 dark:bg-slate-900"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
            dir="rtl"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                تعديل العرض
              </h2>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="إغلاق"
              >
                <X size={20} />
              </button>
            </div>

            <Field label="اسم المنتج">
              <input
                value={title}
                maxLength={FRIDAY_TITLE_MAX}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="السعر (د.ل)">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                className={cn(inputCls, "tabular-nums")}
              />
            </Field>

            <Field label="رقم الهاتف">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                className={cn(inputCls, "tabular-nums")}
              />
            </Field>

            <Field label="القسم">
              <div className="flex flex-wrap gap-2">
                {FRIDAY_CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    className={cn(
                      "rounded-full px-3 py-2 text-[13px] font-bold transition active:scale-95",
                      category === c.key
                        ? "bg-action-500 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    )}
                  >
                    {c.emoji} {c.label}
                  </button>
                ))}
              </div>
            </Field>

            <p className="mb-3 text-[11px] font-semibold text-slate-400">
              لتغيير الصور، احذف العرض وأعد نشره أثناء فتح السوق.
            </p>

            <button
              onClick={submit}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-action-500 py-3.5 text-[15px] font-black text-white shadow-lg transition active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> جاري الحفظ...
                </>
              ) : (
                "حفظ التعديل"
              )}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const inputCls =
  "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[15px] font-semibold text-slate-800 outline-none focus:border-action-400 focus:ring-2 focus:ring-action-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3.5">
      <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-200">
        {label}
      </label>
      {children}
    </div>
  );
}
