"use client";

import { useEffect, useState } from "react";

import { CategoryShowcase } from "@/components/category-showcase";
import { CTASection } from "@/components/cta-section";
import { FeaturedNearYou } from "@/components/featured-near-you";
import { HomepageBannersCarousel } from "@/components/homepage-banners-carousel";
import { ListingsGrid } from "@/components/listings-grid";
import { MostSavedSection } from "@/components/most-saved-section";
import { PlatformStats } from "@/components/platform-stats";
import { SearchHero } from "@/components/search-hero";
import { SiteFooter } from "@/components/site-footer";
import { StoriesRow } from "@/components/stories/stories-row";
import { TowTrucksCTA } from "@/components/tow-trucks-cta";
import { BrowseByBrand } from "@/components/browse-by-brand";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";
import { usePublicHomepageConfig } from "@/hooks/use-public-homepage-config";
import type { HomepageSection } from "@/lib/cms/types";

/**
 * الصفحة الرئيسية — إعادة تصميم 2026 (OpenSooq / Dubizzle / FB Marketplace).
 *
 * بنية ثابتة بالترتيب التالي (بدون أي Hero Banner):
 *   1. SearchHero      — شريط بحث + فئات سريعة (يبدأ بالمحتوى العملي مباشرة)
 *   2. StoriesRow      — قصص المعارض (ميزة قائمة)
 *   3. PlatformStats   — إحصائيات المنصة (4 بطاقات)
 *   4. CategoryShowcase— تصفّح الأقسام (بطاقات بصور)
 *   5. FeaturedNearYou — سيارات مميزة قريبة منك (صف أفقي)
 *   6. VerifiedDealers — المعارض المميزة (دائري Stories)
 *   7. MostSaved       — الأكثر حفظاً (صف أفقي)
 *   8. ListingsGrid    — أحدث الإعلانات (شبكة بطاقتين/صف)
 *
 * أقسام إضافية يتحكم بها الأدمن (البنرات/الساحبات/الخدمات) تُلحَق بعدها
 * عبر homepageConfig — مع إبقاء قدرة الأدمن على إخفائها/ترتيبها.
 *
 * ملاحظة hydration: الأقسام التي تقرأ بيانات العميل (sessionStorage/Firestore)
 * تُرسَم خلف بوّابة `mounted` لتطابق رندر السيرفر/العميل (تفادي #310/#418).
 */

const EXTRA_KEYS: HomepageSection[] = ["banners", "tow", "services"];

export default function HomePage() {
  const { config, banners } = usePublicHomepageConfig();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // الأقسام الإضافية فقط (الأساسية صارت ثابتة بالترتيب الجديد أعلاه).
  const renderExtra = (key: HomepageSection): React.ReactNode => {
    switch (key) {
      case "banners":
        return <HomepageBannersCarousel banners={banners} />;
      case "tow":
        return <TowTrucksCTA />;
      case "services":
        return <BrowseByBrand />;
      default:
        return null;
    }
  };

  const extras = config.sectionsOrder
    .filter((key) => EXTRA_KEYS.includes(key))
    .filter((key) => config.enabledSections.includes(key));

  return (
    <>
      {/* 1. البحث + الفئات السريعة */}
      <SearchHero />

      {/* 2. قصص المعارض */}
      {mounted && <StoriesRow />}

      {/* 3. إحصائيات المنصة */}
      {mounted && <PlatformStats />}

      {/* 4. تصفّح الأقسام (بطاقات بصور) */}
      <CategoryShowcase />

      {/* 5. سيارات مميزة قريبة منك */}
      {mounted && <FeaturedNearYou />}

      {/* 6. المعارض المميزة */}
      {mounted && <VerifiedDealersRow />}

      {/* 7. الأكثر حفظاً */}
      {mounted && <MostSavedSection />}

      {/* 8. أحدث الإعلانات */}
      <ListingsGrid />

      {/* أقسام إضافية يتحكم بها الأدمن */}
      {mounted &&
        extras.map((key) => <div key={key}>{renderExtra(key)}</div>)}

      {/* ثوابت الأسفل */}
      <CTASection />
      <SiteFooter />
    </>
  );
}
