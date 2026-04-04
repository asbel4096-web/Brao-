import Link from 'next/link';
import { dashboardStats } from '@/lib/mock-data';

export function Hero() {
  return (
    <section className="container pt-8">
      <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-brand-900 to-brand-700 px-6 py-8 text-white shadow-2xl sm:px-8 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white/90">سيارات • حافلات • شاحنات • خدمات • قطع غيار • ورش</span>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">منصة سيارات احترافية أقوى تنظيمًا وأوضح عرضًا لتجربة بيع وشراء أسرع داخل ليبيا</h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">براتشو كار تجمع الإعلانات، الورش، الكماليات، وقطع الغيار في واجهة أنيقة وعملية مع حسابات مستخدمين، دردشة، اشتراكات، ولوحة موافقة.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/add-listing" className="btn-primary bg-orange-500 text-white hover:bg-orange-600">ابدأ بإضافة إعلان</Link>
              <Link href="/listings" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">تصفح الإعلانات</Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="rounded-[26px] border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="text-3xl font-black">{stat.value}</div>
                <div className="mt-2 text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
