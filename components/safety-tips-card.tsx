"use client";

import { ShieldAlert, MapPin, FileCheck, AlertTriangle } from "lucide-react";

const TIPS = [
  {
    icon: MapPin,
    text: "التقِ في مكان عام وافحص السيارة في ضوء النهار",
  },
  {
    icon: FileCheck,
    text: "تحقّق من تاريخ السيارة ووثائق الملكية",
  },
  {
    icon: AlertTriangle,
    text: "لا تُرسل المال أبدًا قبل رؤية السيارة شخصيًا",
  },
];

export function SafetyTipsCard() {
  return (
    <section
      aria-labelledby="safety-tips-title"
      className="
        relative overflow-hidden rounded-3xl
        border border-amber-500/20
        bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950
        p-5 sm:p-6
        shadow-card
      "
    >
      {/* وهج زخرفي خلفي */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl"
      />

      {/* رأس البطاقة */}
      <div className="relative mb-5 flex items-center gap-3">
        <div
          className="
            flex h-11 w-11 shrink-0 items-center justify-center
            rounded-2xl border border-amber-500/30
            bg-amber-500/10 text-amber-400
          "
        >
          <ShieldAlert size={22} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2
            id="safety-tips-title"
            className="text-base font-black text-white sm:text-lg"
          >
            نصائح للسلامة
          </h2>
          <p className="text-xs text-slate-400 sm:text-sm">
            حافظ على أمانك أثناء التعامل مع البائعين
          </p>
        </div>
      </div>

      {/* قائمة النصائح */}
      <ul className="relative space-y-3">
        {TIPS.map(({ icon: Icon, text }, idx) => (
          <li
            key={idx}
            className="
              flex items-start gap-3
              rounded-2xl border border-white/5
              bg-white/[0.03] p-3.5
              transition-colors hover:bg-white/[0.06]
            "
          >
            <div
              className="
                mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center
                rounded-xl bg-amber-500/15 text-amber-400
              "
            >
              <Icon size={16} aria-hidden="true" />
            </div>
            <p className="text-sm leading-relaxed text-slate-200 sm:text-[15px]">
              {text}
            </p>
          </li>
        ))}
      </ul>

      {/* تذييل */}
      <p className="relative mt-4 text-center text-[11px] text-slate-500">
        براتشو كار غير مسؤول عن أي معاملات تتم خارج المنصة
      </p>
    </section>
  );
}
