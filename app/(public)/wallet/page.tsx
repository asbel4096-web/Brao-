"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletEnabled } from "@/hooks/use-wallet-enabled";
import { TopupSheet } from "@/components/wallet/topup-sheet";
import { ReferralsSheet } from "@/components/wallet/referrals-sheet";
import { PlansSheet } from "@/components/wallet/plans-sheet";
import { TransferSheet } from "@/components/wallet/transfer-sheet";
import { BalanceHero } from "@/components/wallet-page/balance-hero";
import { QuickServicesGrid } from "@/components/wallet-page/quick-services-grid";
import { TransactionsSection } from "@/components/wallet-page/transactions-section";
import { BCServicesSection } from "@/components/wallet-page/bc-services-section";
import {
  ActiveVerificationCard,
  VerificationBanner,
} from "@/components/wallet-page/verification-section";

/**
 * صفحة المحفظة الرئيسية - /wallet
 *
 * تصميم مطابق للصورة المرجعية:
 *  - Balance Hero card (gradient أزرق + رصيد + زرّان)
 *  - Quick Services Grid (6 أيقونات دائرية)
 *  - Last Transactions (آخر 5)
 *  - BC Services Cards (4 خدمات قابلة للشراء)
 *  - Active Verification Card (للموثقين) أو Verification Banner (لغير الموثقين)
 *
 * Sheets المُعاد استخدامها:
 *  - TopupSheet, ReferralsSheet, PlansSheet (موجودة من الجولات السابقة)
 */

export default function WalletPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const { enabled: walletEnabled } = useWalletEnabled();

  const [topupOpen, setTopupOpen] = useState(false);
  const [referralsOpen, setReferralsOpen] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  // رصيد المستخدم الحالي (لتمريره للتحويل)
  // ملاحظة: الحقل المعتمد عبر المشروع هو balance (نفس ما يقرأه useWallet
  // ويكتبه approve/boost/verification). كان walletBalance خطأً سابقاً.
  const currentBalance = Number((profile as any)?.balance || 0);

  // Redirect: غير المسجلين → login
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?redirect=/wallet");
  }, [loading, user, router]);

  // لو الأدمن أخفى المحفظة → أعِد للرئيسية
  useEffect(() => {
    if (loading) return;
    if (user && !walletEnabled) {
      const t = setTimeout(() => router.replace("/"), 1500);
      return () => clearTimeout(t);
    }
  }, [loading, user, walletEnabled, router]);

  // Loading state
  if (loading || !user || !profile) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-blue-500" />
      </div>
    );
  }

  // Wallet flag مغلق
  if (!walletEnabled) {
    return (
      <section className="container py-6" dir="rtl">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-base font-black text-slate-700">
            نظام المحفظة غير مفعَّل حالياً
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            سيكون متاحاً قريباً
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="container pb-28 pt-3 sm:pt-5" dir="rtl">
        {/* Header bar */}
        <PageHeader />

        <div className="mt-3 space-y-4">
          {/* 1. Balance Hero */}
          <BalanceHero
            onTopup={() => setTopupOpen(true)}
            onUse={() => {
              // Scroll للـBC services section
              document.getElementById("bc-services-section")?.scrollIntoView({
                behavior: "smooth",
              });
            }}
          />

          {/* 2. Quick Services Grid */}
          <QuickServicesGrid
            onTopup={() => setTopupOpen(true)}
            onReferrals={() => setReferralsOpen(true)}
            onTransfer={() => setTransferOpen(true)}
            onRewards={() => setReferralsOpen(true)}
            onVerification={() => setPlansOpen(true)}
          />

          {/* 3. Last Transactions */}
          <TransactionsSection
            onViewAll={() => router.push("/wallet/transactions")}
          />

          {/* 4. BC Services Cards */}
          <div id="bc-services-section" className="scroll-mt-4">
            <BCServicesSection
              onFeatured={() => router.push("/my-listings")}
              onBoost={() => router.push("/my-listings")}
              onStrongBoost={() => router.push("/my-listings")}
              onVerification={() => setPlansOpen(true)}
            />
          </div>

          {/* 5a. Active Verification Card (للموثقين) */}
          <ActiveVerificationCard onRenew={() => setPlansOpen(true)} />

          {/* 5b. Verification Banner (لغير الموثقين فقط) */}
          <VerificationBanner onStart={() => setPlansOpen(true)} />
        </div>
      </section>

      {/* Sheets */}
      <TopupSheet open={topupOpen} onClose={() => setTopupOpen(false)} />
      <ReferralsSheet
        open={referralsOpen}
        onClose={() => setReferralsOpen(false)}
      />
      <PlansSheet open={plansOpen} onClose={() => setPlansOpen(false)} />
      <TransferSheet
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        currentBalance={currentBalance}
      />
    </>
  );
}

// ============================================================
// Page Header (مكان الـheader الموجود في الصورة)
// ============================================================
function PageHeader() {
  const { profile } = useAuth();
  const avatar = (profile as any)?.dealerLogo || (profile as any)?.photoURL;
  const businessName =
    (profile as any)?.businessName ||
    (profile as any)?.name ||
    "براتشو كار";

  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between"
    >
      {/* Right - avatar + name */}
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          className="
            relative h-11 w-11 overflow-hidden rounded-full
            bg-gradient-to-br from-blue-600 to-blue-800
            ring-2 ring-white shadow-sm
          "
        >
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm font-black text-white">
              BC
            </div>
          )}
          {/* Online indicator */}
          <span className="
            absolute bottom-0 left-0 h-3 w-3 rounded-full
            border-2 border-white bg-orange-500
          " />
        </Link>
        <div>
          <h1 className="text-sm font-black text-slate-900">
            {businessName}
          </h1>
          <p className="text-[10px] font-bold text-orange-600">
            BRATSHO CAR
          </p>
        </div>
      </div>

      {/* Left - bell */}
      <Link
        href="/notifications"
        className="
          relative grid h-11 w-11 place-items-center rounded-full
          bg-white ring-1 ring-slate-200 shadow-sm
          transition hover:bg-slate-50
        "
        aria-label="الإشعارات"
      >
        <Bell size={18} className="text-slate-700" strokeWidth={2} />
      </Link>
    </motion.header>
  );
}
