import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * Shared layout for /terms and /privacy. Same structure (back link, eyebrow
 * + title + last-updated, prose body) so both pages look identical apart
 * from their content.
 */
export function LegalShell({
  eyebrow,
  title,
  lastUpdated,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  lastUpdated: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-base pb-24 pt-32 md:pt-40">
      <Container size="narrow">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-secondary"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <div className="mt-10 flex items-start gap-4">
          <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-line-subtle bg-bg-elevated">
            <Icon className="h-5 w-5 text-brand-cyan" strokeWidth={1.75} />
          </div>
          <div>
            <Eyebrow tone="brand">{eyebrow}</Eyebrow>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
              {title}
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>

        <div className="prose-legal mt-12">{children}</div>
      </Container>
    </div>
  );
}
