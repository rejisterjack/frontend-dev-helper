import Link from "next/link";

/**
 * Branded 404 page. Triggered when no route matches.
 *
 * See: https://nextjs.org/docs/app/api-reference/file-conventions/not-found
 */
export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-6xl font-bold text-white tracking-tight">404</p>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Page not found
          </h1>
          <p className="text-neutral-400 text-sm leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-lg bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg border border-white/10 text-white font-medium text-sm hover:bg-white/5 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
