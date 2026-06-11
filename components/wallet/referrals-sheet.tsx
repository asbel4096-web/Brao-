"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users as UsersIcon,
  Copy,
  Check,
  Share2,
  Sparkles,
  Gift,
  Clock,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { useMyReferrals } from "@/hooks/wallet/use-referrals";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";
import { useToast } from "@/contexts/ToastContext";
import {
  buildReferralLink,
  buildWhatsAppShareText,
  formatReferralsCount,
  REFERRAL_REWARD_BC,
} from "@/lib/wallet/referrals";

/**
 * ReferralsSheet - شاشة كاملة لإدارة الإحالات.
 *
 * 3 حالات:
 *  1. الـflag مغلق → "قريباً"
 *  2. الـflag مفعَّل + لا كود → زر "فعّل الآن"
 *  3. الـflag مفعَّل + كود موجود → كود + رابط + قائمة + إحصاءات
 */

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ReferralsSheet({ open, onClose }: Props) {
  const enabled = useFeatureFlag("referrals");
  const {
    referralCode,
    referralsCount,
    isActivated,
    referrals,
    loadingList,
    completedCount,
    pendingCount,
  } = useMyReferrals();
  const toast = useToast();
  const [activating, setActivating] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const link = referralCode ? buildReferralLink(referralCode) : "";

  const handleActivate = async () => {
    setActivating(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/wallet/referrals/activate", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken || ""}` },
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        toast.error(data.error || "فشل التفعيل");
        return;
      }
      toast.success(`تم التفعيل! كودك: ${data.code}`);
    } catch (err: any) {
      toast.error(err?.message || "خطأ");
    } finally {
      setActivating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success("تم نسخ الكود");
    } catch {
      toast.error("فشل النسخ");
    }
  };

  const handleCopyLink = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success("تم نسخ الرابط");
    } catch {
      toast.error("فشل النسخ");
    }
  };

  const handleShare = async () => {
    if (!referralCode || !link) return;
    // محاولة Web Share API أولاً (طبيعي على الموبايل)
    if (navigator.share) {
      try {
        await navigator.share({
          title: "براتشو كار - دعوة",
          text: `سجّل عبر رابط الدعوة واحصل على ${REFERRAL_REWARD_BC} BC هدية`,
          url: link,
        });
        return;
      } catch {
        // المستخدم ألغى - لا شيء
      }
    }
    // فولباك: copy
    handleCopyLink();
  };

  const handleWhatsApp = () => {
    if (!referralCode || !link) return;
    const text = buildWhatsAppShareText(referralCode, link);
    window.open(`https://wa.me/?text=${text}`, "_blank");
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
                ادعُ أصدقاءك
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
              {!enabled ? (
                <ComingSoon />
              ) : !isActivated ? (
                <NotActivated onActivate={handleActivate} busy={activating} />
              ) : (
                <ActivatedView
                  code={referralCode!}
                  link={link}
                  count={referralsCount}
                  completedCount={completedCount}
                  pendingCount={pendingCount}
                  referrals={referrals}
                  loadingList={loadingList}
                  copiedCode={copiedCode}
                  copiedLink={copiedLink}
                  onCopyCode={handleCopyCode}
                  onCopyLink={handleCopyLink}
                  onShare={handleShare}
                  onWhatsApp={handleWhatsApp}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// Sub-views
// ============================================================

function ComingSoon() {
  return (
    <div className="rounded-3xl bg-slate-900 p-10 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600">
        <Sparkles size={24} className="text-white" />
      </div>
      <h3 className="text-lg font-black text-white">نظام الإحالات قريباً</h3>
      <p className="mt-1 text-[12px] text-slate-400">
        ستحصل على {REFERRAL_REWARD_BC} BC عن كل صديق تدعوه
      </p>
    </div>
  );
}

function NotActivated({
  onActivate,
  busy,
}: {
  onActivate: () => void;
  busy: boolean;
}) {
  return (
    <div className="mt-2 space-y-4">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-6 text-center">
        <div className="absolute -right-4 -top-4 opacity-20">
          <Gift size={140} className="text-white" />
        </div>
        <div className="relative">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
            <Gift size={24} className="text-white" />
          </div>
          <h3 className="text-xl font-black text-white">
            ادعُ أصدقاءك واربح
          </h3>
          <p className="mt-1 text-sm text-white/90">
            احصل على {REFERRAL_REWARD_BC} BC عن كل صديق
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          كيف يعمل؟
        </h4>
        <StepRow
          num="1"
          title="فعّل نظام الإحالات"
          desc="احصل على كودك الفريد"
        />
        <StepRow
          num="2"
          title="شارك الكود"
          desc="WhatsApp، Facebook، أو رابط مباشر"
        />
        <StepRow
          num="3"
          title="صديقك يُسجّل وينشر إعلاناً"
          desc="بعد اعتماد الإعلان من الإدارة"
        />
        <StepRow
          num="4"
          title="تحصلان على المكافأة!"
          desc={`${REFERRAL_REWARD_BC} BC لك + ${REFERRAL_REWARD_BC} BC له`}
          isLast
        />
      </div>

      <button
        type="button"
        onClick={onActivate}
        disabled={busy}
        className="
          mt-2 inline-flex w-full items-center justify-center gap-2
          rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600
          py-3.5 text-sm font-black text-white shadow-lg transition
          hover:brightness-110 active:scale-[0.98] disabled:opacity-60
        "
      >
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            جارٍ التفعيل...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            فعّل نظام الإحالات
          </>
        )}
      </button>
    </div>
  );
}

function StepRow({
  num,
  title,
  desc,
  isLast,
}: {
  num: string;
  title: string;
  desc: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-slate-900 p-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 text-[11px] font-black text-white">
        {num}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-black text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{desc}</p>
      </div>
    </div>
  );
}

function ActivatedView({
  code,
  link,
  count,
  completedCount,
  pendingCount,
  referrals,
  loadingList,
  copiedCode,
  copiedLink,
  onCopyCode,
  onCopyLink,
  onShare,
  onWhatsApp,
}: {
  code: string;
  link: string;
  count: number;
  completedCount: number;
  pendingCount: number;
  referrals: any[];
  loadingList: boolean;
  copiedCode: boolean;
  copiedLink: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onShare: () => void;
  onWhatsApp: () => void;
}) {
  return (
    <div className="mt-2 space-y-4">
      {/* Stats card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 p-5">
        <div className="absolute -right-4 -top-4 opacity-20">
          <UsersIcon size={120} className="text-white" />
        </div>
        <div className="relative">
          <p className="text-[11px] font-bold text-blue-100">دعواتك المكتملة</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums text-white">
              {completedCount.toLocaleString("ar-LY")}
            </span>
            <span className="text-sm font-black text-blue-200">
              من {referrals.length}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-blue-200">
            ربحت {completedCount * REFERRAL_REWARD_BC} BC من الإحالات
          </p>
        </div>
      </div>

      {/* Code card */}
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          كودك
        </p>
        <button
          type="button"
          onClick={onCopyCode}
          className="
            flex w-full items-center justify-between gap-3 rounded-2xl
            border-2 border-dashed border-purple-500/40 bg-purple-500/10
            p-4 transition hover:border-purple-500/60 hover:bg-purple-500/15
          "
        >
          <span className="font-mono text-base font-black tabular-nums text-white" dir="ltr">
            {code}
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-purple-500/30 text-purple-300">
            {copiedCode ? <Check size={14} /> : <Copy size={14} />}
          </span>
        </button>
      </div>

      {/* Link + share */}
      <div className="space-y-2">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
          رابط الدعوة
        </p>
        <div className="flex items-center gap-2 rounded-2xl bg-slate-900 p-2 ps-3">
          <span
            className="flex-1 truncate font-mono text-[12px] text-slate-300"
            dir="ltr"
          >
            {link}
          </span>
          <button
            type="button"
            onClick={onCopyLink}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-slate-300 transition hover:bg-slate-700"
            aria-label="نسخ"
          >
            {copiedLink ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={onWhatsApp}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-emerald-700 active:scale-95"
          >
            <MessageCircle size={14} />
            WhatsApp
          </button>
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-slate-800 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
          >
            <Share2 size={14} />
            مشاركة
          </button>
        </div>
      </div>

      {/* Referrals list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            دعواتك ({formatReferralsCount(referrals.length)})
          </p>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[9px] font-black text-amber-300">
              {pendingCount} في الانتظار
            </span>
          )}
        </div>

        {loadingList ? (
          <div className="space-y-1.5">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl bg-slate-800/50"
              />
            ))}
          </div>
        ) : referrals.length === 0 ? (
          <div className="rounded-2xl bg-slate-900 p-6 text-center">
            <UsersIcon
              size={28}
              className="mx-auto mb-2 text-slate-600"
            />
            <p className="text-[12px] text-slate-400">
              لم تدعُ أحداً بعد
            </p>
            <p className="mt-1 text-[10px] text-slate-500">
              شارك رابطك مع الأصدقاء لتبدأ
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {referrals.map((r) => (
              <ReferralRow key={r.id} referral={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReferralRow({ referral }: { referral: any }) {
  const isCompleted = referral.status === "completed";
  const isPending = referral.status === "pending";

  const date = referral.createdAt?.toMillis?.()
    ? new Date(referral.createdAt.toMillis()).toLocaleDateString("ar-LY", {
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-800/40 p-3">
      <div
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          isCompleted
            ? "bg-emerald-900/40 text-emerald-400"
            : isPending
            ? "bg-amber-900/40 text-amber-400"
            : "bg-slate-700 text-slate-400"
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 size={14} />
        ) : isPending ? (
          <Clock size={14} />
        ) : (
          <X size={14} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-black text-white" dir="ltr">
          {referral.referredEmail || referral.referredUid.slice(0, 8) + "..."}
        </p>
        <p className="mt-0.5 text-[10px] text-slate-400">
          {date}
          {" · "}
          {isCompleted
            ? "مكتملة - تم صرف المكافأة"
            : isPending
            ? "بانتظار نشر أول إعلان"
            : referral.status === "expired"
            ? "منتهية"
            : "محظورة"}
        </p>
      </div>

      {isCompleted && (
        <div className="text-end">
          <p className="text-[11px] font-black tabular-nums text-emerald-400">
            +{REFERRAL_REWARD_BC} BC
          </p>
        </div>
      )}
    </div>
  );
}
