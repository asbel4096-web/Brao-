"use client";

import { useEffect, useState } from "react";

import { BrowseByBrand } from "@/components/browse-by-brand";
import { CTASection } from "@/components/cta-section";
import { FeaturedNearYou } from "@/components/featured-near-you";
import { HomepageBannersCarousel } from "@/components/homepage-banners-carousel";
import { ListingsGrid } from "@/components/listings-grid";
import { MostSavedSection } from "@/components/most-saved-section";
import { MostViewedSection } from "@/components/most-viewed-section";
import { PlatformStats } from "@/components/platform-stats";
import { SearchHero } from "@/components/search-hero";
import { SiteFooter } from "@/components/site-footer";
import { StoriesRow } from "@/components/stories/stories-row";
import { TowTrucksCTA } from "@/components/tow-trucks-cta";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";
import { usePublicHomepageConfig } from "@/hooks/use-public-homepage-config";

/**
 * الصفحة الرئيسية — إعادة تصميم 2026 (Dubizzle / FB Marketplace / OpenSooq).
 *
 * الترتيب الثابت (مطابق للنموذج المعتمد، بدون أي Hero Banner):
 *   1. SearchHero      — شريط بحث + فئات سريعة (المحتوى العملي مباشرة)
 *   2. StoriesRow      — قصص المعارض (ميزة قائمة)
 *   3. TowTrucksCTA    — "تعطّلت سيارتك؟" (خدمة سريعة بارزة)
 *   4. BrowseByBrand   — تصفّح حسب الماركة (شعارات الماركات)
 *   5. PlatformStats   — الإحصائيات (أرقام + نسبة نمو أسبوعية)
 *   6. FeaturedNearYou — سيارات مميزة قريبة منك (صف أفقي)
 *   7. VerifiedDealers — المعارض المميزة (دائري Stories)
 *   8. MostSaved       — الأكثر حفظاً (صف أفقي)
 *   9. ListingsGrid    — أحدث الإعلانات (شبكة بطاقتين/صف)
 *
 * البنرات تبقى قسماً يتحكم به الأدمن (يُلحَق حسب homepageConfig).
 *
 * ملاحظة hydration: الأقسام التي تقرأ بيانات العميل تُرسَم خلف بوّابة
 * `mounted` لتطابق رندر السيرفر/العميل (تفادي #310/#418).
 */

export default function HomePage() {
  const { banners } = usePublicHomepageConfig();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <>
      {/* 1. البحث + الفئات السريعة */}
      <SearchHero />

      {/* 2. البنر الرئيسي (سلايدر) - أعلى الصفحة، يختفي لو لا بنرات */}
      {mounted && banners && banners.length > 0 && (
        <div className="container mt-3">
          <HomepageBannersCarousel banners={banners} />
        </div>
      )}

      {/* 3. القصص (دون تعديل) */}
      {mounted && <StoriesRow />}

      {/* 4. تعطّلت سيارتك؟ */}
      {mounted && <TowTrucksCTA />}

      {/* 5. تصفّح حسب الماركة */}
      {mounted && <BrowseByBrand />}

      {/* 6. الإعلانات المميزة (تختفي لو لا توجد) */}
      {mounted && <FeaturedNearYou />}

      {/* 7. أحدث الإعلانات */}
      <ListingsGrid />

      {/* 8. السيارات الأكثر مشاهدة (جديد - يختفي لو لا بيانات) */}
      {mounted && <MostViewedSection />}

      {/* 9. الأكثر حفظاً */}
      {mounted && <MostSavedSection />}

      {/* 10. المعارض المميزة */}
      {mounted && <VerifiedDealersRow />}

      {/* 11. إحصائيات المنصة (حقيقية) - قبل الفوتر */}
      {mounted && <PlatformStats />}

      {/* ثوابت الأسفل */}
      <CTASection />
      <SiteFooter />
    </>
  );
}
