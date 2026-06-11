"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  ChevronLeft,
  Clock,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * 1. ActiveVerificationCard - يظهر للمعارض الموثقة (verifiedUntil > now)
 *    يعرض: اسم المعرض + الخطة + الأيام المتبقية + progress bar + زر تجديد
 *
 * 2. VerificationBanner - يظهر فقط لغير الموثقين
 *    Banner تشجيعي مع صورة سيارة + زر "ابدأ التوثيق"
 */

interface BannerProps {
  onStart: () => void;
}

interface ActiveCardProps {
  onRenew: () => void;
}

// ============================================================
// Active Verification Card (للموثقين)
// ============================================================
export function ActiveVerificationCard({ onRenew }: ActiveCardProps) {
  const { profile } = useAuth();

  // التحقق من التوثيق
  const verifiedUntilMs = (profile as any)?.verifiedUntil?.toMillis?.() || 0;
  const verifiedSinceMs = (profile as any)?.verifiedSince?.toMillis?.() || 0;
  const plan = (profile as any)?.verificationPlan || "basic";
  const isVerified = verifiedUntilMs > Date.now();

  // إن لم يكن موثقاً، لا نُظهر هذه البطاقة
  if (!isVerified) return null;

  const daysRemaining = Math.max(
    0,
    Math.ceil((verifiedUntilMs - Date.now()) / (1000 * 60 * 60 * 24))
  );

  // مدة الخطة بالأيام (لحساب progress)
  const planDurationDays = plan === "annual" ? 365 : 30;
  const totalMs = planDurationDays * 24 * 60 * 60 * 1000;
  const elapsed = verifiedSinceMs > 0 ? Date.now() - verifiedSinceMs : 0;
  const progress = Math.min(100, Math.max(5, ((totalMs - elapsed) / totalMs) * 100));

  const dealerName =
    (profile as any)?.businessName || (profile as any)?.dealerName || "معرضك";

  const planLabel: Record<string, string> = {
    basic: "توثيق أساسي",
    gold: "توثيق ذهبي",
    vip: "توثيق VIP",
    business: "توثيق Business",
    annual: "توثيق سنوي",
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.4 }}
      className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-100"
      dir="rtl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black text-slate-900">
          توثيق المعرض النشط
        </h2>
        <span
          className="
            inline-flex items-center gap-1 rounded-full
            bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700
          "
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          نشط
        </span>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            {(profile as any)?.dealerLogo || (profile as any)?.photoURL ? (
              <Image
                src={(profile as any).dealerLogo || (profile as any).photoURL}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-black text-white">
                {dealerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="truncate text-[13px] font-black text-slate-900">
                {dealerName}
              </p>
              <BadgeCheck
                size={13}
                className="shrink-0 text-blue-600"
                strokeWidth={2.5}
              />
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              الخطة: <span className="font-black text-blue-600">{planLabel[plan] || plan}</span>
            </p>
            <p className="mt-0.5 text-[11px] font-black text-emerald-600">
              ينتهي في {daysRemaining} يوم
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-700"
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>{daysRemaining} يوم متبقية</span>
            <span>من {planDurationDays} يوم</span>
          </div>
        </div>

        {/* Renew button */}
        <motion.button
          type="button"
          onClick={onRenew}
          whileTap={{ scale: 0.97 }}
          className="
            mt-3 inline-flex w-full items-center justify-center gap-1.5
            rounded-2xl border border-blue-200 bg-blue-50 py-2.5
            text-[12px] font-black text-blue-700
            transition hover:bg-blue-100
          "
        >
          <Sparkles size={12} />
          تجديد التوثيق
        </motion.button>
      </div>
    </motion.section>
  );
}

// ============================================================
// Verification Banner (للغير موثقين)
// ============================================================
export function VerificationBanner({ onStart }: BannerProps) {
  const { profile } = useAuth();
  const verifiedUntilMs = (profile as any)?.verifiedUntil?.toMillis?.() || 0;
  const isVerified =
    verifiedUntilMs > Date.now() || (profile as any)?.isVerifiedDealer === true;

  // لا نُظهر الـbanner لو موثَّق
  if (isVerified) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.5 }}
      className="
        relative overflow-hidden rounded-[24px]
        bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800
        p-5 shadow-xl shadow-blue-500/20
      "
      dir="rtl"
    >
      {/* Decorative bg */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex items-center gap-3">
        {/* Shield icon */}
        <div className="
          flex h-12 w-12 shrink-0 items-center justify-center
          rounded-2xl bg-white/20 backdrop-blur-sm
          ring-1 ring-white/20
        ">
          <ShieldCheck size={22} className="text-white" strokeWidth={2.2} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-black text-white">
            وثّق معرضك الآن
          </h3>
          <p className="mt-0.5 text-[11px] leading-5 text-blue-100">
            احصل على الثقة، وظهر ضمن معارض السيارات الموثوقة
          </p>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={onStart}
        whileTap={{ scale: 0.97 }}
        className="
          mt-4 inline-flex w-full items-center justify-center gap-1.5
          rounded-2xl bg-white py-3 text-sm font-black text-blue-700
          shadow-lg transition hover:shadow-xl
        "
      >
        ابدأ التوثيق
        <ChevronLeft size={14} />
      </motion.button>
    </motion.section>
  );
}
