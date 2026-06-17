"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Settings,
  Gift,
  ShieldCheck,
  Send,
  UserPlus,
  Zap,
  LucideIcon,
} from "lucide-react";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";

/**
 * شبكة الخدمات السريعة - 6 أيقونات دائرية ملوّنة.
 *
 * مطابقة للتصميم:
 *  - شحن رصيد (أزرق)
 *  - دعوة صديق (برتقالي)
 *  - تحويل رصيد (أخضر - placeholder)
 *  - المكافآت (بنفسجي)
 *  - توثيق معرض (أزرق)
 *  - الإعدادات (رمادي)
 */

interface ServiceItem {
  key: string;
  label: string;
  icon: LucideIcon;
  bgClass: string;       // خلفية الدائرة
  iconClass: string;     // لون الأيقونة
  action: () => void;
  badge?: string;
  disabled?: boolean;
}

interface Props {
  onTopup: () => void;
  onReferrals: () => void;
  onTransfer?: () => void;
  onRewards: () => void;
  onVerification: () => void;
  onSettings?: () => void;
}

export function QuickServicesGrid({
  onTopup,
  onReferrals,
  onTransfer,
  onRewards,
  onVerification,
  onSettings,
}: Props) {
  const router = useRouter();
  const referralsEnabled = useFeatureFlag("referrals");

  const services: ServiceItem[] = [
    {
      key: "topup",
      label: "شحن رصيد",
      icon: Send,
      bgClass: "bg-action-50 dark:bg-action-500/15",
      iconClass: "text-action-600 dark:text-action-300",
      action: onTopup,
    },
    {
      key: "referrals",
      label: "دعوة صديق",
      icon: UserPlus,
      bgClass: "bg-brand-50 dark:bg-brand-500/15",
      iconClass: "text-brand-600 dark:text-brand-300",
      action: onReferrals,
      disabled: !referralsEnabled,
    },
    {
      key: "transfer",
      label: "تحويل رصيد",
      icon: Zap,
      bgClass: "bg-emerald-50 dark:bg-emerald-500/15",
      iconClass: "text-emerald-600 dark:text-emerald-300",
      action: () => onTransfer?.(),
    },
    {
      key: "rewards",
      label: "المكافآت",
      icon: Gift,
      bgClass: "bg-amber-50 dark:bg-amber-500/15",
      iconClass: "text-amber-600 dark:text-amber-300",
      action: onRewards,
    },
    {
      key: "verification",
      label: "توثيق معرض",
      icon: ShieldCheck,
      bgClass: "bg-brand-50 dark:bg-brand-500/15",
      iconClass: "text-brand-600 dark:text-brand-300",
      action: onVerification,
    },
    {
      key: "settings",
      label: "الإعدادات",
      icon: Settings,
      bgClass: "bg-slate-100 dark:bg-slate-800",
      iconClass: "text-slate-600 dark:text-slate-300",
      action: () => onSettings?.() || router.push("/profile"),
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="rounded-[24px] bg-white p-4 shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800"
      dir="rtl"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Zap size={16} className="text-action-500" />
        <h2 className="text-sm font-black text-slate-900 dark:text-white">
          الخدمات السريعة
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-3">
        {services.map((service, i) => (
          <ServiceButton key={service.key} service={service} delay={i * 0.03} />
        ))}
      </div>
    </motion.section>
  );
}

function ServiceButton({
  service,
  delay,
}: {
  service: ServiceItem;
  delay: number;
}) {
  const Icon = service.icon;
  return (
    <motion.button
      type="button"
      onClick={service.action}
      disabled={service.disabled}
      whileTap={{ scale: 0.92 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="
        relative flex flex-col items-center gap-2 py-2
        disabled:opacity-50 disabled:cursor-not-allowed
      "
    >
      {/* Circular icon */}
      <div
        className={`
          relative flex h-14 w-14 items-center justify-center
          rounded-2xl ${service.bgClass}
          shadow-sm transition-shadow
        `}
      >
        <Icon size={22} className={service.iconClass} strokeWidth={2} />

        {service.badge && (
          <span className="
            absolute -top-1 -right-1 rounded-full
            bg-amber-500 px-1.5 py-0.5 text-[8px] font-black text-white
            shadow ring-2 ring-white
          ">
            {service.badge}
          </span>
        )}
      </div>

      {/* Label */}
      <span className="text-[11px] font-bold text-slate-700 leading-tight dark:text-slate-300">
        {service.label}
      </span>
    </motion.button>
  );
}
