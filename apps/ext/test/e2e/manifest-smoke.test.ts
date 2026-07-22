import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { toolCount, toolMetadata } from "../../tools/metadata";

/**
 * Lightweight post-build smoke checks (extension e2e stand-in).
 * Full Chromium extension automation is finicky on CI; these assertions
 * catch manifest/permission/catalog regressions after `bun run build`.
 */
describe("extension build smoke", () => {
  const manifestPath = join(
    process.cwd(),
    ".output/chrome-mv3/manifest.json",
  );

  it("toolCount matches product claim (50)", () => {
    expect(toolCount).toBe(50);
  });

  it("web SEO catalog includes every extension tool id", () => {
    const toolsTsPath = join(process.cwd(), "../web/data/tools.ts");
    expect(existsSync(toolsTsPath)).toBe(true);
    const toolsTs = readFileSync(toolsTsPath, "utf8");
    for (const id of Object.keys(toolMetadata)) {
      expect(toolsTs, `missing SEO page for ${id}`).toContain(`slug: "${id}"`);
    }
    expect(toolsTs).toContain("export const TOOL_COUNT = 50");
  });

  it("built manifest uses optional host permissions (opt-in)", () => {
    if (!existsSync(manifestPath)) {
      // Build not present — skip in unit-only runs; ext-ci builds first.
      return;
    }
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      optional_host_permissions?: string[];
      host_permissions?: string[];
      permissions?: string[];
    };
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.optional_host_permissions?.length).toBeGreaterThan(0);
    expect(manifest.host_permissions ?? []).toHaveLength(0);
  });
});
