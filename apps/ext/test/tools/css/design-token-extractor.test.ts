import { describe, beforeEach, vi, it, expect } from "vitest";
import { designTokenExtractor } from "@/tools/css/design-token-extractor";
import { runStandardToolTests } from "../../helpers";

describe("designTokenExtractor", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(designTokenExtractor, {
    id: "design-token-extractor",
    name: "Design Token Extractor",
    category: "css",
    icon: "palette",
  });

  it("is registered in the css category", () => {
    expect(designTokenExtractor.category).toBe("css");
  });
});
