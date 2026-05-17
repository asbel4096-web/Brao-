import { BrowseByBrand } from "@/components/browse-by-brand";
import { CategoryGrid } from "@/components/category-grid";
import { CTASection } from "@/components/cta-section";
import { Hero } from "@/components/hero";
import { ListingsGrid } from "@/components/listings-grid";
import { SiteFooter } from "@/components/site-footer";
import { StoriesRow } from "@/components/stories/stories-row";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";

/**
 * ترتيب أقسام الصفحة الرئيسية:
 *
 * 1) StoriesRow - الستوريز في القمة (التفاعل اليومي).
 * 2) Hero       - البانر/البحث.
 * 3) VerifiedDealersRow - المعارض الموثقة مباشرة بعد البانر (ثقة).
 * 4) CategoryGrid - تصفّح حسب القسم (شريط أفقي).
 * 5) BrowseByBrand - تصفّح حسب الماركة (شريط أفقي).
 * 6) ListingsGrid - أحدث الإعلانات.
 * 7) CTASection - بانر "ابدأ البيع".
 * 8) SiteFooter - الفوتر.
 *
 * الأقسام 3 و 4 و 5 تستخدم Horizontal Scroll لتقليل طول الصفحة.
 * VerifiedDealersRow يُخفي نفسه تلقائياً عند عدم وجود معارض موثقة.
 */
export default function HomePage() {
  return (
    <>
      <StoriesRow />
      <Hero />
      <VerifiedDealersRow />
      <CategoryGrid />
      <BrowseByBrand />
      <ListingsGrid />
      <CTASection />
      <SiteFooter />
    </>
  );
}
