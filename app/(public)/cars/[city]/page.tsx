import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin } from "lucide-react";
import { getAdminApp, getAdminFirestore } from "@/lib/admin/api-helpers";
import {
  SITE_URL,
  SITE_NAME,
  SEO_CITIES,
  citySlugToAr,
  truncateDescription,
} from "@/lib/seo";
import { ListingCard } from "@/components/listing-card";
import type { Listing } from "@/lib/types";

/**
 * صفحة مدينة SEO-friendly: /cars/{city}
 *
 * Server Component:
 *  - generateStaticParams: المدن الخمس الرئيسية
 *  - generateMetadata: عنوان/وصف/OG خاص بكل مدينة
 *  - يجلب أحدث إعلانات المدينة عبر Admin SDK
 *  - وصف المدينة + شبكة إعلانات + روابط داخلية
 *
 * revalidate كل ساعة (ISR) - محتوى طازج بلا إعادة بناء.
 */

export const revalidate = 3600;
// السماح بأي مدينة (لو أُضيفت لاحقاً) + عدم كسر البناء لو فشل الجلب
export const dynamicParams = true;

interface Params {
  params: { city: string };
}

export function generateStaticParams() {
  return SEO_CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const cityInfo = SEO_CITIES.find((c) => c.slug === params.city);
  if (!cityInfo) {
    return { title: `مدينة غير موجودة | ${SITE_NAME}`, robots: { index: false } };
  }

  const title = `سيارات للبيع في ${cityInfo.ar} | ${SITE_NAME}`;
  const description = truncateDescription(cityInfo.desc);
  const url = `${SITE_URL}/cars/${cityInfo.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale: "ar_LY",
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

/**
 * يحوّل مستند Firestore إلى كائن بسيط (plain object) آمن للتمرير
 * من Server Component إلى Client Component.
 *
 * Firestore Timestamp ليس plain object → يجب تحويله. نحوّل كل
 * الطوابع الزمنية إلى millis (number). الحقول التي يعرضها الكارت
 * (timeAgo, شارات الترقية) تتعامل مع غياب .toMillis بأمان.
 */
function toPlainListing(id: string, data: any): any {
  const out: any = { id };
  for (const [k, v] of Object.entries(data || {})) {
    if (v && typeof v === "object" && typeof (v as any).toMillis === "function") {
      // Firestore Timestamp → millis
      out[k] = (v as any).toMillis();
    } else if (v && typeof v === "object" && typeof (v as any).toDate === "function") {
      out[k] = (v as any).toDate().getTime();
    } else if (
      v === null ||
      typeof v === "string" ||
      typeof v === "number" ||
      typeof v === "boolean" ||
      Array.isArray(v)
    ) {
      out[k] = v;
    }
    // نتجاهل أي كائنات معقّدة أخرى (GeoPoint, DocumentReference...)
  }
  return out;
}

async function fetchCityListings(cityAr: string): Promise<Listing[]> {
  try {
    const app = getAdminApp();
    const db = getAdminFirestore(app);
    // استعلام بسيط بالمدينة (single-field index تلقائي)
    const snap = await db
      .collection("listings")
      .where("city", "==", cityAr)
      .limit(24)
      .get();

    const list = snap.docs
      .map((d) => toPlainListing(d.id, d.data()))
      .filter((it: any) => it.status === "active" || it.status === undefined);

    // الأحدث أولاً (createdAt الآن millis number بعد التحويل)
    list.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));

    return list as Listing[];
  } catch {
    return [];
  }
}

export default async function CityPage({ params }: Params) {
  const cityAr = citySlugToAr(params.city);
  const cityInfo = SEO_CITIES.find((c) => c.slug === params.city);
  if (!cityAr || !cityInfo) notFound();

  const listings = await fetchCityListings(cityAr);
  const otherCities = SEO_CITIES.filter((c) => c.slug !== params.city);

  return (
    <section className="container py-6 sm:py-8" dir="rtl">
      {/* رأس الصفحة */}
      <nav className="mb-3 flex items-center gap-1 text-[12px] text-slate-400">
        <Link href="/" className="hover:text-brand-700">
          الرئيسية
        </Link>
        <ChevronLeft size={13} />
        <Link href="/listings" className="hover:text-brand-700">
          الإعلانات
        </Link>
        <ChevronLeft size={13} />
        <span className="font-bold text-slate-600 dark:text-slate-300">
          {cityAr}
        </span>
      </nav>

      <header className="mb-5">
        <h1 className="flex items-center gap-2 text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
          <MapPin className="text-brand-700" size={26} />
          سيارات للبيع في {cityAr}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {cityInfo.desc}
        </p>
        <p className="mt-2 text-[13px] font-bold text-brand-700 dark:text-brand-300">
          {listings.length} إعلان متاح
        </p>
      </header>

      {/* شبكة الإعلانات */}
      {listings.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((it, i) => (
            <ListingCard key={it.id} listing={it} priority={i < 4} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center dark:border-slate-800 dark:bg-slate-900/40">
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
            لا توجد إعلانات في {cityAr} حالياً
          </p>
          <Link
            href="/listings"
            className="mt-3 inline-block text-sm font-black text-brand-700 dark:text-brand-300"
          >
            تصفّح كل الإعلانات ←
          </Link>
        </div>
      )}

      {/* روابط داخلية: مدن أخرى */}
      <div className="mt-10 border-t border-slate-100 pt-6 dark:border-slate-800">
        <h2 className="mb-3 text-base font-black text-slate-900 dark:text-white">
          مدن أخرى
        </h2>
        <div className="flex flex-wrap gap-2">
          {otherCities.map((c) => (
            <Link
              key={c.slug}
              href={`/cars/${c.slug}`}
              className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[13px] font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              سيارات في {c.ar}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
