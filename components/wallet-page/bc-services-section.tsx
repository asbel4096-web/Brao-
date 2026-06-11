"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Rocket, ShieldCheck, Sparkles, Zap } from "lucide-react";

/**
 * قسم "خدمات BC" - كروت كبيرة قابلة للشراء.
 *
 * 4 خدمات:
 *  - إعلان مميز (150 BC / أسبوع)
 *  - رفع إعلان للأعلى (25 BC)
 *  - ظهور أقوى (80 BC)
 *  - توثيق معرض (200 BC / شهر)
 */

interface Props {
  onFeatured: () => void;
  onBoost: () => void;
  onStrongBoost: () => void;
  onVerification: () => void;
}

interface ServiceCard {
  key: string;
  title: string;
  description: string;
  price: number;
  duration?: string;
  icon: any;
  gradient: string;
  iconBg: string;
  iconColor: string;
  action: () => void;
}

export function BCServicesSection({
  onFeatured,
  onBoost,
  onStrongBoost,
  onVerification,
}: Props) {
  const services: ServiceCard[] = [
    {
      key: "featured",
      title: "إعلان مميز",
      description: "ظهور إعلانك في الصفحة الرئيسية",
      price: 150,
      duration: "أسبوع",
      icon: Sparkles,
      gradient: "from-blue-500 to-blue-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      action: onFeatured,
    },
    {
      key: "boost",
      title: "رفع إعلان للأعلى",
      description: "رفع إعلانك لأعلى القائمة",
      price: 25,
      icon: Rocket,
      gradient: "from-emerald-500 to-emerald-700",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      action: onBoost,
    },
    {
      key: "strong_boost",
      title: "ظهور أقوى",
      description: "احصل على مشاهدات أكثر",
      price: 80,
      duration: "أسبوع",
      icon: Zap,
      gradient: "from-orange-500 to-orange-600",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      action: onStrongBoost,
    },
    {
      key: "verification",
      title: "توثيق معرض",
      description: "ارفع ثقة العملاء وظهور ضمن المعارض الموثقة",
      price: 200,
      duration: "شهر",
      icon: ShieldCheck,
      gradient: "from-blue-500 to-indigo-700",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
      action: onVerification,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="space-y-3"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-black text-slate-900">
          خدمات BC
        </h2>
        <button
          type="button"
          className="
            inline-flex items-center gap-0.5 text-[12px] font-black
            text-blue-600 hover:text-blue-700
          "
        >
          عرض الكل
          <ChevronLeft size={12} />
        </button>
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {services.map((service, i) => (
          <BCServiceCard key={service.key} service={service} delay={i * 0.05} />
        ))}
      </div>
    </motion.section>
  );
}

function BCServiceCard({
  service,
  delay,
}: {
  service: ServiceCard;
  delay: number;
}) {
  const Icon = service.icon;

  return (
    <motion.button
      type="button"
      onClick={service.action}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay }}
      className="
        group flex w-full items-center gap-4 rounded-[20px]
        bg-white p-3 text-right shadow-sm ring-1 ring-slate-100
        transition hover:shadow-md
      "
    >
      {/* 3D-style icon container */}
      <div className="relative shrink-0">
        <div
          className={`
            absolute inset-0 rounded-2xl ${service.iconBg} blur-md opacity-60
          `}
        />
        <div
          className={`
            relative flex h-16 w-16 items-center justify-center
            rounded-2xl bg-gradient-to-br ${service.gradient}
            shadow-lg
          `}
        >
          <Icon size={26} className="text-white" strokeWidth={2} />
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black text-slate-900">{service.title}</h3>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
          {service.description}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[13px] font-black text-blue-600 tabular-nums">
            {service.price} BC
          </span>
          {service.duration && (
            <>
              <span className="text-slate-300">/</span>
              <span className="text-[11px] font-bold text-slate-500">
                {service.duration}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronLeft
        size={16}
        className="shrink-0 text-slate-300 transition group-hover:text-blue-600"
      />
    </motion.button>
  );
}
