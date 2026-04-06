import { featuredListings } from '@/lib/mock-data';
import { ListingCard } from './listing-card';

export function ListingsGrid() {
  return (
    <section className="container py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="section-title">أحدث الإعلانات</h2>
          <p className="section-subtitle">بطاقات حديثة قابلة للربط لاحقًا مع Firestore وفلترة متقدمة.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {featuredListings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}
