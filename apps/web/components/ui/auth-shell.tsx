import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Eyebrow } from "@/components/ui/eyebrow";

/**
 * AuthShell — shared layout for every /login, /signup, /forgot-password,
 * /reset-password, /verify-email page. Provides consistent background,
 * centering, logo, and an optional footer link.
 *
 * Replaces the bespoke `min-h-screen flex items-center justify-center
 * bg-black px-6` boilerplate that was copy-pasted across all five pages.
 */
export function AuthShell({
  children,
  eyebrow,
}: {
  children: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      {/* One subtle accent — same restraint as the marketing hero. */}
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-brand-cyan/8 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="FrontendDevHelper home">
            <Logo size={36} showWordmark={false} />
          </Link>
        </div>
        {eyebrow && (
          <div className="mb-3 text-center">
            <Eyebrow tone="brand">{eyebrow}</Eyebrow>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
