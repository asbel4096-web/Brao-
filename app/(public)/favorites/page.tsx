import ListingCard from "@/components/listing-card";
import { featuredListings } from "@/lib/mock-data";

export default function FavoritesPage() {
  return (
    <section className="container py-10">
      <h1 className="section-title">الإعلانات المفضلة</h1>
      <p className="section-subtitle">
        واجهة جاهزة لربط مفضلة المستخدمين حسب الحساب.
      </p>

      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {featuredListings.slice(0, 2).map((listing: any) => (
          <ListingCard
            key={listing.id}
            id={String(listing.id)}
            title={listing.title ?? listing.name ?? "إعلان مميز"}
            price={listing.price ?? "على السوم"}
            city={listing.city ?? listing.location ?? "ليبيا"}
            year={listing.year ? String(listing.year) : undefined}
            condition={listing.condition ?? listing.status ?? undefined}
            image={listing.image ?? listing.cover ?? listing.thumbnail ?? undefined}
          />
        ))}
      </div>
    </section>
  );
}
