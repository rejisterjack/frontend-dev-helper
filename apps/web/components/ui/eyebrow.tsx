import { cn } from "@/lib/utils";

/**
 * Eyebrow — the small mono uppercase label that sits above section headings.
 * Replaces the undefined `.text-xs-technical` and `.text-eyebrow` literals.
 */
export function Eyebrow({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "brand" | "success" | "warning" | "danger";
}) {
  const toneClass = {
    muted: "text-text-muted",
    brand: "text-brand-cyan",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  }[tone];
  return (
    <span
      className={cn(
        "font-mono text-[11px] font-medium uppercase tracking-[0.14em]",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}
