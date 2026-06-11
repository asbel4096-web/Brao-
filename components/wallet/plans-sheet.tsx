"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  BadgeCheck,
  Star,
  Crown,
  Briefcase,
  CalendarDays,
  Check,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useWallet } from "@/hooks/wallet/use-wallet";
import { useMyVerification } from "@/hooks/wallet/use-verification";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import { VERIFICATION_PLANS, type VerificationPlanKey, formatBC } from "@/lib/wallet/types";
import { findPlan, formatRemainingDays } from "@/lib/wallet/verification";

/**
 * Plans Sheet - عرض خطط التوثيق + الشراء بـBC.
 *
 * يُعرض عبر WalletSheet (زر "العروض") أو مباشرة من profile.
 *
 * UX:
 *  - بطاقات للخطط الخمس (مطابقة للتصميم المرسل)
 *  - حالة المستخدم الحالية معروضة في الأعلى (نشط / منتهي / لا اشتراك)
 *  - زر "شراء/تجديد" يخصم BC فوراً (مع confirm dialog)
 *  - يخفي نفسه لو feature flag verification_paid مغلق
 */

const PLAN_ICONS: Record<VerificationPlanKey, any> = {
  basic: BadgeCheck,
  gold: Star,
  vip: Crown,
  business: Briefcase,
  annual: CalendarDays,
};

const PLAN_COLORS: Record<
  VerificationPlanKey,
  { gradient: string; ring: string; text: string }
