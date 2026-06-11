import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt
 *
 * يسمح بفهرسة الصفحات العامة، ويمنع المناطق الخاصة
 * (الأدمن، الملف الشخصي، المحفظة، المحادثات...).
 */

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/profile",
          "/wallet",
          "/messages",
          "/api/",
          "/login",
          "/verify-phone",
          "/profile/complete",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
