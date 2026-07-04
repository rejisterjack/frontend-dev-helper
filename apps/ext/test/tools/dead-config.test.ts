import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { toolMetadata } from "@/tools/metadata";

const ROOT = join(__dirname, "..", "..", "tools");

/**
 * Phase 2 meta-test: every key declared in a tool's `configSchema` must be
 * referenced by name inside the tool's own source file. A key that appears in
 * `configSchema` but never in the implementation is dead config — the UI lies
 * to the user by showing a toggle that does nothing.
 *
 * We scan the raw source (not the imported module) because the run() body may
 * read the key from `config` via computed access, destructure, or `cfg.x`.
 * String-matching the identifier is the most robust signal we have without
 * full type introspection, and it has held up well across the rewrite.
 */
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      // Skip non-tool modules: metadata registry, type declarations, barrel
      // index files. They re-declare config schemas for the UI but don't have
      // a run() that reads them.
      if (
        entry === "metadata.ts" ||
        entry === "types.ts" ||
        entry === "index.ts"
      ) {
        continue;
      }
      out.push(full);
    }
  }
  return out;
}

function extractConfigKeys(source: string): string[] {
  const keys: string[] = [];
  // Match `configSchema: { keyName: {` and the bare `  keyName: {` lines that
  // follow inside the block. Capturing identifiers before `:` inside the
  // configSchema object is sufficient — the object literal is small and
  // hand-written.
  const blockMatch = source.match(/configSchema\s*:\s*\{([\s\S]*?)\n\s{2}\}/);
  if (!blockMatch) return keys;
  const body = blockMatch[1];
  // A config key is a top-level (4-space or 6-space indented) identifier
  // followed by `:` and then `{` (an object literal — every config field is an
  // object with `type`, `label`, `default`). This avoids matching nested keys
  // like `type:` or `default:`.
  const re = /^\s{4,6}([a-zA-Z][a-zA-Z0-9]*)\s*:\s*\{/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

describe("dead-config meta-test", () => {
  const files = walk(ROOT);

  it("found tool source files to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = relative(process.cwd(), file).replace(/\\/g, "/");
    it(`${rel} references every configSchema key`, () => {
      const source = readFileSync(file, "utf8");
      const keys = extractConfigKeys(source);
      if (keys.length === 0) return; // no configSchema, skip

      // Phase 2 dead-config check: strip the configSchema block itself out of
      // the source, then check each key appears somewhere else in the module.
      // Many tools delegate config reads to module-scope helpers (e.g.
      // tech-detector's `detectAllTech(config)`), so we scan the whole file
      // minus the schema declaration. A key that only appears in configSchema
      // and nowhere else in the implementation is dead config.
      const stripped = source.replace(
        /configSchema\s*:\s*\{[\s\S]*?\n\s{2}\}/,
        "configSchema: { /* stripped */ }",
      );
      const missing = keys.filter((k) => !stripped.includes(k));
      if (missing.length > 0) {
        throw new Error(
          `Config keys declared in configSchema but never referenced in the implementation: ${missing.join(", ")}. ` +
            `Either wire them into the tool logic or remove them from the schema.`,
        );
      }

      expect(missing).toEqual([]);
    });
  }

  it("every tool with a configSchema has its keys listed in toolMetadata (or vice versa)", () => {
    // Sanity: the metadata-driven config schema and the in-file configSchema
    // should agree on key names. We only assert that no metadata key is
    // completely absent from its source file — a stronger per-key check is
    // covered above.
    const drift: string[] = [];
    for (const meta of Object.values(toolMetadata)) {
      const loaderPath = meta.loader
        .toString()
        .match(/import\(["'](.+)["']\)/)?.[1];
      if (!loaderPath) continue;
      const resolved = loaderPath.replace(/^\.\//, ROOT + "/");
      const file = resolved + ".ts";
      if (!existsSync(file)) {
        // Some loaders point at a barrel index; try the path as a directory.
        if (existsSync(resolved)) continue;
        continue;
      }
      const source = readFileSync(file, "utf8");
      const metaKeys = meta.configSchema ? Object.keys(meta.configSchema) : [];
      const fileKeys = extractConfigKeys(source);
      for (const k of metaKeys) {
        if (!fileKeys.includes(k)) {
          drift.push(
            `${meta.id}: "${k}" in metadata but not in file configSchema`,
          );
        }
      }
    }
    expect(drift).toEqual([]);
  });
});
