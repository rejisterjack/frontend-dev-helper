import { describe, it, expect } from "vitest";
import { getFileName } from "@/tools/inspection/source-map-viewer";

describe("getFileName", () => {
  it("returns the last path segment of an https URL", () => {
    expect(getFileName("https://example.com/assets/app.min.js")).toBe(
      "app.min.js",
    );
  });

  it("handles query strings and hashes by ignoring them via URL pathname", () => {
    expect(getFileName("https://cdn.example.com/bundle.js?v=1#x")).toBe(
      "bundle.js",
    );
  });

  it("falls back to full pathname when path ends with /", () => {
    const result = getFileName("https://example.com/folder/");
    expect(result).toBe("/folder/");
  });

  it("falls back to the raw input when the URL is invalid", () => {
    const notAUrl = "not a url at all";
    expect(getFileName(notAUrl)).toBe(notAUrl);
  });

  it("handles relative URLs by treating them as path-only", () => {
    // new URL("foo.js") throws, so we fall back to the raw string
    expect(getFileName("foo.js")).toBe("foo.js");
  });
});
