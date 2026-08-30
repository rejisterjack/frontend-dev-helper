import Hero from "@/components/landing/hero";
import ProblemSolution from "@/components/landing/problem-solution";
import FeatureBento from "@/components/landing/feature-bento";
import AISuggestionsSection from "@/components/landing/ai-suggestions-section";
import AllToolsShowcase from "@/components/landing/all-tools-showcase";
import ComparisonTable from "@/components/landing/comparison-table";
import Community from "@/components/landing/community";
import FAQSection from "@/components/landing/faq-section";
import CTASection from "@/components/landing/cta-section";
import { JsonLd } from "@/components/seo/json-ld";
import { homePageSchema } from "@/lib/schema";
import { landingFaqs } from "@/data/landing-faq";

export const metadata = {
  title: "FrontendDevHelper — 50 Visual Debugging Tools in One Browser Extension",
  description:
    "Stop juggling 12 legacy extensions. FrontendDevHelper unifies 50 professional visual debugging tools into one Manifest V3 browser extension. 100% free & open source.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={homePageSchema(landingFaqs)} />
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
