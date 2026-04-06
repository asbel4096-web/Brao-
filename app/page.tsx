import { CategoryGrid } from '@/components/category-grid';
import { CTASection } from '@/components/cta-section';
import { Hero } from '@/components/hero';
import { ListingsGrid } from '@/components/listings-grid';
import { SiteFooter } from '@/components/site-footer';

export default function HomePage() {
  return (
    <>
      <Hero />
      <CategoryGrid />
      <ListingsGrid />
      <CTASection />
      <SiteFooter />
    </>
  );
}
