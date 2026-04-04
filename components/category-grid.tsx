import Link from 'next/link';
import { Bus, CarFront, CircleDashed, Cog, Droplets, LifeBuoy, PaintRoller, Settings2, ShieldCheck, Sparkles, Truck, Wrench } from 'lucide-react';
import { CATEGORY_GROUPS } from '@/lib/constants';

const iconMap: Record<string, any> = {
  cars: CarFront,
  buses: Bus,
  trucks: Truck,
  services: ShieldCheck,
  accessories: Sparkles,
  oils_additives: Droplets,
  mobile_mechanic: Wrench,
  tires_wheels: CircleDashed,
  parts_cars_trucks: Cog,
  electrical_parts: Settings2,
  body_paint: PaintRoller,
  mechanic_workshops: Wrench,
  auto_electrician: Settings2,
  damaged_cars: LifeBuoy,
  used_parts: Cog
};

export function CategoryGrid() {
  return (
    <section className="container py-10">
      <div>
        <h2 className="section-title">الأقسام الرئيسية</h2>
        <p className="section-subtitle">واجهة احترافية مستوحاة من المنصات الكبيرة لكن بهوية براتشو كار وتركيز كامل على السيارات والخدمات وقطع الغيار في ليبيا.</p>
      </div>
      <div className="mt-8 space-y-6">
        {CATEGORY_GROUPS.map((group) => (
          <div key={group.title} className="card p-5 sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-950">{group.title}</h3>
              <Link href="/listings" className="text-sm font-bold text-brand-700">عرض الكل</Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.items.map((item) => {
                const Icon = iconMap[item.key] || CarFront;
                return (
                  <Link key={item.key} href={`/listings?category=${encodeURIComponent(item.label)}`} className="rounded-[26px] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 transition hover:-translate-y-1 hover:border-brand-200 hover:shadow-card">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-brand-50 text-brand-700">
                      <Icon size={28} />
                    </div>
                    <div className="mt-4 text-lg font-black text-slate-950">{item.label}</div>
                    <p className="mt-2 text-sm leading-7 text-slate-500">{item.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
