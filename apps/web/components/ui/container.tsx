import { cn } from "@/lib/utils";

/**
 * Page container. Single max-width (72rem) + horizontal gutter.
 * Use everywhere a section needs its inner content width.
 */
export function Container({
  children,
  className,
  size = "default",
}: {
  children: React.ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
}) {
  const max =
    size === "narrow"
      ? "max-w-3xl"
      : size === "wide"
        ? "max-w-[80rem]"
        : "max-w-container";
  return (
    <div className={cn("mx-auto w-full px-6 lg:px-8", max, className)}>
      {children}
    </div>
  );
}
