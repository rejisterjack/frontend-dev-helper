import { createHash } from "crypto";

/**
 * One-way hash for opaque tokens stored in the database.
 *
 * Tokens (email verification, password reset) are presented to the user as
 * plaintext over email and looked up verbatim by the verification endpoints.
 * Storing them in plaintext means a DB read = instant account takeover. We
 * therefore store the SHA-256 hash — fast, deterministic, and constant-time
 * comparison is unnecessary since hashes are not secret (the preimage is).
 *
 * We use SHA-256 (not bcrypt) because the lookup pattern requires a
 * searchable hash: bcrypt's salt makes it impossible to query
 * `WHERE token = ?` and we'd have to scan every row. SHA-256 with a long
 * (≥256-bit) random preimage is the standard recommendation for this case.
 *
 * @param token plaintext token (must be ≥32 bytes of entropy)
 * @returns lowercase hex SHA-256 digest
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Constant-time equality check for comparing secrets / hashes.
 *
 * Useful when verifying tokens received from untrusted input against values
 * read from storage. Avoids early-exit timing leaks of `===`.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
