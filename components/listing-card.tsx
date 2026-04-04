import Link from 'next/link';
import { Heart, MapPin, MessageCircle, Phone } from 'lucide-react';
import { Listing } from '@/lib/types';
import { formatPrice, whatsappLink } from '@/lib/utils';

export function ListingCard({ listing }: { listing: Listing }) {
  const image = listing.images?.[0] || '/icons/car-card.svg';
  return (
    <div className="card overflow-hidden">
      <div className="relative h-56 bg-gradient-to-br from-brand-100 to-slate-100">
        <img src={image} alt={listing.title} className="h-full w-full object-cover" />
        <button className="absolute left-3 top-3 rounded-full bg-white/90 p-2 text-slate-700 shadow">
          <Heart size={18} />
        </button>
        {listing.featured ? <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-xs font-black text-amber-950">مميز</span> : null}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black text-slate-950">{listing.title}</h3>
            <div className="mt-2 flex items-center gap-1 text-sm text-slate-500"><MapPin size={15} />{listing.city}</div>
          </div>
          <div className="text-lg font-black text-brand-700">{formatPrice(listing.price)}</div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          {listing.year ? <span className="rounded-full bg-slate-100 px-3 py-1">{listing.year}</span> : null}
          {listing.mileage ? <span className="rounded-full bg-slate-100 px-3 py-1">{listing.mileage.toLocaleString('ar-LY')} كم</span> : null}
          {listing.fuel ? <span className="rounded-full bg-slate-100 px-3 py-1">{listing.fuel}</span> : null}
          {listing.transmission ? <span className="rounded-full bg-slate-100 px-3 py-1">{listing.transmission}</span> : null}
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Link href={`/listings/${listing.id}`} className="btn-secondary px-3 py-2 text-xs">التفاصيل</Link>
          <a href={`tel:${listing.sellerPhone}`} className="btn-secondary gap-1 px-3 py-2 text-xs"><Phone size={14} />اتصال</a>
          <a href={whatsappLink(listing.whatsapp || listing.sellerPhone)} target="_blank" className="btn-primary gap-1 px-3 py-2 text-xs"><MessageCircle size={14} />واتساب</a>
        </div>
      </div>
    </div>
  );
}
