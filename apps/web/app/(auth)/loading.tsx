import { Loader2 } from "lucide-react";

/**
 * Route-segment loading UI for the (auth) group.
 */
export default function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base">
      <Loader2
        className="h-6 w-6 animate-spin text-brand-cyan"
        aria-label="Loading"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
