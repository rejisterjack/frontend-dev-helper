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
 */
export class UpstashRateLimiter implements RateLimiter {
  private readonly ratelimit: {
    limit: (id: string) => Promise<{
      success: boolean;
      limit: number;
      remaining: number;
      reset: number;
    }>;
  };

  constructor(ratelimit: { limit: (id: string) => Promise<RateLimitResult> }) {
    this.ratelimit = ratelimit;
  }

  async limit(
    identifier: string,
    limit: number,
    windowSeconds: number,
  ): Promise<RateLimitResult> {
    // Upstash `slidingWindow` is configured at client construction time, not
    // per-call. We build the client per (limit, window) key lazily.
    const result = await this.ratelimit.limit(
      `${identifier}:${limit}:${windowSeconds}`,
    );
    return {
      success: result.success,
      limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }
}

// Lazily resolve the active limiter. Doing this at module load time would
// crash if `@upstash/ratelimit` isn't installed — we want graceful fallback.
let cachedLimiter: RateLimiter | null = null;

async function getLimiter(): Promise<RateLimiter> {
  if (cachedLimiter) return cachedLimiter;

  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (restUrl && restToken) {
    try {
      // Dynamic import — `@upstash/ratelimit` and `@upstash/redis` are
      // optional peer deps. They live in dependencies, but if for some reason
      // they fail to resolve (e.g. partial install) we fall back gracefully.
      const { Ratelimit } = await import("@upstash/ratelimit");
      const { Redis } = await import("@upstash/redis");
      const redis = new Redis({ url: restUrl, token: restToken });
      cachedLimiter = new UpstashRateLimiter(
        new Ratelimit({
          redis,
          limiter: Ratelimit.slidingWindow(60, "1 m"), // overridden per-call via identifier
          prefix: "fdh:",
        }),
      );
      return cachedLimiter;
    } catch {
      // Fall through to memory limiter
    }
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
