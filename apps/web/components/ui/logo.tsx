import { cn } from "@/lib/utils";

/**
 * FrontendDevHelper brand mark.
 *
 * One source of truth for the logo. Used in nav, footer, favicon, OG image.
 * The symbol is two stacked chevrons (front-end brackets) inside a rounded
 * square with the brand gradient.
 */
export function LogoMark({
  className,
  size = 32,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="fdh-logo-grad" x1="0" y1="0" x2="32" y2="32">
          <stop stopColor="#22D3EE" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#fdh-logo-grad)" />
      <path
        d="M11 11L7 16L11 21"
        stroke="#08090C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 11L25 16L21 21"
        stroke="#08090C"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 9L14 23"
        stroke="#08090C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  showWordmark = true,
  size = 32,
}: {
  className?: string;
  showWordmark?: boolean;
  size?: number;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} />
      {showWordmark && (
        <span className="text-base font-semibold tracking-tight text-text-primary">
          FrontendDevHelper
        </span>
      )}
    </span>
  );
}
