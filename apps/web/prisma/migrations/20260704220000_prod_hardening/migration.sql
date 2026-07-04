-- ---------------------------------------------------------------------------
-- prod_hardening: schema cleanup + missing indexes + timestamp parity
-- ---------------------------------------------------------------------------
-- Generated to bring migrations in sync with schema.prisma after the
-- production-readiness audit. Safe to apply on any DB that has the prior two
-- migrations (init + hash_existing_tokens) applied.
--
-- Notes:
--  * The previous migration set left the User column named "referredBy"
--    while the Prisma schema field was renamed to "referredById" — this
--    migration reconciles that drift.
--  * Several redundant secondary indexes duplicated unique constraints; we
--    drop them to remove write amplification.
--  * resetToken gets a unique index so password-reset lookups are
--    index-backed instead of full table scans.
--  * WebhookEvent.processed flips to default false so freshly-inserted
--    rows aren't mistaken for already-handled events.
--  * TeamMember / Referral / WebhookEvent get the missing updatedAt column
--    so every model follows the workspace timestamp convention.
-- ---------------------------------------------------------------------------

-- Drift fix: rename User.referredBy -> User.referredById (schema already
-- expects referredById).
ALTER TABLE "User" RENAME COLUMN "referredBy" TO "referredById";

-- Add unique index on User.resetToken so password-reset lookups use an index.
-- A concurrent-safe path is preferred in production; this migration assumes
-- the column has no duplicates (existing tokens are SHA-256 hashes of unique
-- random nonces, or NULL). If you have legacy duplicates, dedupe before
-- applying.
CREATE UNIQUE INDEX "User_resetToken_key" ON "User"("resetToken");

-- Drop redundant secondary indexes that duplicate unique constraints.
DROP INDEX "User_email_idx";
DROP INDEX "EmailVerification_token_idx";
DROP INDEX "License_key_idx";
DROP INDEX "Subscription_stripeCustomerId_idx";
DROP INDEX "Referral_referralCode_idx";
DROP INDEX "WebhookEvent_eventId_idx";

-- Add missing FK index for User.referredById.
CREATE INDEX "User_referredById_idx" ON "User"("referredById");

-- Add missing FK index for TeamPreset.createdBy.
CREATE INDEX "TeamPreset_createdBy_idx" ON "TeamPreset"("createdBy");

-- Add createdAt + updatedAt to TeamMember (previously had only joinedAt).
-- Both columns carry DEFAULT CURRENT_TIMESTAMP so existing rows backfill
-- cleanly; without it, Postgres refuses to add a NOT NULL column when the
-- table already contains rows (it cannot synthesize a value for them).
ALTER TABLE "TeamMember" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "TeamMember" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add updatedAt to Referral.
ALTER TABLE "Referral" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Add updatedAt to WebhookEvent.
ALTER TABLE "WebhookEvent" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- WebhookEvent.processed: default to false so unprocessed rows aren't
-- mistaken for handled ones.
ALTER TABLE "WebhookEvent" ALTER COLUMN "processed" SET DEFAULT false;
