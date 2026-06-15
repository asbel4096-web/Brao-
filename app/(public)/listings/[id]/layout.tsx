import type { Metadata } from "next";
import {
  getAdminApp,
  getAdminFirestore,
} from "@/lib/admin/api-helpers";
import {
  SITE_URL,
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  DEFAULT_DESCRIPTION,
  truncateDescription,
} from "@/lib/seo";

/**
 * Layout (Server Component) لصفحة تفاصيل الإعلان.
 *
 * الهدف الوحيد: توليد Open Graph / Twitter metadata ديناميكية
 * لكل إعلان، بحيث تظهر معاينة احترافية عند المشاركة على واتساب/
 * فيسبوك/تيليجرام (صورة السيارة + الاسم + السعر + المدينة).
 *
 * ⚠️ صفحة page.tsx تبقى "use client" كما هي — لا نغيّرها.
 * هذا الـlayout يلتفّ حولها ويضيف الـmetadata على مستوى الخادم.
 *
 * يجلب الإعلان عبر Admin SDK (متاح على الخادم فقط).
 * لو فشل الجلب، يرجع metadata افتراضية (لا يكسر الصفحة).
 */

interface Params {
  params: { id: string };
}

async function fetchListing(id: string): Promise<any | null> {
  try {
    const app = getAdminApp();
    const db = getAdminFirestore(app);
    const snap = await db.collection("listings").doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...(snap.data() || {}) };
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const listing = await fetchListing(params.id);

  // إعلان غير موجود → metadata افتراضية + noindex
  if (!listing) {
    return {
      title: `إعلان غير متوفر | ${SITE_NAME}`,
      description: DEFAULT_DESCRIPTION,
      robots: { index: false, follow: true },
    };
  }

  const url = `${SITE_URL}/listings/${listing.id}`;
  const price =
    typeof listing.price === "number"
      ? `${listing.price.toLocaleString("en-US")} د.ل`
      : "";
  const city = listing.city || "";

  // العنوان: "هيونداي سوناتا 2016 - 33,000 د.ل | براتشو كار"
  const titleParts = [listing.title].filter(Boolean);
  if (price) titleParts.push(price);
  const title = `${titleParts.join(" - ")} | ${SITE_NAME}`;

  // الوصف: السعر + المدينة + مقتطف من الوصف الأصلي
  const descParts = [
    price && `السعر: ${price}`,
    city && `الموقع: ${city}`,
    listing.year && `موديل ${listing.year}`,
    listing.description,
  ].filter(Boolean);
  const description = truncateDescription(
    descParts.join(" · ") || DEFAULT_DESCRIPTION
  );

  // الصورة: أول صورة للإعلان، وإلا الافتراضية
  const image =
    Array.isArray(listing.images) && listing.images[0]
      ? listing.images[0]
      : DEFAULT_OG_IMAGE;

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
      images: [{ url: image, width: 1200, height: 630, alt: listing.title }],
      locale: "ar_LY",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function ListingDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
