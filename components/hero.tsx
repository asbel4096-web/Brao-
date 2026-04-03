import Link from 'next/link';
import { dashboardStats } from '@/lib/mock-data';

export function Hero() {
  return (
    <section className="container pt-8">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071133] via-[#0a1d55] to-[#1f63ff] px-6 py-8 text-white shadow-soft sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="badge bg-white/10 text-white">سيارات • حافلات • شاحنات • خدمات • ورش • قطع غيار</span>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              سوق سيارات احترافي لليبيا بمستوى أقوى في التنظيم والعرض والبيع
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/85 sm:text-lg">
              براتشو كار يجمع المركبات، القطع، الخدمات، الورش، والإعلانات الخاصة بالحوادث والبدائل المستعملة داخل تجربة واحدة مرتبة وقابلة للتوسع.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/add-listing" className="btn-primary bg-[#ff7a18] text-white hover:bg-[#ea6d10]">
                ابدأ بإضافة إعلان
              </Link>
              <Link href="/listings" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">
                تصفح كل الإعلانات
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {dashboardStats.map((stat) => (
              <div key={stat.label} className="stat-card">
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
