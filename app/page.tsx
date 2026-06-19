"use client";

import { useEffect, useState } from "react";

import { BrowseByBrand } from "@/components/browse-by-brand";
import { CTASection } from "@/components/cta-section";
import { ExploreCategories } from "@/components/explore-categories";
import { FeaturedNearYou } from "@/components/featured-near-you";
import { FridayMarketBanner } from "@/components/friday-market/friday-market-banner";
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
 * الصفحة الرئيسية — ترتيب احترافي 2026 على نمط التطبيقات الكبرى.
 *
 * منطق القمع (Funnel): بانر(أدمن) ← بحث ← تصفّح ← تفاعل ← اكتشاف ← ثقة ← خدمات ← عمق.
 *   0. Banners            — بانر إعلاني يتحكم به الأدمن (أعلى الصفحة، إظهار/إخفاء)
 *   1. SearchHero          — هيرو + بحث + فئات سريعة (نقطة الدخول)
 *   2. ExploreCategories   — شبكة الأقسام (تنقّل أساسي)
 *   3. StoriesRow          — قصص المعارض (تفاعل)
 *   4. SponsoredSpotlight  — إعلان ممول (بارز)
 *   5. RecentlyViewed      — شاهدت مؤخراً (تخصيص للعائدين)
 *   6. BrowseByBrand       — تصفّح حسب الماركة
 *   7. FeaturedNearYou     — سيارات مميزة قريبة منك
 *   9. MostViewed          — الأكثر مشاهدة (رائج)
 *  10. MostSaved           — الأكثر حفظاً
 *  11. VerifiedDealers     — المعارض الموثّقة (ثقة)
 *  12. TowTrucksCTA        — خدمة الساحبات
 *  13. DynamicCategories   — أحدث الإعلانات لكل قسم (تصفّح عميق)
 *  14. PlatformStats       — إحصائيات المنصّة (مصداقية)
 *      ← CTASection + SiteFooter
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
      {/* ===== 0. بانر إعلاني — أعلى الصفحة، يتحكّم به الأدمن (إظهار/إخفاء) ===== */}
      {mounted && bannersEnabled && bannersFlag && (
        <HomepageBannersCarousel banners={banners} loading={bannersLoading} />
      )}

      {/* ===== 1. البحث + الهيرو + الفئات السريعة ===== */}
      <SearchHero />

      {/* ===== 🛒 سوق الجمعة — بانر كبير قبل الأقسام (يظهر عند تفعيل الميزة) ===== */}
      {mounted && <FridayMarketBanner />}

      {/* ===== 2. إعلان ممول — Sponsored بارز أعلى الصفحة ===== */}
      {mounted && <SponsoredSpotlight />}

      {/* ===== 3. استكشف الأقسام — التنقّل الأساسي ===== */}
      {mounted && <ExploreCategories />}

      {/* ===== 4. قصص المعارض — تفاعل أعلى الصفحة ===== */}
      {mounted && storiesOn && <StoriesRow />}

      {/* ===== 5. شاهدت مؤخراً — تخصيص للعائدين (يظهر لمن له سجل) ===== */}
      {mounted && <RecentlyViewedSection />}

      {/* ===== 6. تصفّح حسب الماركة ===== */}
      {mounted && <BrowseByBrand />}

      {/* ===== 7. سيارات مميزة قريبة منك ===== */}
      {mounted && <FeaturedNearYou />}

      {/* ===== 9. الأكثر مشاهدة — رائج (دليل اجتماعي) ===== */}
      {mounted && <MostViewedSection />}

      {/* ===== 10. الأكثر حفظاً ===== */}
      {mounted && <MostSavedSection />}

      {/* ===== 11. المعارض الموثّقة — ثقة ===== */}
      {mounted && <VerifiedDealersRow />}

      {/* ===== 12. تعطّلت سيارتك؟ — خدمة الساحبات ===== */}
      {mounted && towOn && <TowTrucksCTA />}

      {/* ===== 13. أحدث الإعلانات لكل قسم — تصفّح عميق ===== */}
      {mounted && <DynamicCategorySections />}

      {/* ===== 14. إحصائيات المنصّة — مصداقية قبل النهاية ===== */}
      {mounted && <PlatformStats />}

      {/* ===== الثوابت السفلية ===== */}
      <CTASection />
      <SiteFooter />
    </>
  );
}
