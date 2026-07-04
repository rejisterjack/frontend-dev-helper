import winston from "winston";

const isProduction = process.env.NODE_ENV === "production";

// Redact email-shaped strings and common PII keys before log lines hit a
// transport. This is best-effort — production-grade PII hygiene lives at the
// call site (don't log secrets in the first place). The redactor only
// inspects string fields, so structured values like `error.stack` are not
// scrubbed.
const redact = winston.format((info) => {
  const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
  const REDACT_KEYS = new Set([
    "password",
    "passwordHash",
    "token",
    "resetToken",
    "authorization",
    "cookie",
    "apiKey",
    "secret",
  ]);

  const scrub = (value: unknown): unknown => {
    if (typeof value === "string") {
      return value.replace(EMAIL_RE, "[redacted-email]");
    }
    if (Array.isArray(value)) {
      return value.map(scrub);
    }
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[k] = REDACT_KEYS.has(k.toLowerCase()) ? "[redacted]" : scrub(v);
      }
      return out;
    }
    return value;
  };

  return scrub(info) as winston.Logform.TransformableInfo;
});

const baseFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  winston.format.timestamp(),
  redact(),
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  defaultMeta: { service: "frontend-dev-helper" },
  transports: [
    new winston.transports.Console({
      // Production: emit structured JSON so log shippers (Vercel, Datadog,
      // Logflare) can parse fields. Development: human-readable colorized
      // output for terminal ergonomics.
      format: isProduction
        ? winston.format.combine(baseFormat, winston.format.json())
        : winston.format.combine(
            baseFormat,
            winston.format.colorize(),
            winston.format.simple(),
          ),
    }),
  ],
});
