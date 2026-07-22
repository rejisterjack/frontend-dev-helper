-- Drop monetization / teams scaffolding (free-OSS alignment).

DROP TABLE IF EXISTS "TeamPreset" CASCADE;
DROP TABLE IF EXISTS "TeamMember" CASCADE;
DROP TABLE IF EXISTS "Team" CASCADE;
DROP TABLE IF EXISTS "Subscription" CASCADE;
DROP TABLE IF EXISTS "License" CASCADE;
DROP TABLE IF EXISTS "WebhookEvent" CASCADE;

DROP TYPE IF EXISTS "LicenseTier";
DROP TYPE IF EXISTS "LicenseStatus";
DROP TYPE IF EXISTS "SubscriptionStatus";
DROP TYPE IF EXISTS "TeamRole";
