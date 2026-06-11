"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeftRight,
  Check,
  Loader2,
  Phone,
  Send,
  User,
  X,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  TRANSFER_MIN_BC,
  TRANSFER_MAX_BC,
  validateTransferAmount,
  isValidLibyanPhone,
} from "@/lib/wallet/transfer";

/**
 * Transfer Sheet - واجهة تحويل الرصيد لمستخدم آخر.
 *
 * الخطوات:
 *  1. إدخال رقم هاتف المستلم + المبلغ + ملاحظة
 *  2. مراجعة (confirm)
 *  3. تنفيذ (API call)
 *  4. شاشة النجاح
 */

interface Props {
  open: boolean;
  onClose: () => void;
  currentBalance: number;
  onSuccess?: () => void;
}

type Step = "form" | "confirm" | "success";

export function TransferSheet({
  open,
  onClose,
  currentBalance,
  onSuccess,
}: Props) {
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState<Step>("form");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    amount: number;
    recipientName: string;
  } | null>(null);

  const amountNum = parseInt(amount, 10) || 0;

  const reset = () => {
    setStep("form");
    setPhone("");
    setAmount("");
    setNote("");
    setResult(null);
    setSubmitting(false);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleNext = () => {
    // فحص الهاتف
    if (!isValidLibyanPhone(phone)) {
      toast.error("رقم هاتف غير صحيح (مثال: 0912345678)");
      return;
    }
    // فحص المبلغ
    const validation = validateTransferAmount(amountNum, currentBalance);
    if (!validation.ok) {
      toast.error(validation.error || "مبلغ غير صحيح");
      return;
    }
    setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/wallet/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipientPhone: phone,
          amount: amountNum,
          note: note.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل التحويل");
      }

      setResult({
        amount: data.amount,
        recipientName: data.recipientName || "المستلم",
      });
      setStep("success");
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "فشل التحويل");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="
              fixed inset-x-0 bottom-0 z-50 mx-auto max-w-lg
              rounded-t-[28px] bg-white p-5 pb-8 shadow-2xl
            "
            dir="rtl"
          >
            {/* Handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
                  <ArrowLeftRight size={16} className="text-emerald-600" />
                </div>
                <h2 className="text-base font-black text-slate-900">
                  تحويل رصيد
                </h2>
              </div>
              {!submitting && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Content */}
            {step === "form" && (
              <FormStep
                phone={phone}
                setPhone={setPhone}
                amount={amount}
                setAmount={setAmount}
                note={note}
                setNote={setNote}
                currentBalance={currentBalance}
                onNext={handleNext}
              />
            )}

            {step === "confirm" && (
              <ConfirmStep
                phone={phone}
                amount={amountNum}
                note={note}
                submitting={submitting}
                onBack={() => setStep("form")}
                onConfirm={handleConfirm}
              />
            )}

            {step === "success" && result && (
              <SuccessStep
                amount={result.amount}
                recipientName={result.recipientName}
                onDone={handleClose}
              />
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Step 1: Form
// ============================================================
function FormStep({
  phone,
  setPhone,
  amount,
  setAmount,
  note,
  setNote,
  currentBalance,
  onNext,
}: {
  phone: string;
  setPhone: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  currentBalance: number;
  onNext: () => void;
}) {
  const quickAmounts = [10, 50, 100, 500];

  return (
    <div className="space-y-4">
      {/* Balance reminder */}
      <div className="rounded-2xl bg-blue-50 px-4 py-3 text-center">
        <p className="text-[11px] text-blue-600">رصيدك الحالي</p>
        <p className="text-xl font-black text-blue-700 tabular-nums">
          {currentBalance.toLocaleString("en-US")} BC
        </p>
      </div>

      {/* Phone */}
      <div>
        <label className="flex items-center gap-1.5 text-xs font-black text-slate-700">
          <Phone size={12} />
          رقم هاتف المستلم
        </label>
        <input
          type="tel"
          dir="ltr"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0912345678"
          className="
            mt-1.5 w-full rounded-2xl border border-slate-200 bg-white
            px-3 py-3 text-center text-base font-bold tracking-wider
            outline-none focus:border-blue-500
          "
        />
      </div>

      {/* Amount */}
      <div>
        <label className="text-xs font-black text-slate-700">
          المبلغ (BC)
        </label>
        <input
          type="number"
          inputMode="numeric"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min={TRANSFER_MIN_BC}
          max={TRANSFER_MAX_BC}
          className="
            mt-1.5 w-full rounded-2xl border border-slate-200 bg-white
            px-3 py-3 text-center text-2xl font-black tabular-nums
            outline-none focus:border-blue-500
          "
        />
        {/* Quick amounts */}
        <div className="mt-2 flex gap-2">
          {quickAmounts.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(String(q))}
              disabled={q > currentBalance}
              className="
                flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2
                text-[12px] font-black text-slate-700 transition
                hover:border-blue-300 hover:bg-blue-50
                disabled:opacity-40
              "
            >
              {q}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-[10px] text-slate-400">
          الحد الأدنى {TRANSFER_MIN_BC} BC · الأقصى {TRANSFER_MAX_BC} BC · 5 تحويلات يومياً
        </p>
      </div>

      {/* Note */}
      <div>
        <label className="text-xs font-black text-slate-700">
          ملاحظة (اختياري)
        </label>
        <input
          type="text"
          maxLength={140}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="سبب التحويل..."
          className="
            mt-1.5 w-full rounded-2xl border border-slate-200 bg-white
            px-3 py-2.5 text-sm outline-none focus:border-blue-500
          "
        />
      </div>

      {/* Next button */}
      <motion.button
        type="button"
        onClick={onNext}
        whileTap={{ scale: 0.97 }}
        className="
          inline-flex w-full items-center justify-center gap-1.5
          rounded-2xl bg-blue-600 py-3.5 text-sm font-black text-white
          shadow-lg shadow-blue-500/30 transition hover:bg-blue-700
        "
      >
        متابعة
        <Send size={14} />
      </motion.button>
    </div>
  );
}

// ============================================================
// Step 2: Confirm
// ============================================================
function ConfirmStep({
  phone,
  amount,
  note,
  submitting,
  onBack,
  onConfirm,
}: {
  phone: string;
  amount: number;
  note: string;
  submitting: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Amount display */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center">
        <p className="text-[12px] text-blue-100">المبلغ المُحوَّل</p>
        <p className="mt-1 text-4xl font-black text-white tabular-nums">
          {amount} <span className="text-lg">BC</span>
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <DetailRow icon={Phone} label="إلى الرقم" value={phone} ltr />
        {note && <DetailRow icon={User} label="ملاحظة" value={note} />}
      </div>

      {/* Warning */}
      <div className="rounded-2xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-700">
        ⚠️ تأكد من رقم المستلم جيداً. التحويل لا يمكن التراجع عنه بعد التنفيذ.
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="
            rounded-2xl border border-slate-200 py-3.5 text-sm
            font-black text-slate-700 transition hover:bg-slate-50
            disabled:opacity-60
          "
        >
          تعديل
        </button>
        <motion.button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          whileTap={{ scale: 0.97 }}
          className="
            inline-flex items-center justify-center gap-1.5
            rounded-2xl bg-emerald-600 py-3.5 text-sm font-black text-white
            shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-700
            disabled:opacity-60
          "
        >
          {submitting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              جارٍ التحويل...
            </>
          ) : (
            <>
              <Check size={14} />
              تأكيد التحويل
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  ltr,
}: {
  icon: any;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
        <Icon size={12} />
        {label}
      </span>
      <span
        className="text-[13px] font-black text-slate-900"
        dir={ltr ? "ltr" : undefined}
      >
        {value}
      </span>
    </div>
  );
}

// ============================================================
// Step 3: Success
// ============================================================
function SuccessStep({
  amount,
  recipientName,
  onDone,
}: {
  amount: number;
  recipientName: string;
  onDone: () => void;
}) {
  return (
    <div className="py-4 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 12 }}
        className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100"
      >
        <Check size={40} className="text-emerald-600" strokeWidth={3} />
      </motion.div>

      <h3 className="text-lg font-black text-slate-900">تم التحويل بنجاح!</h3>
      <p className="mt-1 text-sm text-slate-500">
        أرسلت{" "}
        <span className="font-black text-emerald-600">{amount} BC</span> إلى{" "}
        <span className="font-black text-slate-900">{recipientName}</span>
      </p>

      <motion.button
        type="button"
        onClick={onDone}
        whileTap={{ scale: 0.97 }}
        className="
          mt-6 inline-flex w-full items-center justify-center
          rounded-2xl bg-blue-600 py-3.5 text-sm font-black text-white
          shadow-lg shadow-blue-500/30 transition hover:bg-blue-700
        "
      >
        تم
      </motion.button>
    </div>
  );
}
