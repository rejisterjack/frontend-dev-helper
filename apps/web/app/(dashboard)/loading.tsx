import { Loader2 } from "lucide-react";

/**
 * Route-segment loading UI for the (dashboard) group. Renders while the
 * auth-gated server components resolve the session and the dashboard data.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <Loader2
        className="w-8 h-8 text-cyan-400 animate-spin"
        aria-label="Loading"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
