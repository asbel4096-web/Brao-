import { BrowseByBrand } from "@/components/browse-by-brand";
import { CategoryGrid } from "@/components/category-grid";
import { CTASection } from "@/components/cta-section";
import { FeaturedListingsSection } from "@/components/featured-listings-section";
import { Hero } from "@/components/hero";
import { ListingsGrid } from "@/components/listings-grid";
import { SiteFooter } from "@/components/site-footer";
import { StoriesRow } from "@/components/stories/stories-row";
import { TowTrucksCTA } from "@/components/tow-trucks-cta";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";

/**
 * ترتيب أقسام الصفحة الرئيسية:
 *
 * 1) StoriesRow - الستوريز في القمة (التفاعل اليومي).
 * 2) Hero       - البانر/البحث.
 * 3) TowTrucksCTA - بانر "تعطّلت سيارتك؟" - مرئي مباشرة بعد البحث (حاجة طارئة).
 * 4) VerifiedDealersRow - المعارض الموثقة (ثقة).
 * 5) CategoryGrid - تصفّح حسب القسم (شريط أفقي).
 * 6) BrowseByBrand - تصفّح حسب الماركة (شريط أفقي).
 * 7) FeaturedListingsSection - إعلانات مميزة (تُخفي نفسها لو لا توجد).
 * 8) ListingsGrid - أحدث الإعلانات (تشمل المميزة أيضاً - نمط dubizzle/OpenSooq).
 * 9) CTASection - بانر "ابدأ البيع".
 * 10) SiteFooter - الفوتر.
 *
 * الأقسام 4 و 5 و 6 تستخدم Horizontal Scroll لتقليل طول الصفحة.
 * VerifiedDealersRow و FeaturedListingsSection يخفيان نفسيهما عند عدم وجود محتوى.
 */
export default function HomePage() {
  return (
    <>
      <StoriesRow />
      <Hero />
      <TowTrucksCTA />
      <VerifiedDealersRow />
      <CategoryGrid />
      <BrowseByBrand />
      <FeaturedListingsSection />
      <ListingsGrid />
      <CTASection />
      <SiteFooter />
    </>
  );
}
