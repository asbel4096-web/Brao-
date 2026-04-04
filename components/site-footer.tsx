import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 py-12 text-white">
      <div className="container grid gap-8 md:grid-cols-3">
        <div>
          <div className="text-2xl font-black">براتشو كار</div>
          <p className="mt-3 text-sm leading-7 text-white/70">
            مشروع سوق سيارات عربي قريب من تجربة السوق المفتوح، مناسب للتطوير إلى منصة حقيقية للمبيعات والخدمات في ليبيا.
          </p>
        </div>
        <div>
          <h4 className="font-black">روابط سريعة</h4>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div><Link href="/listings">الإعلانات</Link></div>
            <div><Link href="/add-listing">أضف إعلان</Link></div>
            <div><Link href="/pricing">الاشتراكات</Link></div>
            <div><Link href="/admin">لوحة الإدارة</Link></div>
          </div>
        </div>
        <div>
          <h4 className="font-black">خدمات</h4>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            <div>بيع وشراء سيارات</div>
            <div>قطع غيار</div>
            <div>كماليات</div>
            <div>ميكانيكي متنقل</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
