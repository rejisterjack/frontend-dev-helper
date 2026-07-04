import { cn } from "@/lib/utils";

/**
 * Card — the single card primitive. Replaces:
 *   - the old <GlassCard> component
 *   - the old <SpotlightCard> component
 *   - the old `.glass-card` literal-class pattern
 *   - the ad-hoc `bg-white/[0.02] border border-white/5` inline pattern
 *   - the ad-hoc `bg-surface-900/50` inline pattern
 *
 * Variants:
 *   - default: bg-elevated + subtle line, resting
 *   - subtle:  bg-subtle for inset blocks
 *   - interactive: adds hover state (border lifts, bg lifts) + cursor pointer
 */
type CardVariant = "default" | "subtle" | "interactive";

export function Card({
  children,
  className,
  variant = "default",
  as: Tag = "div",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
  variant?: CardVariant;
  as?: React.ElementType;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border transition-colors duration-normal ease-out-quart",
        variant === "default" && "bg-bg-elevated border-line-subtle",
        variant === "subtle" && "bg-bg-subtle border-line-subtle",
        variant === "interactive" &&
          "bg-bg-elevated border-line-subtle hover:border-line hover:bg-bg-subtle cursor-pointer",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
