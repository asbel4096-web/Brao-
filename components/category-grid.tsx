import Link from 'next/link';
import { marketplaceSections } from '@/lib/categories';
import { Car, Bus, Truck, Wrench, Cog, ShieldAlert, Sparkles } from 'lucide-react';

const icons = [Car, Cog, Wrench, ShieldAlert];

export function CategoryGrid() {
  return (
    <section className="container py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">أقسام براتشو كار</h2>
          <p className="section-subtitle">تقسيم احترافي موجه لسيارات ليبيا، الخدمات، الورش، وقطع الغيار بشكل أوضح وأقوى.</p>
        </div>
        <Link href="/add-listing" className="hidden rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white md:inline-flex">
          أضف إعلانك داخل القسم المناسب
        </Link>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {marketplaceSections.map((section, index) => {
          const Icon = icons[index] ?? Sparkles;
          return (
            <div key={section.title} className="card overflow-hidden p-0">
              <div className={`bg-gradient-to-l ${section.accent} p-6 text-white`}>
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white/15 p-3">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black">{section.title}</h3>
                    <p className="mt-1 text-sm text-white/80">واجهة مرتبة للمعلنين والمشترين وأصحاب الورش.</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="grid gap-3 sm:grid-cols-2">
                  {section.items.map((item) => (
                    <Link
                      key={item}
                      href={`/listings?category=${encodeURIComponent(item)}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-bold text-slate-800 transition hover:border-brand-200 hover:bg-brand-50"
                    >
                      {item}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-[2rem] border border-brand-100 bg-white p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-2xl font-black text-slate-950">واجهة أقوى من التصنيف التقليدي</h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
              تم تقسيم المنصة حسب الاستخدام الفعلي في السوق الليبي: بيع مركبات، خدمات متنقلة، أصحاب الورش، الإعلانات الخاصة بالحوادث والقطع المستعملة.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm font-bold text-slate-700">
            <span className="rounded-full bg-slate-100 px-4 py-2">سيارات</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">خدمات</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">ورش</span>
            <span className="rounded-full bg-slate-100 px-4 py-2">قطع غيار</span>
          </div>
        </div>
      </div>
    </section>
  );
}
