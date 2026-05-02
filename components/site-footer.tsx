import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 py-10 text-white dark:border-slate-800">
      <div className="container grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-700 text-base font-black">
              BC
            </div>
            <div>
              <div className="text-xl font-black">براتشو كار</div>
              <div className="text-xs text-white/60">سوق السيارات في ليبيا</div>
            </div>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/70">
            منصة احترافية لبيع وشراء السيارات والقطع والخدمات في كل ربوع ليبيا.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-base font-black">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li><Link href="/listings" className="hover:text-white">كل الإعلانات</Link></li>
            <li><Link href="/add-listing" className="hover:text-white">إضافة إعلان</Link></li>
            <li><Link href="/favorites" className="hover:text-white">المفضلة</Link></li>
            <li><Link href="/pricing" className="hover:text-white">الباقات</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-base font-black">خدماتنا</h4>
          <ul className="space-y-2 text-sm text-white/70">
            <li>بيع وشراء سيارات</li>
            <li>قطع غيار وكماليات</li>
            <li>ورش ومتنقل</li>
            <li>تقارير المركبات</li>
          </ul>
        </div>
      </div>
      <div className="container mt-8 border-t border-white/10 pt-6 text-center text-xs text-white/50">
        © {new Date().getFullYear()} براتشو كار - جميع الحقوق محفوظة.
      </div>
    </footer>
  );
}
