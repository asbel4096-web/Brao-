"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Coins,
  Plus,
  Minus,
  Wallet as WalletIcon,
  X,
  Send,
} from "lucide-react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAdminRole } from "@/hooks/admin/use-admin-role";
import { useUserWalletForAdmin } from "@/hooks/wallet/use-wallet";
import { useToast } from "@/contexts/ToastContext";
import {
  formatBC,
  formatBCSigned,
  isCreditType,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/wallet/types";

/**
 * صفحة تفاصيل محفظة مستخدم.
 *
 * تعرض:
 *  - بطاقة الرصيد الحالي
 *  - أزرار إضافة/خصم سريعة
 *  - dialog تعديل احترافي مع نوع + سبب
 *  - قائمة كل المعاملات (realtime)
 */

interface UserDoc {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  balance?: number;
}

export default function AdminUserWalletPage() {
  const params = useParams<{ uid: string }>();
  const uid = params?.uid;
  const { can } = useAdminRole();
  const { transactions, loading: loadingTx } = useUserWalletForAdmin(uid || null);
  const [user, setUser] = useState<UserDoc | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [adjustDialog, setAdjustDialog] = useState<"credit" | "debit" | null>(null);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          setUser({ id: snap.id, ...(snap.data() as any) } as UserDoc);
        }
        setLoadingUser(false);
      },
      () => setLoadingUser(false)
    );
    return () => unsub();
  }, [uid]);

  if (!can("users.edit")) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
        لا تملك صلاحية إدارة المحافظ.
      </div>
    );
  }

  if (loadingUser) {
    return (
      <div className="space-y-3">
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-black text-slate-700">المستخدم غير موجود</p>
        <Link
          href="/admin/wallet"
          className="mt-3 inline-flex items-center gap-1 text-xs font-black text-brand-700 hover:underline"
        >
          العودة <ArrowRight size={14} />
        </Link>
      </div>
    );
  }

  const balance = user.balance || 0;

  return (
    <div className="space-y-4">
      <Link
        href="/admin/wallet"
        className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-brand-700 dark:text-slate-400"
      >
        <ArrowRight size={12} />
        العودة للقائمة
      </Link>

      {/* User info */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-base font-black text-white">
            {(user.name || user.email || "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-black text-slate-900 dark:text-white">
              {user.name || user.email || user.id}
            </h1>
            {user.email && (
              <p className="truncate text-[12px] text-slate-500 dark:text-slate-400" dir="ltr">
                {user.email}
              </p>
            )}
            <p className="mt-0.5 truncate font-mono text-[9px] text-slate-400" dir="ltr">
              {user.id}
            </p>
          </div>
        </div>
      </div>

      {/* Balance card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-700 p-5 shadow-xl">
        <div className="absolute -right-4 -top-4 opacity-20">
          <Coins size={120} className="text-white" />
        </div>
        <p className="text-[11px] font-bold text-blue-100">الرصيد الحالي</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-black tabular-nums text-white">
            {balance.toLocaleString("ar-LY")}
          </span>
          <span className="text-sm font-black text-blue-200">BC</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setAdjustDialog("credit")}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500/90 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-500 active:scale-95"
          >
            <Plus size={14} />
            إضافة رصيد
          </button>
          <button
            type="button"
            onClick={() => setAdjustDialog("debit")}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-rose-500/90 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-rose-500 active:scale-95"
          >
            <Minus size={14} />
            خصم رصيد
          </button>
        </div>
      </div>

      {/* Transactions */}
      <section>
        <h2 className="mb-3 text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          سجلّ المعاملات
        </h2>
        {loadingTx ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900">
            <WalletIcon
              size={36}
              className="mx-auto mb-2 text-slate-300 dark:text-slate-600"
            />
            <p className="text-sm font-black text-slate-700 dark:text-slate-200">
              لا توجد معاملات بعد
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => {
              const credit = isCreditType(tx.type, tx.amount);
              const date = tx.createdAt?.toMillis?.()
                ? new Date(tx.createdAt.toMillis()).toLocaleString("ar-LY", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                      credit
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
                        : "bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300"
                    }`}
                  >
                    {credit ? <Plus size={16} /> : <Minus size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-slate-900 dark:text-white">
                      {tx.reason || TRANSACTION_TYPE_LABELS[tx.type]}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                      <span>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
                      <span>·</span>
                      <span>{date}</span>
                      {tx.createdByEmail && (
                        <>
                          <span>·</span>
                          <span dir="ltr">{tx.createdByEmail}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-end">
                    <p
                      className={`text-sm font-black tabular-nums ${
                        credit
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {formatBCSigned(tx.amount)}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      → {formatBC(tx.balanceAfter)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {adjustDialog && (
        <AdjustDialog
          mode={adjustDialog}
          uid={user.id}
          userName={user.name || user.email}
          onClose={() => setAdjustDialog(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// Adjust Dialog
// ============================================================
function AdjustDialog({
  mode,
  uid,
  userName,
  onClose,
}: {
  mode: "credit" | "debit";
  uid: string;
  userName?: string;
  onClose: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("admin_adjust");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      toast.warning("اكتبي رقماً صحيحاً");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      toast.warning("اكتبي سبباً واضحاً");
      return;
    }

    setBusy(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const finalAmount = mode === "credit" ? num : -num;
      const res = await fetch(`/api/admin/wallet/${uid}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          amount: finalAmount,
          type,
          reason: reason.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل التعديل");
        return;
      }
      toast.success(
        mode === "credit"
          ? `تمت إضافة ${num} BC. الرصيد الجديد: ${data.balanceAfter}`
          : `تم خصم ${num} BC. الرصيد الجديد: ${data.balanceAfter}`
      );
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
        onClick={busy ? undefined : onClose}
      />
      <div className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              {mode === "credit" ? "إضافة رصيد" : "خصم رصيد"}
            </h2>
            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400">
              {userName || "المستخدم"}
            </p>
          </div>
          {!busy && (
            <button
              type="button"
              onClick={onClose}
              className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              المبلغ (BC)
            </label>
            <input
              type="number"
              min="1"
              max="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={busy}
              placeholder="مثلاً: 100"
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-base font-black tabular-nums outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              نوع العملية
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              disabled={busy}
              className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="admin_adjust">تعديل إداري</option>
              {mode === "credit" && (
                <>
                  <option value="credit">إيداع</option>
                  <option value="reward">مكافأة</option>
                  <option value="refund">استرداد</option>
                </>
              )}
              {mode === "debit" && (
                <>
                  <option value="debit">خصم</option>
                  <option value="purchase">شراء</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300">
              السبب
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={busy}
              placeholder="مثلاً: هدية ترحيب، تصحيح خطأ، استرداد..."
              className="mt-1.5 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-10 rounded-2xl border border-slate-200 px-4 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || !amount || !reason.trim()}
            className={`
              inline-flex h-10 items-center gap-1.5 rounded-2xl px-4 text-xs font-black text-white shadow-sm transition active:scale-95 disabled:opacity-60
              ${mode === "credit" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}
            `}
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                جارٍ...
              </>
            ) : (
              <>
                <Send size={12} />
                تأكيد
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
