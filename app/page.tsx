"use client";

import { useEffect, useState } from "react";

import { BrowseByBrand } from "@/components/browse-by-brand";
import { CTASection } from "@/components/cta-section";
import { ExploreCategories } from "@/components/explore-categories";
import { FeaturedNearYou } from "@/components/featured-near-you";
import { HomepageBannersCarousel } from "@/components/homepage-banners-carousel";
import { DynamicCategorySections } from "@/components/home-sections/dynamic-category-sections";
import { MostSavedSection } from "@/components/most-saved-section";
import { MostViewedSection } from "@/components/most-viewed-section";
import { PlatformStats } from "@/components/platform-stats";
import { RecentlyViewedSection } from "@/components/recently-viewed-section";
import { SearchHero } from "@/components/search-hero";
import { SiteFooter } from "@/components/site-footer";
import { SponsoredSpotlight } from "@/components/sponsored-spotlight";
import { StoriesRow } from "@/components/stories/stories-row";
import { TowTrucksCTA } from "@/components/tow-trucks-cta";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";
import { usePublicHomepageConfig } from "@/hooks/use-public-homepage-config";
import { useFeatureFlag } from "@/hooks/features/use-feature-flag";

/**
 * الصفحة الرئيسية — إعادة تصميم 2026 (Dubizzle / FB Marketplace / OpenSooq).
 *
 * الترتيب الجديد (Hero Banner مباشرة بعد القصص):
 *   1. SearchHero      — شريط بحث + فئات سريعة (المحتوى العملي مباشرة)
 *   2. StoriesRow      — قصص المعارض (ميزة قائمة)
 *   3. TowTrucksCTA    — "تعطّلت سيارتك؟" (خدمة سريعة بارزة)
 *   4. BrowseByBrand   — تصفّح حسب الماركة (شعارات الماركات)
 *   5. PlatformStats   — الإحصائيات (أرقام + نسبة نمو أسبوعية)
 *   6. FeaturedNearYou — سيارات مميزة قريبة منك (صف أفقي)
 *   7. VerifiedDealers — المعارض المميزة (دائري Stories)
 *   8. MostSaved       — الأكثر حفظاً (صف أفقي)
 *   9. أقسام أحدث الإعلانات المنفصلة (سيارات/قطع غيار/خدمات/ساحبات)
 *
 * البنرات تبقى قسماً يتحكم به الأدمن (يُلحَق حسب homepageConfig).
 *
 * ملاحظة hydration: الأقسام التي تقرأ بيانات العميل تُرسَم خلف بوّابة
 * `mounted` لتطابق رندر السيرفر/العميل (تفادي #310/#418).
 */

export default function HomePage() {
  const { config, banners, loading: bannersLoading } = usePublicHomepageConfig();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // مفاتيح التحكّم من لوحة الأدمن (Feature Flags) — تشغيل/إيقاف فوري.
  const storiesOn = useFeatureFlag("stories");
  const towOn = useFeatureFlag("tow_service");
  const bannersFlag = useFeatureFlag("banners");

  // هل البنرات مفعّلة من إعدادات الأدمن؟ (تُعرض كـ Hero بعد القصص مباشرة)
  const bannersEnabled =
    config.sectionsOrder.includes("banners") &&
    config.enabledSections.includes("banners");

  return (
    <>
      {/* 1. البحث + الفئات السريعة */}
      <SearchHero />

      {/* إعلان ممول — Sponsored Spotlight أعلى النتائج مباشرة */}
      {mounted && <SponsoredSpotlight />}

      {/* شاهدت مؤخراً — يظهر فقط لمن لديه مشاهدات سابقة */}
      {mounted && <RecentlyViewedSection />}


      {/* 2. قصص المعارض */}
      {mounted && storiesOn && <StoriesRow />}

      {/* 3. استكشف جميع الأقسام — ديناميكي من category-config */}
      {mounted && <ExploreCategories />}

      {/* 4. Hero Banner — يتحكم به الأدمن */}
      {mounted && bannersEnabled && bannersFlag && (
        <HomepageBannersCarousel banners={banners} loading={bannersLoading} />
      )}

      {/* 5. تعطّلت سيارتك؟ */}
      {mounted && towOn && <TowTrucksCTA />}

      {/* 4. تصفّح حسب الماركة */}
      {mounted && <BrowseByBrand />}

      {/* 5. إحصائيات المنصة */}
      {mounted && <PlatformStats />}

      {/* 6. سيارات مميزة قريبة منك */}
      {mounted && <FeaturedNearYou />}

      {/* السيارات الأكثر مشاهدة (يختفي لو لا بيانات) */}
      {mounted && <MostViewedSection />}

      {/* 7. المعارض المميزة */}
      {mounted && <VerifiedDealersRow />}

      {/* 8. الأكثر حفظاً */}
      {mounted && <MostSavedSection />}

      {/* 9. أقسام ديناميكية لكل فئة: "أحدث {الفئة}" — تظهر تلقائياً
          لكل فئة فيها إعلان واحد أو أكثر، مرتّبة بالأكثر نشاطاً، آخر 5
          لكل قسم، مع lazy-loading وSkeleton. */}
      {mounted && <DynamicCategorySections />}

      {/* ثوابت الأسفل */}
      <CTASection />
      <SiteFooter />
    </>
  );
}
