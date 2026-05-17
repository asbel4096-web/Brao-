import { BrowseByBrand } from "@/components/browse-by-brand";
import { CategoryGrid } from "@/components/category-grid";
import { CTASection } from "@/components/cta-section";
import { Hero } from "@/components/hero";
import { ListingsGrid } from "@/components/listings-grid";
import { SiteFooter } from "@/components/site-footer";
import { StoriesRow } from "@/components/stories/stories-row";
import { VerifiedDealersRow } from "@/components/verified-dealers-row";

export default function HomePage() {
  return (
    <>
      <StoriesRow />
      <Hero />
      <CategoryGrid />
      <BrowseByBrand />
      <VerifiedDealersRow />
      <ListingsGrid />
      <CTASection />
      <SiteFooter />
    </>
  );
}
