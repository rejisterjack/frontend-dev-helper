# apps/web — Frontend Dev Helper marketing & account site

Next.js 15 (App Router) + React 19 + Prisma (PostgreSQL) + NextAuth v5 +
Resend (transactional email). Hosted at **frontenddevhelper.com**.

This is the public-facing site: landing page, tool-specific SEO pages, auth
(email/password + Google + GitHub), referral program, and the auth-gated
dashboard. The browser extension hits `/api/*` for license verification and
referral tracking.

---

## Quickstart

From the repo root:

```sh
bun install                          # installs all workspaces
cp apps/web/.env.example apps/web/.env
# Fill in DATABASE_URL, NEXTAUTH_SECRET, RESEND_API_KEY, etc.

bun run dev --filter=web             # http://localhost:7393
```

### Database setup

The Prisma schema lives at [`prisma/schema.prisma`](prisma/schema.prisma).
The committed migrations are at [`prisma/migrations/`](prisma/migrations/).

```sh
# Apply all migrations to your dev DB
bun run --filter=web db:migrate

# Regenerate the Prisma Client after schema changes
bun run --filter=web db:generate

# Open Prisma Studio (DB GUI)
bun run --filter=web db:studio
```

### Scripts

| Script        | What it does                                                            |
| ------------- | ----------------------------------------------------------------------- |
| `dev`         | `next dev -p 7393` — HMR dev server                                     |
| `build`       | `next build` — production build                                         |
| `start`       | `next start` — run the production build                                 |
| `lint`        | `eslint .` — flat-config ESLint (extends `@repo/eslint-config/next-js`) |
| `lint:fix`    | `eslint . --fix`                                                        |
| `check-types` | `tsc --noEmit`                                                          |
| `db:generate` | Regenerate Prisma Client                                                |
| `db:migrate`  | `prisma migrate deploy` (production-safe)                               |
| `db:push`     | `prisma db push` (dev only — no migration files)                        |
| `db:studio`   | Prisma Studio GUI                                                       |

---

## Environment variables

See [`apps/web/.env.example`](.env.example) for the canonical, commented list.
Required for boot:

- `DATABASE_URL` — Neon Postgres connection string (the `-pooler` URL from the
  Neon dashboard handles both runtime queries and migrations)
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL` — JWT signing + canonical URL
- `RESEND_API_KEY` — for verification and password-reset emails

Optional (the app boots without them but degrades gracefully):

- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — GitHub OAuth
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — distributed rate
  limiting (falls back to in-memory limiter if unset)
- `NEXT_PUBLIC_SENTRY_DSN` — Sentry error reporting
- `LOG_LEVEL` — winston level (default `info`)

---

## Architecture

```
apps/web/
├── app/
│   ├── (marketing)/             # public landing, /tools/[slug], /privacy, /terms
│   ├── (auth)/                  # /login, /signup, /verify-email, /forgot-password, /reset-password
│   ├── (dashboard)/             # auth-gated /dashboard
│   ├── api/
│   │   ├── auth/[...nextauth]/  # NextAuth handlers (rate-limited POST)
│   │   ├── auth/register/       # email/password signup (rate-limited)
│   │   ├── verify-email/
│   │   ├── forgot-password/     # always returns success (anti-enumeration)
│   │   ├── reset-password/
│   │   ├── referrals/           # list user's referrals
│   │   ├── referrals/code/      # generate a new referral code
│   │   └── health/              # GET → { status: 'healthy', db: 'ok' }
│   ├── error.tsx                # nested error boundary (Sentry-capturing)
│   ├── global-error.tsx         # root error boundary (replaces root layout)
│   ├── not-found.tsx            # branded 404
│   ├── opengraph-image.tsx      # dynamic OG image generator
│   └── layout.tsx               # root layout, metadata, fonts, Plausible
├── components/                  # landing-page sections, auth forms, UI primitives
├── data/                        # static content (tools.ts = tool metadata)
├── lib/
│   ├── auth.ts                  # NextAuth config (Credentials + Google + GitHub)
│   ├── db.ts                    # Prisma client singleton (Neon driver adapter)
│   ├── email.ts                 # Resend wrapper + HTML templates
│   ├── logger.ts                # winston JSON logger
│   ├── rate-limit.ts            # Upstash / in-memory rate limiter
│   └── tokens.ts                # SHA-256 token hashing
├── prisma/
│   ├── schema.prisma
│   ├── generated/               # ← gitignored; created by `prisma generate`
│   └── migrations/
├── middleware.ts                # auth gating + CSP nonce + rate-limit headers
├── next.config.ts               # security headers + Sentry wrapping
├── sentry.client.config.ts
├── sentry.server.config.ts
└── eslint.config.mjs            # flat ESLint config
```

### Security model

- **Auth**: NextAuth v5 with JWT sessions, bcrypt cost 12, OAuth linking.
- **Rate limiting**: All auth endpoints throttled per-IP and per-email.
  Upstash Redis when configured, in-memory fallback otherwise.
- **Tokens**: Email-verification and password-reset tokens are hashed with
  SHA-256 before storage. Plaintext goes only to the user's email.
- **Headers**: CSP with per-request nonce (middleware-generated), HSTS,
  X-Frame-Options DENY, Referrer-Policy, Permissions-Policy.
- **Anti-enumeration**: `/forgot-password` always returns success;
  `/register` returns the success message even when the email is taken.

---

## Deployment

**Vercel** is the intended host. [`vercel.json`](vercel.json) declares the
Bun install + build commands. To deploy:

1. Import the repo into Vercel.
2. Set all env vars from [`apps/web/.env.example`](.env.example) in the
   Vercel project settings (Production + Preview + Development).
3. Set `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` for source-map
   uploads.
4. Push to `main` — Vercel builds and deploys.
5. Run `bun run --filter=web db:migrate` against the production DB
   (or wire it as a Vercel build hook).

---

## CI

The [`web-ci`](../../.github/workflows/web-ci.yml) workflow runs on every
PR and push that touches `apps/web/`. It runs lint + type-check + build with
inert placeholder env vars.

---

## Troubleshooting

| Symptom                                        | Cause / Fix                                                                                                                                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Environment variable not found: DATABASE_URL` | You haven't created `.env` from `.env.example`, or Vercel env vars are missing.                                                                                                                                 |
| `PrismaClientInitializationError`              | DB URL is wrong, or the DB isn't reachable from the runtime. Use the Neon `-pooler` connection string in `DATABASE_URL`. The pooler handles both queries and migrations, so no separate `DIRECT_URL` is needed. |
| OAuth redirect loops                           | `NEXTAUTH_URL` doesn't match the deployed URL. Set it to the canonical HTTPS URL.                                                                                                                               |
| 429 on signup/login                            | You hit the rate limit. Wait 60s, or set Upstash env vars for higher limits.                                                                                                                                    |
| No confirmation email                          | `RESEND_API_KEY` missing, or the Resend domain isn't verified.                                                                                                                                                  |
