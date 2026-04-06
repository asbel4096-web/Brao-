type BrandLogoProps = {
  compact?: boolean;
};

export default function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div
      className={`flex items-center gap-3 ${
        compact ? "gap-2" : "gap-4"
      }`}
      dir="rtl"
    >
      <div
        className={`flex items-center justify-center rounded-[22px] bg-[#2F49C8] text-white font-black shadow-[0_12px_24px_rgba(47,73,200,0.28)] ${
          compact ? "h-12 w-12 text-xl" : "h-16 w-16 text-3xl"
        }`}
      >
        BC
      </div>

      <div className="flex flex-col leading-none">
        <span
          className={`font-black text-slate-950 dark:text-white ${
            compact ? "text-xl" : "text-3xl"
          }`}
        >
          براتشو كار
        </span>
        <span
          className={`mt-1 text-slate-500 dark:text-slate-300 ${
            compact ? "text-[11px]" : "text-sm"
          }`}
        >
          سوق السيارات وقطع الغيار في ليبيا
        </span>
      </div>
    </div>
  );
}
