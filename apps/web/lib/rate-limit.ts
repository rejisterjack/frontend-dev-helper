import type { NextRequest } from "next/server";

/**
 * Rate limiter abstraction.
 *
 * Two concrete strategies:
 *  - {@link UpstashRateLimiter} when `UPSTASH_REDIS_REST_URL` and
 *    `UPSTASH_REDIS_REST_TOKEN` are present (production / multi-instance).
 *  - {@link MemoryRateLimiter} otherwise (local dev, CI, single-instance).
 *
 * Both implementations expose the same {@link RateLimitResult} shape so call
 * sites are agnostic to the backing store.
 */

export interface RateLimitResult {
  /** Whether the request is allowed. */
  success: boolean;
  /** Maximum tokens in the bucket (for `X-RateLimit-Limit`). */
  limit: number;
  /** Remaining tokens in the current window (for `X-RateLimit-Remaining`). */
  remaining: number;
  /** Epoch milliseconds when the bucket resets (for `Retry-After` / `X-RateLimit-Reset`). */
  reset: number;
}

export interface RateLimiter {
  limit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult>;
}

/**
 * Fixed-window in-memory limiter. Falls back to this when no Redis is
 * configured. Adequate for single-instance deployments and local dev.
 *
 * Not suitable for multi-instance production — wire Upstash env vars there.
 */
export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>();

  async limit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const key = `${identifier}`;
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    let bucket = this.hits.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      this.hits.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, limit - bucket.count);

    // Opportunistic GC: keep the map bounded. Sweep every call when it grows
    // past 10k entries — O(n) but rare.
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) {
        if (v.resetAt <= now) this.hits.delete(k);
      }
    }

    return {
      success: bucket.count <= limit,
      limit,
      remaining,
      reset: bucket.resetAt,
    };
  }
}

/**
 * Upstash-backed limiter using `@upstash/ratelimit` + `@upstash/redis`.
 *
 * Loaded dynamically so the dependency is optional — the app still boots
 * without `@upstash/ratelimit` installed (falls back to in-memory).
 *
 * Implementation note: `@upstash/ratelimit`'s `slidingWindow` is configured at
 * client construction time, not per-call. We therefore keep a small cache of
 * `Ratelimit` clients keyed by `${limit}:${windowSeconds}` so each distinct
 * (limit, window) tuple gets its own correctly-sized bucket. Without this,
 * every endpoint silently runs at the same hard-coded rate regardless of what
 * callers ask for.
 */
export class UpstashRateLimiter implements RateLimiter {
  // Keyed by `${limit}:${windowSeconds}` -> a Ratelimit client sized for that bucket.
  // We deliberately type the value loosely (`UpstashClient`) because the exact
  // type is private to `@upstash/ratelimit` and exposing it would force every
  // consumer to depend on the package.
  private readonly clients = new Map<string, UpstashClient>();
  private readonly redis: unknown;
  // The constructor + slidingWindow helper are passed in (rather than imported
  // at module top-level) so this file can be loaded even if the optional
  // `@upstash/ratelimit` package isn't resolvable.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly RatelimitCtor: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly slidingWindow: any;

  constructor(opts: {
    redis: unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Ratelimit: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    slidingWindow: any;
  }) {
    this.redis = opts.redis;
    this.RatelimitCtor = opts.Ratelimit;
    this.slidingWindow = opts.slidingWindow;
  }

  async limit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    const key = `${limit}:${windowSeconds}`;
    let client = this.clients.get(key);
    if (!client) {
      // Build the window string in the format @upstash/ratelimit expects
      // (e.g. "60 s"). The library parses this with a `Duration` template
      // literal type; the runtime value is what matters.
      client = new this.RatelimitCtor({
        redis: this.redis,
        limiter: this.slidingWindow(limit, `${windowSeconds} s`),
        prefix: "fdh:",
      }) as UpstashClient;
      this.clients.set(key, client);
    }

    const result = await client.limit(identifier);
    return {
      success: result.success,
      limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
}

// Minimal structural type covering the only method we call on the Upstash
// Ratelimit client. Keeps us decoupled from the library's exact return shape.
interface UpstashClient {
  limit: (id: string) => Promise<RateLimitResult>;
}

// Lazily resolve the active limiter. Doing this at module load time would
// crash if `@upstash/ratelimit` isn't installed — we want graceful fallback.
let cachedLimiter: RateLimiter | null = null;

async function getLimiter(): Promise<RateLimiter | "unavailable"> {
  if (cachedLimiter) return cachedLimiter;

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  // Fail-closed in real production runtimes (not CI / local e2e). Vercel
  // production sets VERCEL_ENV=production; CI sets CI=true and must keep the
  // in-memory limiter so builds and Playwright can run without Upstash.
  const requireUpstash =
    process.env.NODE_ENV === "production" &&
    process.env.CI !== "true" &&
    process.env.ALLOW_MEMORY_RATE_LIMIT !== "true" &&
    (process.env.VERCEL_ENV === "production" ||
      process.env.RATE_LIMIT_FAIL_CLOSED === "true");

  if (restUrl && restToken) {
    try {
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url: restUrl, token: restToken });
      cachedLimiter = new UpstashRateLimiter({
        redis,
        Ratelimit,
        slidingWindow: Ratelimit.slidingWindow,
      });
      return cachedLimiter;
    } catch {
      if (requireUpstash) return "unavailable";
    }
  }

  if (requireUpstash) {
    return "unavailable";
  }

  cachedLimiter = new MemoryRateLimiter();
  return cachedLimiter;
}

/**
 * Extract a stable client identifier from a request. Prefers the
 * `X-Forwarded-For` header (set by Vercel and most proxies); falls back to
 * the connection remote address from the Next runtime.
 */
export function getClientIdentifier(req: Request | NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    // Use the leftmost (original client) IP.
    return xff.split(",")[0].trim();
  }
  // NextRequest exposes `req.ip` on Vercel; falls back to a literal for local
  // dev where no IP is available.
  const ip = (req as unknown as { ip?: string }).ip;
  return ip ?? "local";
}

/**
 * Convenience: enforce a rate limit on a request. Returns a `Response` (429)
 * if the caller is over the limit, or `null` if the request is allowed.
 *
 * @example
 * ```ts
 * const limited = await enforceRateLimit(request, { limit: 5, windowSeconds: 60 });
 * if (limited) return limited;
 * ```
 */
export async function enforceRateLimit(
  req: Request | NextRequest,
  opts: { limit: number; windowSeconds: number; identifierSuffix?: string },
): Promise<Response | null> {
  const ip = getClientIdentifier(req);
  const identifier = opts.identifierSuffix
    ? `${ip}:${opts.identifierSuffix}`
    : ip;
  const limiter = await getLimiter();

  if (limiter === "unavailable") {
    return Response.json(
      {
        error:
          "Rate limiting is misconfigured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
      },
      { status: 503 },
    );
  }

  const result = await limiter.limit(
    identifier,
    opts.limit,
    opts.windowSeconds,
  );

  if (!result.success) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((result.reset - Date.now()) / 1000),
    );
    return Response.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.floor(result.reset / 1000)),
        },
      },
    );
  }

  return null;
}
