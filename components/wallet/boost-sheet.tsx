"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  CheckCircle2,
  Star,
  Rocket,
  Crown,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useWallet } from "@/hooks/wallet/use-wallet";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { useToast } from "@/contexts/ToastContext";
import { useConfirm } from "@/components/confirm-dialog";
import {
  ALL_BOOST_SERVICES,
  BOOST_SERVICES,
  type BoostServiceKey,
  type ListingBoostFields,
  isBoostedNow,
  isFeaturedNow,
  isVipNow,
  boostDaysRemaining,
  featuredDaysRemaining,
  promotionDaysRemaining,
  formatRemainingDays,
} from "@/lib/wallet/boost";
import { formatBC } from "@/lib/wallet/types";

/**
 * BoostSheet - bottom sheet لشراء خدمات boost لإعلان معيّن.
 *
 * يُفتح من زر "تعزيز" بجانب الإعلان في my-listings أو في تفاصيل الإعلان.
 *
 * يعرض:
 *  - الإعلان الذي سيُعزَّز
 *  - حالته الحالية (مُعزَّز/مميَّز/عادي)
 *  - 3 بطاقات للخدمات الثلاث
 *  - زر شراء لكل خدمة (يفحص الرصيد)
 */

interface Props {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  /** الحقول الحالية للإعلان (لمعرفة هل هو مُعزَّز/مميَّز). */
  listingBoostFields?: ListingBoostFields;
}

const SERVICE_ICONS: Record<BoostServiceKey, any> = {
  featured: Star,
  boost: Rocket,
  vip: Crown,
};

export function BoostSheet({
  open,
  onClose,
  listingId,
  listingTitle,
  listingBoostFields,
}: Props) {
  const boostsEnabled = useFeatureFlag("boosts");
  const walletEnabled = useFeatureFlag("wallet");
  const { balance } = useWallet();
  const toast = useToast();
  const confirm = useConfirm();
  const [buying, setBuying] = useState<BoostServiceKey | null>(null);

  const isBoosted = listingBoostFields
    ? isBoostedNow(listingBoostFields)
    : false;
  const isFeatured = listingBoostFields
    ? isFeaturedNow(listingBoostFields)
    : false;
  const isVip = listingBoostFields
    ? isVipNow(listingBoostFields)
    : false;
  const boostDays = listingBoostFields
    ? boostDaysRemaining(listingBoostFields)
    : null;
  const featuredDays = listingBoostFields
    ? featuredDaysRemaining(listingBoostFields)
    : null;
  const vipDays = listingBoostFields
    ? promotionDaysRemaining(listingBoostFields)
    : null;

  const handlePurchase = async (serviceKey: BoostServiceKey) => {
    const service = BOOST_SERVICES[serviceKey];
    if (balance < service.price) {
      toast.warning(
        `الرصيد غير كافٍ. تحتاج ${service.price - balance} BC إضافية`
      );
      return;
    }

    const isExtension =
      (serviceKey === "boost" && isBoosted) ||
      (serviceKey === "featured" && isFeatured) ||
      (serviceKey === "vip" && isVip);

    const ok = await confirm({
      title: isExtension
        ? `تمديد ${service.label}؟`
        : `شراء ${service.label}؟`,
      message: isExtension
        ? `سيتم خصم ${formatBC(service.price)} وتمديد المدة ${service.durationDays} أيام إضافية.`
        : `سيتم خصم ${formatBC(service.price)} من رصيدك.`,
      confirmLabel: "تأكيد الشراء",
      tone: "info",
    });
    if (!ok) return;

    setBuying(serviceKey);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/wallet/boost/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken || ""}`,
        },
        body: JSON.stringify({
          listingId,
          service: serviceKey,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل الشراء");
        return;
      }
      toast.success(`تم تفعيل ${service.label} ✨`);
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setBuying(null);
    }
  };

  // featured (مميز) + vip يحتاجان flag wallet، ممول يحتاج boosts
  const isServiceAvailable = (key: BoostServiceKey) =>
    key === "featured" || key === "vip" ? walletEnabled : boostsEnabled;

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
                تعزيز الإعلان
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
              {/* Listing info */}
              <div className="mt-2 rounded-2xl bg-slate-900 p-3">
                <p className="text-[10px] font-black uppercase text-slate-500">
                  الإعلان
                </p>
                <p className="mt-1 truncate text-sm font-black text-white">
                  {listingTitle}
                </p>

                {/* Current status */}
                {(isVip || isBoosted || isFeatured) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {isVip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300">
                        <Crown size={10} />
                        VIP · {formatRemainingDays(vipDays)}
                      </span>
                    )}
                    {isFeatured && !isVip && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-black text-blue-300">
                        <Star size={10} />
                        مميز · {formatRemainingDays(featuredDays)}
                      </span>
                    )}
                    {isBoosted && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-300">
                        <Rocket size={10} />
                        ممول · {formatRemainingDays(boostDays)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-slate-900 p-3">
                <span className="text-[12px] font-bold text-slate-400">
                  رصيدك الحالي
                </span>
                <span className="text-base font-black tabular-nums text-white">
                  {formatBC(balance)}
                </span>
              </div>

              {/* Services */}
              <div className="mt-4 space-y-2.5">
                {ALL_BOOST_SERVICES.map((service) => {
                  const Icon = SERVICE_ICONS[service.key];
                  const available = isServiceAvailable(service.key);
                  const canAfford = balance >= service.price;
                  const busy = buying === service.key;

                  const isExtension =
                    (service.key === "boost" && isBoosted) ||
                    (service.key === "featured" && isFeatured);

                  return (
                    <div
                      key={service.key}
                      className="rounded-2xl border border-slate-800 bg-slate-900 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${service.gradient} text-white shadow-lg`}
                        >
                          <Icon size={20} />
                        </div>

                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-black text-white">
                            {service.label}
                          </h3>
                          <p className="mt-0.5 text-[11px] leading-4 text-slate-400">
                            {service.description}
                          </p>
                          {service.durationDays && (
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              المدة: {service.durationDays} أيام
                            </p>
                          )}
                        </div>

                        <div className="text-end">
                          <p className="text-base font-black tabular-nums text-white">
                            {service.price}
                          </p>
                          <p className="text-[9px] font-bold text-slate-500">BC</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePurchase(service.key)}
                        disabled={busy || !canAfford || !available}
                        className={`
                          mt-3 inline-flex w-full items-center justify-center gap-1.5
                          rounded-2xl bg-gradient-to-br ${service.gradient} py-2.5
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
                        ) : !available ? (
                          "غير متاح حالياً"
                        ) : !canAfford ? (
                          "الرصيد غير كافٍ"
                        ) : isExtension ? (
                          <>
                            <CheckCircle2 size={12} />
                            تمديد
                          </>
                        ) : (
                          <>
                            <Sparkles size={12} />
                            اشترِ الآن
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 text-center text-[10px] leading-5 text-slate-500">
                التراكم متاح: يمكنك شراء أكثر من خدمة على نفس الإعلان.
                <br />
                المدد تُضاف فوق بعضها عند التمديد.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
