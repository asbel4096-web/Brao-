import Link from 'next/link';

const categories = [
  'سيارات',
  'حافلات',
  'شاحنات',
  'خدمات',
  'ورش',
  'قطع غيار'
];

export function Hero() {
  return (
    <section className="container pt-2">
      <div className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-5 py-7 text-white shadow-2xl md:px-8 md:py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 flex flex-wrap gap-2">
            {categories.map((item) => (
              <span
                key={item}
                className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur"
              >
                {item}
              </span>
            ))}
          </div>

          <div className="grid items-center gap-8 md:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h1 className="text-4xl font-black leading-tight md:text-6xl">
                سوق سيارات احترافي
                <br />
                داخل ليبيا
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-white/75">
                براتشو كار يجمع السيارات، قطع الغيار، الورش، والخدمات
                في واجهة واحدة مرتبة وسريعة وواضحة.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/add-listing"
                  className="rounded-[20px] bg-orange-500 px-7 py-4 text-base font-black text-white shadow-[0_14px_30px_rgba(249,115,22,0.28)]"
                >
                  ابدأ بإضافة إعلان
                </Link>

                <Link
                  href="/listings"
                  className="rounded-[20px] bg-white px-7 py-4 text-base font-black text-slate-950"
                >
                  تصفح الإعلانات
                </Link>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/60">إعلانات نشطة</div>
                <div className="mt-2 text-4xl font-black">+25K</div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/60">مستخدمون</div>
                <div className="mt-2 text-4xl font-black">+1500</div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="text-sm text-white/60">أقسام السوق</div>
                <div className="mt-2 text-4xl font-black">+20</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
