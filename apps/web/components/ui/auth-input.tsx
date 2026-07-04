import { cn } from "@/lib/utils";

/**
 * Auth form input — single source of truth for the styled text fields in
 * /login, /signup, /forgot-password, /reset-password. Replaces the long
 * inline `w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10
 * text-white placeholder-neutral-500 ...` repeated across all auth pages.
 */
export const authInputClass =
  "w-full rounded-xl border border-line-subtle bg-bg-elevated px-4 py-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-brand-cyan/40 focus:outline-none focus:ring-2 focus:ring-brand-cyan/20";

export function AuthInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(authInputClass, className)} {...props} />;
}
