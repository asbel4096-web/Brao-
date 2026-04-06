import { CarFront, Cog, ShieldCheck, Wrench } from 'lucide-react';

const categories = [
  { title: 'السيارات', desc: 'جديد، مستعمل، محلي، استيراد', icon: CarFront },
  { title: 'قطع الغيار', desc: 'أصلية وتجارية ومحركات', icon: Cog },
  { title: 'الكماليات', desc: 'شاشات، جنوط، زينة', icon: ShieldCheck },
  { title: 'الميكانيكي المتنقل', desc: 'خدمات فورية داخل المدن', icon: Wrench }
];

export function CategoryGrid() {
  return (
    <section className="container py-10">
      <div>
        <h2 className="section-title">الأقسام الرئيسية</h2>
        <p className="section-subtitle">هيكل مشابه للمنصات الكبيرة لكن بهوية براتشو كار وأسلوب عربي مناسب لليبيا.</p>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {categories.map(({ title, desc, icon: Icon }) => (
          <div key={title} className="card p-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
              <Icon size={24} />
            </div>
            <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
