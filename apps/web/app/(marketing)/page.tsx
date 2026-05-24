import Hero from '@/components/landing/hero';
import ProblemSolution from '@/components/landing/problem-solution';
import FeatureBento from '@/components/landing/feature-bento';
import AISuggestionsSection from '@/components/landing/ai-suggestions-section';
import AllToolsShowcase from '@/components/landing/all-tools-showcase';
import ComparisonTable from '@/components/landing/comparison-table';
import Testimonials from '@/components/landing/testimonials';
import FAQSection from '@/components/landing/faq-section';
import CTASection from '@/components/landing/cta-section';
import ManualInstall from '@/components/landing/manual-install';

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <FeatureBento />
      <AISuggestionsSection />
      <AllToolsShowcase />
      <ComparisonTable />
      <Testimonials />
      <FAQSection />
      <CTASection />
      <ManualInstall />
    </>
  );
}
