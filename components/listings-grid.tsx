import { featuredListings } from "@/lib/mock-data";
import ListingCard from "./listing-card";

export function ListingsGrid() {
  return (
    <section className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-3xl font-black text-slate-950 dark:text-white">
          إعلانات مقترحة
        </h2>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {featuredListings.map((listing: any) => (
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
