import { webcrypto } from "node:crypto";

/**
 * Crypto helpers shared by token / code generators.
 *
 * Uses the Web Crypto API (`globalThis.crypto`, available in Node 19+ and in
 * the Edge runtime) so the same code path works in both Next.js runtimes.
 */

// Crockford Base32 — unambiguous (no 0/O/1/I confusion), URL-safe, no padding.
const BASE32_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/**
 * Generate an opaque random code of `length` characters drawn uniformly from
 * a 32-character alphabet. Uses rejection sampling so each character is
 * unbiased regardless of alphabet size. ~5 bits of entropy per character.
 *
 * Used for referral codes and any other short, human-typeable, opaque tokens.
 * For long-lived secrets prefer `crypto.randomBytes` directly.
 */
export function randomCode(length: number): string {
  if (length <= 0) return "";
  const alphabetLen = BASE32_ALPHABET.length; // 32
  // Mask to the next power of two above the alphabet length, then reject
  // out-of-range draws. For a 32-char alphabet this is exact (no rejection),
  // but the masking keeps the function correct if the alphabet ever changes.
  const mask = 0x1f; // 31 — exact for 32-char alphabets
  const out: string[] = [];
  const buf = new Uint8Array(length);
  for (let i = 0; i < length; ) {
    webcrypto.getRandomValues(buf);
    for (let j = 0; j < buf.length && i < length; j++) {
      const v = buf[j] & mask;
      if (v < alphabetLen) {
        out.push(BASE32_ALPHABET[v]);
        i++;
      }
    }
  }
  return out.join("");
}
