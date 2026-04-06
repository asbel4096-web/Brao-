import Link from "next/link";
import {
  CarFront,
  Wrench,
  ShieldCheck,
  Settings2,
  Truck,
  Search
} from "lucide-react";

const categories = [
  {
    title: "السيارات",
    desc: "جديد، مستعمل، محلي، استيراد",
    href: "/listings?category=سيارات",
    icon: CarFront
  },
  {
    title: "قطع الغيار",
    desc: "أصلية وتجارية ومحركات",
    href: "/listings?category=قطع غيار",
    icon: Settings2
  },
  {
    title: "الكماليات",
    desc: "شاشات، جنوط، زينة",
    href: "/listings?category=كماليات",
    icon: ShieldCheck
  },
  {
    title: "الميكانيكي المتنقل",
    desc: "خدمة سريعة داخل المدينة",
    href: "/listings?category=ميكانيكي متنقل",
    icon: Wrench
  },
  {
    title: "الشاحنات",
    desc: "شاحنات نقل ومعدات",
    href: "/listings?category=شاحنات",
    icon: Truck
  }
];

const featured = [
  {
    title: "مرسيدس E350",
    price: "65,000 د.ل",
    city: "طرابلس",
    href: "/listings"
  },
  {
    title: "كيا أوبتيما 2012",
    price: "28,700 د.ل",
    city: "مصراتة",
    href: "/listings"
  },
  {
    title: "قطع غيار هيونداي",
    price: "على السوم",
    city: "بنغازي",
    href: "/listings"
  }
];

const latest = [
  {
    title: "هونداي سنتافي 2014",
    price: "51,000 د.ل",
    city: "طرابلس",
    href: "/listings"
  },
  {
    title: "هيونداي سوناتا 2012",
    price: "9,999 د.ل",
    city: "الزاوية",
    href: "/listings"
  },
  {
    title: "كيا 2012",
    price: "28,700 د.ل",
    city: "زليتن",
    href: "/listings"
  },
  {
    title: "تويوتا هايلوكس 1988",
    price: "40,000 د.ل",
    city: "سبها",
    href: "/listings"
  }
];

export default function HomePage() {
  return (
    <section className="container pb-8">
      <div className="grid gap-6">
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 rounded-[20px] bg-slate-100 px-4 py-4 dark:bg-slate-800">
            <Search className="h-6 w-6 text-slate-500" />
            <input
              type="text"
              placeholder="ابحث عن سيارة، قطعة، خدمة..."
              className="w-full bg-transparent text-right text-lg outline-none placeholder:text-slate-400"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {["سيارات", "قطع غيار", "خدمات", "ورش", "شاحنات"].map((item) => (
              <Link
                key={item}
                href={`/listings?category=${encodeURIComponent(item)}`}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
              >
                {item}
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white">
              الأقسام
            </h2>
            <Link
              href="/listings"
              className="text-lg font-extrabold text-blue-600"
            >
              المزيد
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[20px] bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-8 w-8 text-blue-700" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-base leading-7 text-slate-500 dark:text-slate-300">
                    {item.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white">
              إعلانات مقترحة
            </h2>
            <Link
              href="/listings"
              className="text-lg font-extrabold text-blue-600"
            >
              المزيد
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {featured.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="relative h-44 bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                  <div className="absolute bottom-3 right-3 rounded-xl bg-black/80 px-3 py-2 text-sm font-black text-white">
                    {item.price}
                  </div>
                </div>

                <div className="p-4 text-right">
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                    {item.city}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white">
              آخر الإعلانات
            </h2>
            <Link
              href="/listings"
              className="text-lg font-extrabold text-blue-600"
            >
              المزيد
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {latest.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="relative h-52 bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                  <div className="absolute bottom-3 right-3 rounded-xl bg-black/85 px-3 py-2 text-sm font-black text-white">
                    {item.price}
                  </div>
                </div>

                <div className="p-4 text-right">
                  <h3 className="text-2xl font-black text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-base text-slate-500 dark:text-slate-300">
                    {item.city}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
