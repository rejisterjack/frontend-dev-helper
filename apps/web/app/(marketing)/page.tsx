import Hero from "@/components/landing/hero";
import ProblemSolution from "@/components/landing/problem-solution";
import FeatureBento from "@/components/landing/feature-bento";
import AISuggestionsSection from "@/components/landing/ai-suggestions-section";
import AllToolsShowcase from "@/components/landing/all-tools-showcase";
import ComparisonTable from "@/components/landing/comparison-table";
import Community from "@/components/landing/community";
import FAQSection from "@/components/landing/faq-section";
import CTASection from "@/components/landing/cta-section";

export default function HomePage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <FeatureBento />
      <AISuggestionsSection />
      <AllToolsShowcase />
      <ComparisonTable />
      <Community />
      <FAQSection />
      <CTASection />
    </>
  );
}
