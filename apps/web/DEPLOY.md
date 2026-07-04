# Deploy runbook — apps/web

Step-by-step checklist for shipping `apps/web` to production on Vercel. Work
top to bottom; each section is self-contained so you can also use this as a
reference when rotating credentials or debugging a partial deploy.

This runbook assumes the codebase is already production-finalized (Sentry
wired via `instrumentation.ts`, env vars documented in `.env.example`,
migrations committed under `prisma/migrations/`).

---

## 0. Prerequisites

- A Vercel account linked to the GitHub repo.
- A Neon Postgres project (or compatible Postgres) with the **pooler** URL
  handy.
- A Resend account with `frontenddevhelper.com` (or your domain) verified.
- A Sentry account and org.
- (Optional) Google + GitHub OAuth apps.
- (Optional) Upstash Redis DB for distributed rate limiting.

---

## 1. Rotate the leaked Neon password

The original Neon DB password was committed at-rest in `apps/web/.env` (never
in git, but it lived on disk). Rotate it before going live.

1. Open the **Neon dashboard** → your project → **Roles**.
2. Find the role used by `DATABASE_URL` (default `neondb_owner`).
3. Click **Rotate password**. Copy the new password.
4. Build the new connection string:
   ```
   postgresql://<role>:<new-password>@<pooler-host>/<db>?sslmode=require&channel_binding=require
   ```
   Use the **pooler** host (ends in `-pooler.<region>.aws.neon.tech`), not the
   direct host — the pooler handles both runtime queries and migrations.
5. Update the password **everywhere** it lives:
   - Vercel project env vars (see §3).
   - GitHub Actions secret if you wire migrations to CI.
   - Your local `apps/web/.env` for dev.
6. Smoke-test the new URL:
   ```sh
   bun run --filter=web db:migrate   # should print "No pending migrations"
   ```

Anyone with disk access to the old machine still has the old password; treat
the rotation as mandatory, not optional.

---

## 2. Vercel project setup

1. Import the GitHub repo into Vercel.
2. **Root directory:** set to `apps/web` (Vercel should auto-detect, verify).
3. **Build command:** `bun run build` (already set in `vercel.json`).
4. **Install command:** `bun install` (already set).
5. **Node version:** 22+ (Project Settings → General → Node.js Version).

---

## 3. Vercel env-var checklist

Set these in **Project Settings → Environment Variables**. Add each to the
**Production**, **Preview**, and **Development** scopes unless noted.

| Variable                     | Required | Scope      | Where to get it                                                                                     |
| ---------------------------- | -------- | ---------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`               | yes      | all        | Neon pooler URL (post-rotation, see §1). Must include `?sslmode=require`.                           |
| `NEXTAUTH_SECRET`            | yes      | all        | Generate with `openssl rand -base64 32`. Different value per environment is fine.                   |
| `NEXTAUTH_URL`               | yes      | prod, prev | Canonical HTTPS URL: `https://frontenddevhelper.com` (prod), preview URL for preview.               |
| `RESEND_API_KEY`             | yes      | all        | Resend dashboard → API Keys.                                                                        |
| `GOOGLE_CLIENT_ID`           | optional | all        | Google Cloud Console → API & Services → Credentials (OAuth client).                                 |
| `GOOGLE_CLIENT_SECRET`       | optional | all        | Same as above.                                                                                      |
| `GITHUB_CLIENT_ID`           | optional | all        | GitHub → Settings → Developer settings → OAuth Apps.                                                |
| `GITHUB_CLIENT_SECRET`       | optional | all        | Same as above.                                                                                      |
| `UPSTASH_REDIS_REST_URL`     | optional | all        | Upstash console → your DB → REST API section. **Required in prod** for rate-limiting.               |
| `UPSTASH_REDIS_REST_TOKEN`   | optional | all        | Same.                                                                                               |
| `NEXT_PUBLIC_SENTRY_DSN`     | optional | all        | Sentry → Project Settings → Client Keys. Public (the `NEXT_PUBLIC_` prefix is intentional).         |
| `SENTRY_AUTH_TOKEN`          | optional | prod       | Sentry → Settings → Auth Tokens. **Do NOT** scope as `NEXT_PUBLIC_`.                                |
| `SENTRY_ORG`                 | optional | prod       | Sentry org slug.                                                                                    |
| `SENTRY_PROJECT`             | optional | prod       | Sentry project slug.                                                                                |
| `NEXT_PUBLIC_SENTRY_RELEASE` | optional | prod       | Set automatically to the commit SHA in CI (see §6). For Vercel builds, leave unset.                 |
| `SENTRY_CSP_INGEST_HOST`     | optional | prod       | Tightens the CSP `connect-src` to your specific Sentry ingest host, e.g. `o12345.ingest.sentry.io`. |
| `LOG_LEVEL`                  | optional | all        | winston level. Default `info`. Use `debug` to diagnose, then revert.                                |

