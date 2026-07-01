-- Hash existing plaintext reset & verification tokens (RR-2 hardening).
--
-- Tokens written before this migration are stored as raw 64-char hex strings
-- (randomBytes(32).toString('hex')). New code hashes them with SHA-256 before
-- writing AND before lookup, so any existing plaintext row would never match
-- a lookup. This migration one-way-hashes every existing row so the new code
-- path finds them.

-- Required for the digest() function used below.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "resetTokenHashed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EmailVerification" ADD COLUMN IF NOT EXISTS "tokenHashed" BOOLEAN NOT NULL DEFAULT false;

-- Hash all existing reset tokens that haven't been marked hashed yet.
UPDATE "User"
SET "resetToken" = encode(digest(COALESCE("resetToken", ''), 'sha256'), 'hex'),
    "resetTokenHashed" = true
WHERE "resetToken" IS NOT NULL AND "resetTokenHashed" = false;

-- Hash all existing verification tokens that haven't been marked hashed yet.
UPDATE "EmailVerification"
SET "token" = encode(digest(COALESCE("token", ''), 'sha256'), 'hex'),
    "tokenHashed" = true
WHERE "tokenHashed" = false;

-- Marker columns stay in place (small, useful for audit). Drop in a later
-- migration once we're confident no plaintext rows remain.
