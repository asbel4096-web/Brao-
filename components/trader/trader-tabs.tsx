"use client";

import { useMemo, useState } from "react";
import type { Listing, TraderReview, UserProfile } from "@/lib/types";
import { ListingCard } from "@/components/listing-card";
import { Star } from "lucide-react";
import { timeAgo, formatNumber } from "@/lib/utils";

const tabs = [
  { id: "listings", label: "الإعلانات" },
  { id: "services", label: "الخدمات" },
  { id: "reviews", label: "التقييمات" },
  { id: "about", label: "حول التاجر" },
] as const;

type TraderTabId = (typeof tabs)[number]["id"];

interface TraderTabsProps {
  profile: UserProfile;
  listings: Listing[];
  services: Listing[];
  reviews: TraderReview[];
}

export function TraderTabs({ profile, listings, services, reviews }: TraderTabsProps) {
  const [active, setActive] = useState<TraderTabId>("listings");

  const content = useMemo(() => {
    switch (active) {
      case "listings":
        return <CardsGrid items={listings} emptyLabel="لا توجد إعلانات منشورة حالياً." />;
      case "services":
        return <CardsGrid items={services} emptyLabel="لا توجد خدمات منشورة حالياً." />;
      case "reviews":
        return <ReviewsList items={reviews} />;
      case "about":
        return <AboutTrader profile={profile} listingsCount={listings.length} servicesCount={services.length} reviewsCount={reviews.length} />;
      default:
        return null;
    }
  }, [active, listings, profile, reviews, services]);

  return (
    <section className="card p-4 sm:p-6">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActive(tab.id)}
            className={`rounded-2xl px-4 py-3 text-sm font-black transition ${active === tab.id ? "bg-brand-700 text-white shadow-blue" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{content}</div>
    </section>
  );
}

function CardsGrid({ items, emptyLabel }: { items: Listing[]; emptyLabel: string }) {
  if (!items.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">{emptyLabel}</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item, index) => (
        <ListingCard key={item.id} listing={item} priority={index < 2} />
      ))}
    </div>
  );
}

function ReviewsList({ items }: { items: TraderReview[] }) {
  if (!items.length) {
    return <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:text-slate-300">لا توجد تقييمات حتى الآن.</div>;
  }

  return (
    <div className="space-y-4">
      {items.map((review) => (
        <div key={review.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-sm font-black text-slate-950 dark:text-white">{review.authorName}</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{timeAgo(review.createdAt)}</div>
            </div>
            <div className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
              <Star size={12} className="fill-current" />
              {review.rating}/5
            </div>
          </div>
          {review.text ? <p className="mt-4 text-sm leading-7 text-slate-700 dark:text-slate-200">{review.text}</p> : null}
        </div>
      ))}
    </div>
  );
}

function AboutTrader({
  profile,
  listingsCount,
  servicesCount,
  reviewsCount,
}: {
  profile: UserProfile;
  listingsCount: number;
  servicesCount: number;
  reviewsCount: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h3 className="text-base font-black text-slate-950 dark:text-white">نبذة</h3>
        <p className="mt-3 text-sm leading-8 text-slate-600 dark:text-slate-200">{profile.bio || "هذا التاجر يعرض منتجاته وخدماته داخل براتشو كار مع واجهة احترافية وسريعة."}</p>
      </div>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/40">
        <h3 className="text-base font-black text-slate-950 dark:text-white">بيانات عامة</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AboutItem label="المدينة" value={profile.city || "غير مذكور"} />
          <AboutItem label="رقم الهاتف" value={profile.phone || "غير مذكور"} />
          <AboutItem label="عدد الإعلانات" value={formatNumber(listingsCount)} />
          <AboutItem label="عدد الخدمات" value={formatNumber(servicesCount)} />
          <AboutItem label="عدد التقييمات" value={formatNumber(reviewsCount)} />
          <AboutItem label="المتابعين" value={formatNumber(profile.followersCount || 0)} />
        </div>
      </div>
    </div>
  );
}

function AboutItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-3 text-sm dark:bg-slate-900">
      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-black text-slate-950 dark:text-white">{value}</div>
    </div>
  );
}