After saving, trigger a redeploy for the env vars to take effect.

---

## 4. Sentry project setup

1. Create a Next.js project in Sentry.
2. Copy the **DSN** into `NEXT_PUBLIC_SENTRY_DSN` (Vercel + GitHub Actions
   secret).
3. Generate an auth token (org-level, scopes: `org:read`, `project:releases`,
   `team:read`). Set it as:
   - Vercel env var `SENTRY_AUTH_TOKEN` (Production scope).
   - GitHub Actions secret `SENTRY_AUTH_TOKEN` (so the `web-ci.yml` build
     step uploads source maps from CI).
4. Set `SENTRY_ORG` and `SENTRY_PROJECT` in both Vercel and GitHub Actions
   secrets.
5. (Recommended) **Releases & source maps**:
   - The Sentry webpack wrapper in `next.config.ts` automatically creates a
     release keyed by commit SHA when `SENTRY_AUTH_TOKEN` is present.
   - In CI we set `NEXT_PUBLIC_SENTRY_RELEASE: ${{ github.sha }}` so client
     errors tag the release too.
   - In Vercel builds, set `NEXT_PUBLIC_SENTRY_RELEASE` to
     `${vercel.gitCommitSha}` via the Vercel UI to match.
6. **Verify:** push a commit, then check Sentry → Releases for a new entry
   with source-map-backed stack traces within a few minutes of the build.

---

## 5. Resend domain verification

`lib/email.ts` sends from `noreply@frontenddevhelper.com`. If the domain
isn't verified, sends silently fail and users never get verification links.

1. Resend dashboard → **Domains** → Add `frontenddevhelper.com`.
2. Add the three DNS records Resend shows (SPF, DKIM, DMARC or MX as
   applicable).
3. Wait for the "Verified" badge (usually minutes, sometimes hours for DNS
   propagation).
4. **Verify:** with `RESEND_API_KEY` set locally, run `bun run --filter=web
dev`, sign up with a real email you control, and confirm the verification
   email arrives.

---

## 6. OAuth providers

For each provider you intend to support:

### Google

1. Google Cloud Console → **APIs & Services → Credentials → Create
   credentials → OAuth client ID**.
2. Application type: **Web application**.
3. Authorized JavaScript origins:
   - `http://localhost:7393` (dev)
   - `https://frontenddevhelper.com` (prod)
   - Your Vercel preview URL pattern (e.g.
     `https://*-frontenddevhelper.vercel.app`).
4. Authorized redirect URIs (must match exactly):
   - `http://localhost:7393/api/auth/callback/google`
   - `https://frontenddevhelper.com/api/auth/callback/google`
5. Copy the client ID and secret to Vercel env vars `GOOGLE_CLIENT_ID` /
   `GOOGLE_CLIENT_SECRET`.

### GitHub

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Homepage URL: `https://frontenddevhelper.com`.
3. Authorization callback URL:
   `https://frontenddevhelper.com/api/auth/callback/github`.
4. Copy client ID + secret to Vercel env vars.

### Behavior notes

- If `GOOGLE_CLIENT_ID` / `GITHUB_CLIENT_ID` are unset, the providers simply
  don't register and the login page buttons will throw when clicked — that's
  expected for environments where OAuth isn't provisioned.
