import Link from "next/link";
import { Plus, ListChecks } from "lucide-react";
import { dashboardStats } from "@/lib/plans";

export function Hero() {
  return (
    <section className="container pt-6 sm:pt-8">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1c389c] px-6 py-8 text-white shadow-blue sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
              سيارات • حافلات • شاحنات • قطع غيار • خدمات
            </span>
            <h1 className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
              سوق السيارات الاحترافي في ليبيا
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/85 sm:text-base sm:leading-8">
              براتشو كار يجمع المركبات وقطع الغيار والورش والخدمات داخل تجربة
              واحدة، أنيقة، سريعة، وموجّهة للهاتف أولاً.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/add-listing" className="btn-action">
                <Plus size={18} /> ابدأ بإضافة إعلان
              </Link>
              <Link
                href="/listings"
                className="btn-secondary !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
              >
                <ListChecks size={18} /> تصفح الإعلانات
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {dashboardStats.map((s) => (
              <div key={s.label} className="stat-card">
                <div className="text-2xl font-black sm:text-3xl">{s.value}</div>
                <div className="mt-1 text-xs text-white/70 sm:text-sm">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
