"use client";

import { motion } from "framer-motion";
import { ChevronLeft, Rocket, Crown, Sparkles, Zap, type LucideIcon } from "lucide-react";
import { usePromoPricing } from "@/hooks/wallet/use-promo-pricing";
import {
  PROMO_KEYS,
  PROMO_META,
  type PromoServiceKey,
} from "@/lib/wallet/promo-pricing";

/**
 * قسم "باقات الترقية" — الباقات الحقيقية بالأسعار الديناميكية.
 *
 * يعرض الباقات الأربع (مميّز/مموّل/VIP/عاجل) بأسعارها الفعّالة (المُدارة
 * من لوحة الأدمن عبر usePromoPricing). الضغط على أي باقة يأخذ المستخدم
 * لاختيار إعلان لتطبيقها عليه (حيث تتم العملية الفعلية في boost-sheet).
 */

interface Props {
  /** يُستدعى عند اختيار أي باقة — عادةً ينتقل إلى "إعلاناتي". */
  onChoose: (key: PromoServiceKey) => void;
}

const CARD_STYLE: Record<
  PromoServiceKey,
  { icon: LucideIcon; gradient: string; priceColor: string; badge?: string }
> = {
  featured: {
    icon: Sparkles,
    gradient: "from-brand-500 to-brand-700",
    priceColor: "text-brand-600 dark:text-brand-300",
  },
  boost: {
    icon: Rocket,
    gradient: "from-action-500 to-action-600",
    priceColor: "text-action-600 dark:text-action-300",
    badge: "الأكثر طلباً",
  },
  vip: {
    icon: Crown,
    gradient: "from-amber-400 to-amber-600",
    priceColor: "text-amber-600 dark:text-amber-300",
    badge: "الأقوى",
  },
  urgent: {
    icon: Zap,
    gradient: "from-rose-500 to-rose-600",
    priceColor: "text-rose-600 dark:text-rose-300",
  },
};

export function BCServicesSection({ onChoose }: Props) {
  const { pricing } = usePromoPricing();

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
        <h2 className="text-sm font-black text-slate-900 dark:text-white">
          باقات الترقية
        </h2>
        <span className="text-[11px] font-bold text-slate-400">
          تُطبَّق على إعلاناتك
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
        {PROMO_KEYS.map((key, i) => (
          <BCServiceCard
            key={key}
            promoKey={key}
            price={pricing[key]}
            delay={i * 0.05}
            onChoose={onChoose}
          />
        ))}
      </div>
    </motion.section>
  );
}

function BCServiceCard({
  promoKey,
  price,
  delay,
  onChoose,
}: {
  promoKey: PromoServiceKey;
  price: number;
  delay: number;
  onChoose: (key: PromoServiceKey) => void;
}) {
  const meta = PROMO_META[promoKey];
  const style = CARD_STYLE[promoKey];
  const Icon = style.icon;

  return (
    <motion.button
      type="button"
      onClick={() => onChoose(promoKey)}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay }}
      className="group relative flex w-full items-center gap-4 rounded-[20px] bg-white p-3 text-right shadow-sm ring-1 ring-slate-100 transition hover:shadow-md dark:bg-slate-900 dark:ring-slate-800"
    >
      {/* شارة تسويقية */}
      {style.badge && (
        <span className="absolute -top-2 left-3 rounded-full bg-gradient-to-l from-action-500 to-action-600 px-2.5 py-0.5 text-[9px] font-black text-white shadow-sm">
          {style.badge}
        </span>
      )}

      {/* أيقونة الباقة */}
      <div className="relative shrink-0">
        <div
          className={`relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${style.gradient} shadow-lg`}
        >
          <Icon size={26} className="text-white" strokeWidth={2} />
        </div>
      </div>

      {/* المحتوى */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">
            {meta.label}
          </h3>
          <span className="text-sm">{meta.emoji}</span>
        </div>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
          {meta.hint}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`text-[14px] font-black tabular-nums ${style.priceColor}`}>
            {price.toLocaleString("en-US")} BC
          </span>
          <span className="text-slate-300 dark:text-slate-600">/</span>
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {meta.durationDays} يوم
          </span>
        </div>
      </div>

      {/* سهم */}
      <ChevronLeft
        size={16}
        className="shrink-0 text-slate-300 transition group-hover:-translate-x-0.5 group-hover:text-brand-500 dark:text-slate-600"
      />
    </motion.button>
  );
}
