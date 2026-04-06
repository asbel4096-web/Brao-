import Link from "next/link";
import { Heart, MapPin, CalendarDays, BadgeCheck } from "lucide-react";

type ListingCardProps = {
  id: string;
  title: string;
  price: string;
  city: string;
  year?: string;
  condition?: string;
  image?: string;
  href?: string;
};

export default function ListingCard({
  id,
  title,
  price,
  city,
  year,
  condition,
  image,
  href
}: ListingCardProps) {
  const target = href ?? `/listings/${id}`;

  return (
    <Link
      href={target}
      className="group overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="relative h-52 overflow-hidden bg-slate-200 dark:bg-slate-800">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-300 to-slate-200 dark:from-slate-800 dark:to-slate-700" />
        )}

        <button
          type="button"
          className="absolute left-3 top-3 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm"
          aria-label="حفظ الإعلان"
        >
          <Heart className="h-6 w-6" />
        </button>

        <div className="absolute bottom-3 right-3 rounded-xl bg-black/85 px-3 py-2 text-base font-black text-white">
          {price}
        </div>
      </div>

      <div className="p-4 text-right">
        <h3 className="line-clamp-2 text-xl font-black text-slate-950 dark:text-white">
          {title}
        </h3>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm text-slate-500 dark:text-slate-300">
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {city}
          </span>

          {year ? (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              {year}
            </span>
          ) : null}

          {condition ? (
            <span className="flex items-center gap-1">
              <BadgeCheck className="h-4 w-4" />
              {condition}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
