import Link from "next/link";
import {
  CarFront,
  Wrench,
  ShieldCheck,
  Settings2,
  Truck,
  Search,
  Sparkles
} from "lucide-react";
import ListingCard from "@/components/listing-card";

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
  },
  {
    title: "الخدمات",
    desc: "كهرباء، صيانة، فحص، سحب",
    href: "/listings?category=خدمات",
    icon: Sparkles
  }
];

const featured = [
  {
    id: "1",
    title: "مرسيدس E350",
    price: "65,000 د.ل",
    city: "طرابلس",
    year: "2014",
    condition: "مستعمل"
  },
  {
    id: "2",
    title: "كيا أوبتيما 2012",
    price: "28,700 د.ل",
    city: "مصراتة",
    year: "2012",
    condition: "مستعمل"
  },
  {
    id: "3",
    title: "هيونداي أزيرا",
    price: "22,800 د.ل",
    city: "بنغازي",
    year: "2012",
    condition: "مستعمل"
  }
];

const latest = [
  {
    id: "4",
    title: "هونداي سنتافي 2014",
    price: "51,000 د.ل",
    city: "طرابلس",
    year: "2014",
    condition: "جديد"
  },
  {
    id: "5",
    title: "هيونداي سوناتا 2012",
    price: "9,999 د.ل",
    city: "الزاوية",
    year: "2012",
    condition: "مستعمل"
  },
  {
    id: "6",
    title: "تويوتا هايلوكس 1988",
    price: "40,000 د.ل",
    city: "سبها",
    year: "1988",
    condition: "مستعمل"
  },
  {
    id: "7",
    title: "قطع غيار هيونداي",
    price: "على السوم",
    city: "زليتن",
    condition: "متوفر"
  }
];

export default function HomePage() {
  return (
    <section className="container pb-8">
      <div className="grid gap-6">
        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 rounded-[18px] bg-slate-100 px-4 py-4 dark:bg-slate-800">
            <Search className="h-5 w-5 text-slate-500" />
            <input
              type="text"
              placeholder="ابحث عن سيارة، قطعة، خدمة..."
              className="w-full bg-transparent text-right text-base outline-none placeholder:text-slate-400"
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

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              الأقسام
            </h2>
            <Link href="/listings" className="text-sm font-extrabold text-blue-600">
              المزيد
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {categories.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.title}
                  href={item.href}
                  className="rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-right transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-950"
                >
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-slate-100 dark:bg-slate-800">
                    <Icon className="h-7 w-7 text-[#2F49C8]" />
                  </div>
                  <h3 className="text-xl font-black text-slate-950 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-300">
                    {item.desc}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              إعلانات مقترحة
            </h2>
            <Link href="/listings" className="text-sm font-extrabold text-blue-600">
              المزيد
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price}
                city={listing.city}
                year={listing.year}
                condition={listing.condition}
              />
            ))}
          </div>
        </section>

        <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-950 dark:text-white">
              آخر الإعلانات
            </h2>
            <Link href="/listings" className="text-sm font-extrabold text-blue-600">
              المزيد
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {latest.map((listing) => (
              <ListingCard
                key={listing.id}
                id={listing.id}
                title={listing.title}
                price={listing.price}
                city={listing.city}
                year={listing.year}
                condition={listing.condition}
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
