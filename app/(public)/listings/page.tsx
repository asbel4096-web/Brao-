import { ListingCard } from '@/components/listing-card';
import { featuredListings } from '@/lib/mock-data';

export default function ListingsPage() {
  return (
    <section className="container py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="card w-full p-5 lg:sticky lg:top-24 lg:max-w-xs">
          <h2 className="text-xl font-black">فلترة سريعة</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">ابحث</label>
              <input className="input" placeholder="أزيرا، كيا، مرسيدس..." />
            </div>
            <div>
              <label className="label">القسم</label>
              <select className="input">
                <option>كل الأقسام</option>
                <option>سيارات</option>
                <option>قطع غيار</option>
                <option>كماليات</option>
                <option>خدمات</option>
              </select>
            </div>
            <div>
              <label className="label">المدينة</label>
              <select className="input">
                <option>كل المدن</option>
                <option>طرابلس</option>
                <option>بنغازي</option>
                <option>مصراتة</option>
                <option>الزاوية</option>
              </select>
            </div>
            <button className="btn-primary w-full">تطبيق الفلترة</button>
          </div>
        </aside>
        <div className="flex-1">
          <div>
            <h1 className="section-title">جميع الإعلانات</h1>
            <p className="section-subtitle">هذه الصفحة جاهزة للربط لاحقًا مع جلب البيانات من Firestore بدل البيانات التجريبية.</p>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {featuredListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
