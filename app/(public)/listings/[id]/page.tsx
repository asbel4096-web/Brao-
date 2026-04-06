import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone, ShieldCheck } from 'lucide-react';
import { featuredListings } from '@/lib/mock-data';
import { formatPrice } from '@/lib/utils';

export default function ListingDetailsPage({ params }: { params: { id: string } }) {
  const listing = featuredListings.find((item) => item.id === params.id);
  if (!listing) return notFound();

  return (
    <section className="container py-10">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="h-[320px] bg-gradient-to-br from-brand-100 to-slate-100">
              <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover" />
            </div>
            <div className="p-6">
              <div className="badge">{listing.category}</div>
              <h1 className="mt-4 text-3xl font-black text-slate-950">{listing.title}</h1>
              <div className="mt-4 grid gap-3 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
                <div><strong>السنة:</strong> {listing.year ?? '-'}</div>
                <div><strong>العداد:</strong> {listing.mileage ? `${listing.mileage.toLocaleString('ar-LY')} كم` : '-'}</div>
                <div><strong>الوقود:</strong> {listing.fuel ?? '-'}</div>
                <div><strong>الناقل:</strong> {listing.transmission ?? '-'}</div>
              </div>
              <p className="mt-6 text-base leading-8 text-slate-600">{listing.description}</p>
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="card p-6">
            <div className="text-sm text-slate-500">السعر</div>
            <div className="mt-2 text-4xl font-black text-brand-700">{formatPrice(listing.price)}</div>
            <div className="mt-6 grid gap-3">
              <a href={`tel:${listing.sellerPhone}`} className="btn-secondary gap-2">
                <Phone size={18} />
                اتصال مباشر
              </a>
              <a href={`https://wa.me/${listing.whatsapp ?? listing.sellerPhone}`} className="btn-primary gap-2">
                <MessageCircle size={18} />
                واتساب
              </a>
              <Link href="/messages" className="btn-secondary">فتح الدردشة</Link>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center gap-2 text-brand-700">
              <ShieldCheck size={18} />
              <span className="font-black">البائع</span>
            </div>
            <div className="mt-4 text-lg font-black text-slate-950">{listing.sellerName}</div>
            <div className="mt-2 text-sm text-slate-500">{listing.city}</div>
            <div className="mt-4 text-sm leading-7 text-slate-600">
              لاحقًا يمكن ربط هذه البطاقة بحساب المستخدم الفعلي، التقييمات، الإعلانات الأخرى، والتوثيق.
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