- The sign-in flow refuses to silently link an OAuth identity to an existing
  credentials account; users must sign in with their original method first.

---

## 7. Upstash Redis (production rate limiting)

Without Upstash, every Vercel serverless instance keeps its own in-memory
rate-limit bucket — an attacker can multiply their budget by the instance
count.

1. Upstash console → Create DB. Pick the same region as your Vercel project
   to minimize latency.
2. Copy **REST URL** and **REST Token** to Vercel env vars
   `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
3. The app auto-detects these on next cold start and switches from
   `MemoryRateLimiter` to `UpstashRateLimiter`.

---

## 8. Apply database migrations

The migration directory `apps/web/prisma/migrations/` is the source of truth.
Apply it to production with:

```sh
# From repo root, against the production DATABASE_URL
DATABASE_URL='<your-production-pooler-url>' \
  bun run --filter=web db:migrate
```

Or wire it as a Vercel build command:

1. Project Settings → Git → Build Command → override to
   `bun run db:migrate && bun run build`.
2. Verify `DATABASE_URL` is set in the **Production** scope.

Always run `db:migrate` (which calls `prisma migrate deploy`) — never
`db:push` in production. `migrate deploy` only applies pending migrations
from the directory and is safe to re-run.

The `prod_hardening` migration is safe to apply on any DB that has the prior
two migrations already applied. If you have legacy `User.resetToken`
duplicates (multiple rows with the same hash), it will fail on the
`CREATE UNIQUE INDEX` step — dedupe those rows first.

---

## 9. Final deploy

1. Push to `main`. Vercel auto-deploys.
2. Watch the build log for: Prisma generate, Next.js build, Sentry source-map
   upload (look for `> Sourcemaps uploading...`).
3. When the deployment goes green, hit `https://frontenddevhelper.com/health`
   — expect `{"status":"healthy","db":"ok"}`.

---

## 10. Smoke test checklist

Run through this on the production URL after deploy:

- [ ] `/` renders with the hero section and the correct tool count.
- [ ] `/sitemap.xml` returns XML listing all 30 tool pages.
- [ ] `/robots.txt` returns the rules with the sitemap pointer.
- [ ] `/signup` accepts an email + password → server returns the
      anti-enumeration success message.
- [ ] Verification email arrives (Resend) and the link works → user is
      redirected to `/login` with a "verified" state.
- [ ] `/login` with the verified credentials works → redirected to
      `/dashboard`.
- [ ] `/dashboard` shows the user's email.
- [ ] `/dashboard` blocked for unauthenticated users (redirect to `/login`).
- [ ] `/forgot-password` returns success for both known and unknown emails
      (anti-enumeration).
- [ ] Password reset flow round-trips end-to-end.
- [ ] OAuth (Google and/or GitHub) sign-in works and lands on `/dashboard`.
- [ ] `/api/referrals` (called from the dashboard referrals widget) returns
      aggregate state — no email/name of the referred user.
- [ ] Sentry receives a test error: trigger one via the devtools console
      (`throw new Error('deploy smoke test')`) and confirm it appears in Sentry
      with the right release tag.
- [ ] Lighthouse on `/` is green (a11y ≥ 0.9 as error, perf/LCP/CLS as
      error).

---

## 11. Ongoing operations

- **Rotate `NEXTAUTH_SECRET`** by re-deploying with a new value. All existing
  JWT sessions invalidate immediately (users are signed out).
- **Roll back a deploy** via the Vercel dashboard → Deployments → Promote
  Previous.
- **Add new migrations** by editing `prisma/schema.prisma`, running
  `bun run --filter=web db:migrate-dev -- --name <change>` against a dev DB,
  committing the new `migrations/<timestamp>_<name>/migration.sql`, then
  deploying — `db:migrate` on prod picks it up.
- **Tune Sentry `tracesSampleRate`** in `sentry.{client,server}.config.ts`.
  Start at `0.1`; raise if you're under your Sentry quota, lower if you're
  noisy.