> = {
  basic: {
    gradient: "from-blue-500 to-blue-600",
    ring: "ring-blue-500/30",
    text: "text-blue-400",
  },
  gold: {
    gradient: "from-amber-500 to-yellow-600",
    ring: "ring-amber-500/30",
    text: "text-amber-400",
  },
  vip: {
    gradient: "from-purple-500 to-purple-700",
    ring: "ring-purple-500/30",
    text: "text-purple-400",
  },
  business: {
    gradient: "from-emerald-500 to-emerald-700",
    ring: "ring-emerald-500/30",
    text: "text-emerald-400",
  },
  annual: {
    gradient: "from-rose-500 to-rose-700",
    ring: "ring-rose-500/30",
    text: "text-rose-400",
  },
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PlansSheet({ open, onClose }: Props) {
  const enabled = useFeatureFlag("verification_paid");
  const { balance } = useWallet();
  const { isVerified, daysRemaining, fields } = useMyVerification();
  const toast = useToast();
  const confirm = useConfirm();
  const [buyingPlan, setBuyingPlan] = useState<VerificationPlanKey | null>(null);

  const currentPlanKey = fields.verificationPlan;
  const currentPlan = currentPlanKey ? findPlan(currentPlanKey) : null;

  const handlePurchase = async (planKey: VerificationPlanKey) => {
    const plan = findPlan(planKey);
    if (!plan) return;

    if (balance < plan.price) {
      toast.warning(
        `الرصيد غير كافٍ. تحتاج ${plan.price - balance} BC إضافية`
      );
      return;
    }

    const isExtension = isVerified && currentPlanKey === planKey;
    const ok = await confirm({
      title: isExtension ? `تمديد ${plan.label}؟` : `شراء ${plan.label}؟`,
      message: isExtension
        ? `سيتم خصم ${formatBC(plan.price)} وتمديد اشتراكك ${plan.durationDays} يوماً إضافية.`
        : `سيتم خصم ${formatBC(plan.price)} وستحصل على التوثيق لمدة ${plan.durationDays} يوماً.`,
      confirmLabel: isExtension ? "تمديد" : "شراء",
      tone: "info",
    });
    if (!ok) return;

    setBuyingPlan(planKey);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/wallet/verification/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({ plan: planKey }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل الشراء");
        return;
      }
      toast.success(
        data.extended
          ? `تم تمديد ${plan.label} بنجاح`
          : `مبروك! تم تفعيل ${plan.label}`
      );
      // الرصيد + الحالة يحدّثان تلقائياً عبر AuthContext realtime
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setBuyingPlan(null);
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
              <h2 className="absolute left-1/2 -translate-x-1/2 text-base font-black text-white">
                خطط التوثيق
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

            <div className="max-h-[calc(92vh-60px)] overflow-y-auto px-4 pb-6">
              {!enabled ? (
                <div className="rounded-3xl bg-slate-900 p-8 text-center">
                  <Sparkles
                    size={36}
                    className="mx-auto mb-3 text-slate-600"
                  />
                  <p className="text-base font-black text-white">
                    نظام التوثيق المدفوع غير مفعَّل حالياً
                  </p>
                  <p className="mt-1 text-[12px] text-slate-400">
                    سيُتاح قريباً مع إطلاق المرحلة الجديدة
                  </p>
                </div>
              ) : (
                <>
                  {/* Current status */}
                  {isVerified && currentPlan && (
                    <div className="mt-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3">
                      <div className="flex items-center gap-2">
                        <BadgeCheck size={16} className="text-emerald-400" />
                        <p className="text-sm font-black text-emerald-300">
                          توثيق نشط: {currentPlan.label}
                        </p>
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-200/80">
                        متبقي: {formatRemainingDays(daysRemaining)}
                      </p>
                    </div>
                  )}

                  {/* Balance reminder */}
                  <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-900 p-3">
                    <span className="text-[12px] font-bold text-slate-400">
                      رصيدك الحالي
                    </span>
                    <span className="text-base font-black tabular-nums text-white">
                      {formatBC(balance)}
                    </span>
                  </div>

                  {/* Plans */}
                  <div className="mt-4 space-y-2.5">
                    {VERIFICATION_PLANS.map((plan) => {
                      const Icon = PLAN_ICONS[plan.key];
                      const colors = PLAN_COLORS[plan.key];
                      const isCurrent = currentPlanKey === plan.key && isVerified;
                      const canAfford = balance >= plan.price;
                      const busy = buyingPlan === plan.key;

                      return (
                        <motion.div
                          key={plan.key}
                          whileTap={canAfford && !busy ? { scale: 0.98 } : {}}
                          className={`
                            relative overflow-hidden rounded-2xl border bg-slate-900 p-3
                            ${isCurrent
                              ? `border-transparent ring-2 ${colors.ring}`
                              : "border-slate-800"
                            }
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${colors.gradient} text-white shadow-lg`}
                            >
                              <Icon size={20} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-white">
                                  {plan.label}
                                </h3>
                                {isCurrent && (
                                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black text-emerald-300">
                                    الحالي
                                  </span>
                                )}
                              </div>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {plan.durationDays === 365
                                  ? "سنوياً"
                                  : `${plan.durationDays} يوماً`}
                              </p>
                            </div>
                            <div className="text-end">
                              <p className="text-base font-black tabular-nums text-white">
                                {plan.price.toLocaleString("ar-LY")}
                              </p>
                              <p className="text-[9px] font-bold text-slate-500">BC</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePurchase(plan.key)}
                            disabled={busy || !canAfford}
                            className={`
                              mt-3 inline-flex w-full items-center justify-center gap-1.5
                              rounded-2xl bg-gradient-to-br ${colors.gradient} py-2.5
                              text-xs font-black text-white shadow-sm transition
                              hover:brightness-110 active:scale-[0.98]
                              disabled:cursor-not-allowed disabled:opacity-50
                            `}
                          >
                            {busy ? (
                              <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                جارٍ...
                              </>
                            ) : !canAfford ? (
                              <>الرصيد غير كافٍ</>
                            ) : isCurrent ? (
                              <>
                                <Check size={12} />
                                تمديد الاشتراك
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} />
                                {isVerified ? "ترقية" : "اشترك الآن"}
                              </>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>

                  <p className="mt-4 text-center text-[10px] text-slate-500">
                    الاشتراكات تتجدد يدوياً. عند الانتهاء، تختفي شارة التوثيق
                    تلقائياً.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
