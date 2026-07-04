import { Eyebrow } from "./eyebrow";
import { cn } from "@/lib/utils";

/**
 * Section heading block. Renders an optional eyebrow, the H2, and an optional
 * lead paragraph. Standardizes section intros across the marketing site.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  lead?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" && "mx-auto text-center",
        className,
      )}
    >
      {eyebrow && (
        <div className="mb-4">
          <Eyebrow tone="brand">{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className="section-heading text-balance">{title}</h2>
      {lead && (
        <p
          className={cn(
            "mt-5 text-lg text-text-tertiary leading-relaxed text-pretty",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      )}
    </div>
  );
}
