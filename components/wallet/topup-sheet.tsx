"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  Phone,
  FileText,
  Send,
  Sparkles,
  ChevronLeft,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useMyTopupRequests } from "@/hooks/wallet/use-topup-requests";
import { useToast } from "@/contexts/ToastContext";
import {
  PAYMENT_METHODS,
  TOPUP_MAX_AMOUNT,
  TOPUP_MIN_AMOUNT,
  TOPUP_STATUS_META,
  type PaymentMethodKey,
  type TopupRequest,
} from "@/lib/wallet/topup";
import { formatBC } from "@/lib/wallet/types";

/**
 * TopupSheet - واجهة شحن الرصيد للمستخدم.
 *
 * 2 views:
 *  - "form": نموذج طلب شحن جديد
 *  - "history": سجلّ طلباته السابقة
 *
 * المستخدم يفتح من زر "شحن رصيد" في WalletSheet.
 */

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TopupSheet({ open, onClose }: Props) {
  const { profile } = useAuth();
  const { requests, loading, pendingCount } = useMyTopupRequests();
  const toast = useToast();
  const [view, setView] = useState<"form" | "history">("form");

  // Form state
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethodKey>("bank_transfer");
  const [contactNumber, setContactNumber] = useState(
    (profile as any)?.phone || ""
  );
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setAmount("");
    setMethod("bank_transfer");
    setNote("");
  };

  const handleSubmit = async () => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num < TOPUP_MIN_AMOUNT) {
      toast.warning(`الحد الأدنى ${TOPUP_MIN_AMOUNT} BC`);
      return;
    }
    if (num > TOPUP_MAX_AMOUNT) {
      toast.warning(`الحد الأقصى ${TOPUP_MAX_AMOUNT} BC`);
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 6) {
      toast.warning("اكتب رقم تواصل صحيح");
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/wallet/topup/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          amount: num,
          paymentMethod: method,
          contactNumber: contactNumber.trim(),
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل إرسال الطلب");
        return;
      }
      toast.success("تم إرسال طلب الشحن. سيراجعه الفريق قريباً.");
      resetForm();
      setView("history");
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-slate-900/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-[60] max-h-[92vh] overflow-hidden rounded-t-[28px] bg-slate-950 shadow-2xl"
            dir="rtl"
          >
            <div className="flex justify-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-700" />
            </div>

            <div className="relative flex items-center justify-between px-5 pb-2 pt-2">
              {view === "history" && (
                <button
                  type="button"
                  onClick={() => setView("form")}
                  aria-label="رجوع"
                  className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <h2 className="absolute left-1/2 -translate-x-1/2 text-base font-black text-white">
                {view === "form" ? "شحن رصيد" : "طلباتي السابقة"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="إغلاق"
                className="grid h-9 w-9 place-items-center rounded-full bg-slate-800 text-slate-300 transition hover:bg-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-60px)] overflow-y-auto px-5 pb-6">
              <AnimatePresence mode="wait">
                {view === "form" ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 space-y-4"
                  >
                    {/* Info */}
                    <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 p-4">
                      <div className="flex items-start gap-3">
                        <Sparkles size={20} className="shrink-0 text-white" />
                        <div>
                          <p className="text-sm font-black text-white">
                            كيف يعمل الشحن؟
                          </p>
                          <p className="mt-1 text-[11px] leading-5 text-blue-100">
                            اختر طريقة الدفع وأدخل رقم تواصلك. ستراجع الإدارة
                            طلبك وتتواصل معك لإتمام العملية. بعد التأكيد،
                            يُضاف الرصيد فوراً لمحفظتك.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Pending indicator */}
                    {pendingCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setView("history")}
                        className="flex w-full items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-right transition hover:bg-amber-500/15"
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={16} className="text-amber-400" />
                          <p className="text-[12px] font-black text-amber-200">
                            لديك {pendingCount} طلب قيد المراجعة
                          </p>
                        </div>
                        <span className="text-[11px] text-amber-300">عرض</span>
                      </button>
                    )}

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-black text-slate-300">
                        المبلغ (BC) *
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={TOPUP_MIN_AMOUNT}
                        max={TOPUP_MAX_AMOUNT}
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={submitting}
                        placeholder={`من ${TOPUP_MIN_AMOUNT} إلى ${TOPUP_MAX_AMOUNT}`}
                        dir="ltr"
                        className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-center text-xl font-black tabular-nums text-white outline-none focus:border-blue-400"
                      />
                      {/* Quick amounts */}
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {[100, 200, 500, 1000].map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setAmount(String(v))}
                            disabled={submitting}
                            className="rounded-xl border border-slate-700 bg-slate-900 py-2 text-[11px] font-black text-slate-300 transition hover:border-blue-500/50 hover:text-blue-300"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Payment method */}
                    <div>
                      <label className="block text-xs font-black text-slate-300">
                        طريقة الدفع *
                      </label>
                      <div className="mt-1.5 space-y-1.5">
                        {PAYMENT_METHODS.map((m) => (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setMethod(m.key)}
                            disabled={submitting}
                            className={`
                              flex w-full items-center gap-3 rounded-2xl border p-3 text-right transition
                              ${method === m.key
                                ? "border-blue-500 bg-blue-500/15"
                                : "border-slate-800 bg-slate-900 hover:border-slate-700"
                              }
                            `}
                          >
                            <span className="text-xl">{m.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-black text-white">
                                {m.label}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                {m.description}
                              </p>
                            </div>
                            {method === m.key && (
                              <CheckCircle2 size={16} className="shrink-0 text-blue-400" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contact */}
                    <div>
                      <label className="block text-xs font-black text-slate-300">
                        <Phone size={11} className="inline" /> رقم التواصل *
                      </label>
                      <input
                        type="tel"
                        value={contactNumber}
                        onChange={(e) => setContactNumber(e.target.value)}
                        disabled={submitting}
                        placeholder="091XXXXXXX"
                        dir="ltr"
                        className="mt-1.5 w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm font-mono text-white outline-none focus:border-blue-400"
                      />
                      <p className="mt-1 text-[10px] text-slate-500">
                        سنتواصل معك على هذا الرقم لإتمام عملية الدفع
                      </p>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-xs font-black text-slate-300">
                        <FileText size={11} className="inline" /> ملاحظات (اختياري)
                      </label>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        disabled={submitting}
                        placeholder="أي تفاصيل إضافية تريد إخبارنا بها..."
                        className="mt-1.5 w-full resize-none rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-400"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={submitting || !amount || !contactNumber}
                      className="
                        mt-2 inline-flex w-full items-center justify-center gap-2
                        rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600
                        py-3.5 text-sm font-black text-white shadow-lg transition
                        hover:brightness-110 active:scale-[0.98] disabled:opacity-50
                      "
                    >
                      {submitting ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          جارٍ الإرسال...
                        </>
                      ) : (
                        <>
                          <Send size={14} />
                          إرسال طلب الشحن
                        </>
                      )}
                    </button>

                    {/* History link */}
                    {requests.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setView("history")}
                        className="w-full text-center text-[11px] font-black text-blue-400 transition hover:text-blue-300"
                      >
                        عرض طلباتي السابقة ({requests.length})
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="history"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="mt-2 space-y-2"
                  >
                    {loading ? (
                      <>
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-20 animate-pulse rounded-2xl bg-slate-800/50"
                          />
                        ))}
                      </>
                    ) : requests.length === 0 ? (
                      <div className="rounded-3xl bg-slate-900 p-10 text-center">
                        <CreditCard
                          size={36}
                          className="mx-auto mb-2 text-slate-600"
                        />
                        <p className="text-sm font-black text-white">
                          لا توجد طلبات سابقة
                        </p>
                      </div>
                    ) : (
                      requests.map((r) => <RequestRow key={r.id} req={r} />)
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function RequestRow({ req }: { req: TopupRequest }) {
  const meta = TOPUP_STATUS_META[req.status];
  const date = req.createdAt?.toMillis?.()
    ? new Date(req.createdAt.toMillis()).toLocaleDateString("ar-LY", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  const Icon =
    req.status === "approved"
      ? CheckCircle2
      : req.status === "rejected"
      ? XCircle
      : Clock;

  return (
    <div className="rounded-2xl bg-slate-800/40 p-3">
      <div className="flex items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            req.status === "approved"
              ? "bg-emerald-900/40 text-emerald-400"
              : req.status === "rejected"
              ? "bg-rose-900/40 text-rose-400"
              : "bg-amber-900/40 text-amber-400"
          }`}
        >
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-base font-black text-white">
              {formatBC(req.amount)}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[9px] font-black ${
                req.status === "approved"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : req.status === "rejected"
                  ? "bg-rose-500/20 text-rose-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {req.paymentMethodLabel || req.paymentMethod} · {date}
          </p>
        </div>
      </div>
      {req.reviewNote && (
        <div
          className={`mt-2 rounded-xl p-2 text-[11px] leading-5 ${
            req.status === "rejected"
              ? "bg-rose-900/20 text-rose-200"
              : "bg-slate-900/60 text-slate-300"
          }`}
        >
          <span className="font-black">
            {req.status === "rejected" ? "سبب الرفض: " : "ملاحظة: "}
          </span>
          {req.reviewNote}
        </div>
      )}
    </div>
  );
}
