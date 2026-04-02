import Link from 'next/link';
import { dashboardStats } from '@/lib/mock-data';

export function Hero() {
  return (
    <section className="container pt-8">
      <div className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-ink via-brand-900 to-brand-600 px-6 py-8 text-white shadow-soft sm:px-8 sm:py-10 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <span className="badge bg-white/10 text-white">منصة سيارات • قطع غيار • كماليات • ميكانيكي متنقل</span>
            <h1 className="mt-5 text-4xl font-black leading-tight sm:text-5xl">
              منصة براتشو كار بشكل حقيقي وقابلة للتطوير مثل السوق المفتوح
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-white/80 sm:text-lg">
              مشروع منظم بـ Next.js وFirebase وTailwind وPWA، مع صفحات عامة، صفحة إضافة إعلان، دردشة، مفضلة، حساب مستخدم، ولوحة إدارة.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/add-listing" className="btn-primary bg-white text-brand-800 hover:bg-slate-100">
                ابدأ بإضافة إعلان
              </Link>
              <Link href="/listings" className="btn-secondary border-white/20 bg-white/10 text-white hover:bg-white/20">
                تصفح الإعلانات
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
