"use client";

import { BrowseByBrand } from "@/components/browse-by-brand";
import { CategoryGrid } from "@/components/category-grid";
import { CTASection } from "@/components/cta-section";
import { FeaturedListingsSection } from "@/components/featured-listings-section";
import { Hero } from "@/components/hero";
import { HomepageBannersCarousel } from "@/components/homepage-banners-carousel";
import { ListingsGrid } from "@/components/listings-grid";
import { SiteFooter } from "@/components/site-footer";
import { StoriesRow } from "@/components/stories/stories-row";
import { TowTrucksCTA } from "@/components/tow-trucks-cta";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";
import { usePublicHomepageConfig } from "@/hooks/use-public-homepage-config";
import type { HomepageSection } from "@/lib/cms/types";

/**
 * الصفحة الرئيسية - ديناميكية حسب /admin/content/homepage.
 *
 * بنية:
 *   - StoriesRow + Hero ثابتان في الأعلى (التفاعل الأساسي)
 *   - الأقسام بين Hero و CTASection ديناميكية:
 *     - يقرأ homepageConfig/main:
 *         · sectionsOrder: ترتيب الأقسام
 *         · enabledSections: الأقسام النشطة (يمكن إخفاء أيٍّ منها)
 *         · featuredListings: IDs الإعلانات المميَّزة (manual override)
 *     - يقرأ homepageConfig/main/banners (للقسم banners)
 *   - CTASection + SiteFooter ثابتان في الأسفل
 *
 * Fallback: لو الـconfig غير موجود أو فشل التحميل، نستخدم
 * DEFAULT_HOMEPAGE_CONFIG (نفس الترتيب القديم).
 *
 * أثناء التحميل: نعرض ترتيب الافتراضي مباشرة (الـhook يُرجِع defaults
 * عند الـloading)، فلا "flash of empty content".
 */
export default function HomePage() {
  const { config, banners } = usePublicHomepageConfig();

  // mapping: key → React node
  const renderSection = (key: HomepageSection): React.ReactNode => {
    switch (key) {
      case "banners":
        // البنرات: لا نعرض القسم إن كانت القائمة فاضية (HomepageBannersCarousel
        // يخفي نفسه تلقائياً)
        return <HomepageBannersCarousel banners={banners} />;
      case "featured":
        // إن وُجدت قائمة manualIds مختارة → نمرّرها. غير ذلك → auto mode.
        return (
          <FeaturedListingsSection
            manualIds={
              config.featuredListings.length > 0
                ? config.featuredListings
                : undefined
            }
          />
        );
      case "newest":
        return <ListingsGrid />;
      case "categories":
        return <CategoryGrid />;
      case "tow":
        return <TowTrucksCTA />;
      case "services":
        // قسم "خدمات وورش" - حالياً BrowseByBrand يلعب هذا الدور
        // (نعرض شريط الماركات كقسم خدمات). لو احتجت قسم خدمات
        // منفصل لاحقاً، أنشئ component جديد.
        return <BrowseByBrand />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* الثوابت في الأعلى */}
      <StoriesRow />
      <Hero />

      {/* قسم خاص: VerifiedDealersRow (موثوق دائماً، خارج التحكم) */}
      <VerifiedDealersRow />

      {/* الأقسام الديناميكية */}
      {config.sectionsOrder
        .filter((key) => config.enabledSections.includes(key))
        .map((key) => (
          <div key={key}>{renderSection(key)}</div>
        ))}

      {/* الثوابت في الأسفل */}
      <CTASection />
      <SiteFooter />
    </>
  );
}
