import type { MetadataRoute } from "next";
import { getAdminApp, getAdminFirestore } from "@/lib/admin/api-helpers";
import { SITE_URL, SEO_CITIES } from "@/lib/seo";

/**
 * sitemap.xml ديناميكي.
 *
 * يشمل:
 *  - الصفحات الثابتة (الرئيسية، الإعلانات، التجار...)
 *  - صفحات المدن (/cars/{city})
 *  - أحدث الإعلانات النشطة (حتى 1000، الأحدث أولاً)
 *
 * يُعاد توليده دورياً (revalidate). لو فشل جلب الإعلانات،
 * يرجع الصفحات الثابتة فقط (لا يكسر).
 */

export const revalidate = 3600; // كل ساعة

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // الصفحات الثابتة
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/listings`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/traders`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.7,
    },
  ];

  // صفحات المدن
  const cityPages: MetadataRoute.Sitemap = SEO_CITIES.map((c) => ({
    url: `${SITE_URL}/cars/${c.slug}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  // الإعلانات النشطة
  let listingPages: MetadataRoute.Sitemap = [];
  try {
    const app = getAdminApp();
    const db = getAdminFirestore(app);
    const snap = await db
      .collection("listings")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(1000)
      .get();

    listingPages = snap.docs.map((d) => {
      const data = d.data() || {};
      const updated =
        data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || now;
      return {
        url: `${SITE_URL}/listings/${d.id}`,
        lastModified: updated,
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    });
  } catch {
    // تجاهل - نرجع الثابتة فقط
  }

  return [...staticPages, ...cityPages, ...listingPages];
}
