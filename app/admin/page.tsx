import Link from 'next/link';
import { featuredListings } from '@/lib/mock-data';

const cards = [
  { title: 'إعلانات بانتظار المراجعة', value: '18', href: '/admin/listings' },
  { title: 'عدد المستخدمين', value: '4,250', href: '/admin/users' },
  { title: 'الاشتراكات النشطة', value: '312', href: '/admin/subscriptions' },
  { title: 'بلاغات جديدة', value: '7', href: '/admin/listings' }
];

export default function AdminPage() {
  return (
    <section className="container py-10">
      <div>
        <h1 className="section-title">لوحة الإدارة</h1>
        <p className="section-subtitle">واجهة إدارة منظمة لقبول الإعلانات، إدارة المستخدمين، الخطط، والتقارير.</p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link key={card.title} href={card.href} className="card p-6 transition hover:-translate-y-1">
            <div className="text-sm text-slate-500">{card.title}</div>
            <div className="mt-3 text-4xl font-black text-slate-950">{card.value}</div>
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card p-6">
          <h2 className="text-xl font-black">آخر الإعلانات</h2>
          <div className="mt-5 space-y-4">
            {featuredListings.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 p-4">
                <div>
                  <div className="font-black text-slate-950">{item.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{item.city} • {item.status}</div>
                </div>
                <Link href={`/admin/listings`} className="btn-secondary px-4 py-2 text-xs">إدارة</Link>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black">ملاحظات التطوير</h2>
          <ul className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
            <li>• ربط صلاحيات المشرف من خلال claims أو collection خاصة في Firebase.</li>
            <li>• اعتماد الإعلان قبل النشر العام.</li>
            <li>• منع رفع صور ضارة عبر قواعد Storage.</li>
            <li>• إضافة تقارير وإخفاء وحظر مستخدمين لاحقًا.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
