import Link from 'next/link';
import { dashboardStats } from '@/lib/mock-data';

export function Hero() {
  return (
    <section className="container pt-8">
      <div className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_28%),linear-gradient(135deg,#081224_0%,#183f98_42%,#315fe8_70%,#f97316_100%)] px-6 py-8 text-white shadow-soft sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white backdrop-blur">
              منصة سيارات • قطع غيار • كماليات • ميكانيكي متنقل
            </span>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              براتشو كار بشكل احترافي
              <span className="block text-orange-300">ألوان أوضح وتجربة أقرب للسوق المفتوح</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
              مشروع منظم بـ Next.js و Firebase و Tailwind، مع تصميم واضح، زر إضافة إعلان برتقالي، وصفحات جاهزة للتطوير الفعلي داخل ليبيا.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/add-listing" className="inline-flex items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-[0_12px_30px_rgba(249,115,22,0.28)] transition hover:-translate-y-0.5 hover:bg-orange-600">
                أضف إعلانك الآن
              </Link>
              <Link href="/listings" className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20">
                تصفح الإعلانات
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="rounded-[1.75rem] border border-white/15 bg-white/10 p-5 text-white backdrop-blur">
                <div className="text-3xl font-black">{stat.value}</div>
                <div className="mt-2 text-sm text-white/75">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
