"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root-level error boundary.
 *
 * This component catches errors thrown by ANY route segment, including the
 * root layout. It MUST include its own `<html>` and `<body>` because
 * `global-error.tsx` replaces the root layout entirely when it triggers.
 *
 * Note: we use a plain `<a>` rather than `next/link` here because there is no
 * App Router context available when global-error replaces the root layout.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/error
 */
/* eslint-disable @next/next/no-html-link-for-pages */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-black text-neutral-200 antialiased min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Something went wrong
            </h1>
            <p className="text-neutral-400 text-sm leading-relaxed">
              An unexpected error occurred while loading this page. Our team has
              been notified — you can try again, or head back home.
            </p>
          </div>

          {error.digest && (
            <p className="text-xs text-neutral-600 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-5 py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
