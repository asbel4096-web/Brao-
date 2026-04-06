import Link from "next/link";

const stats = [
  { value: "+25K", label: "إعلان نشط" },
  { value: "+1500", label: "مستخدم" },
  { value: "+20", label: "قسم" }
];

const categories = [
  "سيارات",
  "حافلات",
  "شاحنات",
  "خدمات",
  "ورش",
  "قطع غيار"
];

const features = [
  {
    title: "إعلانات مرتبة",
    text: "عرض واضح وسريع للعروض مع صور ومعلومات أساسية تساعد المشتري يقرر بسرعة."
  },
  {
    title: "خدمات وورش",
    text: "مكان واحد للخدمات، الورش، السمكرة، الكهرباء، والميكانيكي المتنقل."
  },
  {
    title: "قطع وكماليات",
    text: "تجميع منظم لقطع الغيار، الكماليات، الزيوت، والإطارات داخل أقسام واضحة."
  }
];

export default function HomePage() {
  return (
    <section className="container pb-10">
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-[36px] bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-8 text-white shadow-2xl md:px-10 md:py-12">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              {categories.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="grid items-center gap-8 md:grid-cols-[1.15fr_0.85fr]">
              <div>
                <h1 className="text-4xl font-black leading-tight md:text-6xl">
                  سوق سيارات احترافي
                  <br />
                  لليبيا بمستوى أقوى
                  <br />
                  في التنظيم والعرض
                  <br />
                  والبيع
                </h1>

                <p className="mt-6 max-w-3xl text-lg leading-8 text-white/75 md:text-xl">
                  براتشو كار يجمع المركبات، القطع، الخدمات، الورش، والإعلانات
                  الخاصة بالحوادث والبدائل المستعملة داخل تجربة واحدة مرتبة
                  وقابلة للتوسع.
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/add-listing"
                    className="rounded-[22px] bg-orange-500 px-8 py-4 text-lg font-black text-white shadow-lg transition hover:scale-[1.02]"
                  >
                    ابدأ بإضافة إعلان
                  </Link>

                  <Link
                    href="/listings"
                    className="rounded-[22px] bg-white px-8 py-4 text-lg font-black text-slate-950 shadow-lg transition hover:scale-[1.02]"
                  >
                    تصفح كل الإعلانات
                  </Link>
                </div>
              </div>

              <div className="grid gap-4">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur"
                  >
                    <div className="text-4xl font-black">{item.value}</div>
                    <div className="mt-2 text-white/65">{item.label}</div>
                  </div>
                ))}

                <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur">
                  <div className="text-lg font-black">منصة واحدة</div>
                  <div className="mt-2 leading-7 text-white/70">
                    سيارات، خدمات، ورش، كماليات، قطع جديدة ومستعملة، وتقارير
                    مركبات.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          {features.map((item) => (
            <div
              key={item.title}
              className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-2xl font-black text-slate-950 dark:text-white">
                {item.title}
              </h2>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                {item.text}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-3xl font-black text-slate-950 dark:text-white">
                ابدأ الآن داخل براتشو كار
              </h3>
              <p className="mt-3 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                أضف إعلانك، تصفح السوق، تابع تقارير المركبات، وخلّي العميل يوصل
                لك بسرعة من خلال واجهة مرتبة وواضحة.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/add-listing"
                className="rounded-[20px] bg-orange-500 px-6 py-4 text-base font-black text-white"
              >
                إضافة إعلان
              </Link>

              <Link
                href="/vehicle-report"
                className="rounded-[20px] border border-slate-300 bg-white px-6 py-4 text-base font-black text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              >
                تقرير المركبة
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}
