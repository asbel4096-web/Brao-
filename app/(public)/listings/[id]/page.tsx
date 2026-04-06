import StartChatButton from "@/components/StartChatButton";
import Link from "next/link";
import {
  CalendarDays,
  Fuel,
  Gauge,
  MapPin,
  Phone,
  Share2,
  Heart,
  CarFront,
  ChevronLeft
} from "lucide-react";

const listing = {
  id: "1",
  title: "هيونداي ازيرا Standard",
  price: "22,800 د.ل",
  year: "2012",
  mileage: "160000 km",
  fuel: "بنزين",
  city: "طرابلس",
  spec: "مواصفات كوريا",
  phone: "09188233XX",
  locationLabel: "أبو سليم، طرابلس",
  description:
    "سيارة نظيفة وجاهزة، محرك ممتاز وصالة مرتبة، استعمال شخصي، أوراق جاهزة، والمعاينة خير دليل.",
  seller: {
    id: "seller_uid_demo",
    name: "ابن البادية",
    joined: "05-04-2026",
    listingsCount: 1
  }
};

const quickQuestions = ["أنا مهتم", "قداش نهايتها", "وين مكانك", "في توصيل"];

const similarListings = [
  { id: "2", title: "هيونداي ازيرا 2012", price: "24,800 د.ل", city: "طرابلس" },
  { id: "3", title: "هيونداي ازيرا 2012", price: "25,000 د.ل", city: "عين زارة" },
  { id: "4", title: "هيونداي ازيرا 2012", price: "20,800 د.ل", city: "السراج" },
  { id: "5", title: "هيونداي ازيرا 2012", price: "25,000 د.ل", city: "خوط الشعال" }
];

export default function ListingDetailsPage() {
  return (
    <section className="container pb-10">
      <div className="grid gap-5">
        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="relative h-[320px] bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
            <div className="absolute left-4 top-4 flex gap-2">
              <button className="rounded-2xl bg-white/90 p-3 text-slate-900 shadow">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="rounded-2xl bg-white/90 p-3 text-rose-500 shadow">
                <Heart className="h-5 w-5" />
              </button>
            </div>

            <div className="absolute bottom-4 right-4 rounded-2xl bg-black/80 px-4 py-2 text-lg font-black text-white">
              {listing.price}
            </div>
          </div>

          <div className="p-5 text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {listing.spec}
                </div>
                <h1 className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
                  {listing.title}
                </h1>
              </div>

              <button className="rounded-2xl border border-slate-200 p-3 text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <CalendarDays className="h-4 w-4" />
                  <span className="text-sm">السنة</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.year}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <Gauge className="h-4 w-4" />
                  <span className="text-sm">المسافة</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.mileage}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <Fuel className="h-4 w-4" />
                  <span className="text-sm">الوقود</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.fuel}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800">
                <div className="flex items-center justify-end gap-2 text-slate-500 dark:text-slate-300">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">المدينة</span>
                </div>
                <div className="mt-2 text-xl font-black text-slate-950 dark:text-white">
                  {listing.city}
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <a
                href={`tel:${listing.phone}`}
                className="flex items-center justify-center gap-3 rounded-[22px] bg-blue-600 px-6 py-4 text-xl font-black text-white shadow-sm"
              >
                <Phone className="h-5 w-5" />
                {listing.phone}
              </a>

              <StartChatButton
                listingId={listing.id}
                listingTitle={listing.title}
                sellerId={listing.seller.id}
                sellerName={listing.seller.name}
              />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">
            وصف الإعلان
          </h2>
          <p className="mt-4 text-lg leading-9 text-slate-600 dark:text-slate-300">
            {listing.description}
          </p>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4">
            <div className="text-right">
              <h2 className="text-3xl font-black text-slate-950 dark:text-white">
                الموقع
              </h2>
              <p className="mt-2 text-lg text-slate-500 dark:text-slate-300">
                {listing.locationLabel}
              </p>
            </div>

            <MapPin className="h-7 w-7 text-slate-700 dark:text-slate-200" />
          </div>

          <div className="mt-4 flex h-40 items-center justify-center rounded-[24px] bg-slate-100 text-xl font-black text-blue-600 dark:bg-slate-800">
            عرض على الخريطة
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">
            اسأل المعلن
          </h2>

          <div className="mt-4 flex flex-wrap gap-3">
            {quickQuestions.map((q) => (
              <button
                key={q}
                className="rounded-full bg-blue-50 px-5 py-3 text-base font-extrabold text-blue-700 dark:bg-slate-800 dark:text-blue-300"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3">
            <textarea
              placeholder="رسالة نصية..."
              className="min-h-[120px] rounded-[22px] border border-slate-300 bg-white px-4 py-4 text-right outline-none dark:border-slate-700 dark:bg-slate-950"
            />
            <button className="mr-auto rounded-[18px] bg-slate-400 px-6 py-4 text-lg font-black text-white">
              أرسل رسالة
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-3xl font-black text-slate-950 dark:text-white">
            بيانات المعلن
          </h2>

          <div className="mt-5 flex items-center justify-between gap-4 rounded-[24px] bg-slate-50 p-4 dark:bg-slate-800">
            <div className="text-right">
              <div className="text-2xl font-black text-slate-950 dark:text-white">
                {listing.seller.name}
              </div>
              <div className="mt-2 text-base text-blue-600">
                شاهد الإعلانات ({listing.seller.listingsCount})
              </div>
              <div className="mt-3 text-sm text-slate-500 dark:text-slate-300">
                عضو منذ {listing.seller.joined}
              </div>
            </div>

            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-500 bg-slate-200 text-slate-500 dark:bg-slate-700">
              <CarFront className="h-10 w-10" />
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white">
              إعلانات مشابهة
            </h2>
            <Link href="/listings" className="text-lg font-extrabold text-blue-600">
              المزيد
            </Link>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {similarListings.map((item) => (
              <Link
                key={item.id}
                href={`/listings/${item.id}`}
                className="overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="relative h-48 bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                  <div className="absolute bottom-3 right-3 rounded-xl bg-black/85 px-3 py-2 text-sm font-black text-white">
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
      </div>
    </section>
  );
}
