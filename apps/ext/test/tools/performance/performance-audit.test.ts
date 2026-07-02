import { describe, it, expect } from "vitest";
import { getRating } from "@/tools/performance/performance-audit";

describe("performance-audit CWV ratings", () => {
  describe("getRating CLS thresholds", () => {
    it("rates CLS at or below 0.1 as good", () => {
      expect(getRating("CLS", 0)).toBe("good");
      expect(getRating("CLS", 0.05)).toBe("good");
      expect(getRating("CLS", 0.1)).toBe("good");
    });

    it("rates CLS between 0.1 and 0.25 as needs-improvement", () => {
      expect(getRating("CLS", 0.11)).toBe("needs-improvement");
      expect(getRating("CLS", 0.2)).toBe("needs-improvement");
      expect(getRating("CLS", 0.25)).toBe("needs-improvement");
    });

    it("rates CLS above 0.25 as poor", () => {
      expect(getRating("CLS", 0.26)).toBe("poor");
      expect(getRating("CLS", 0.5)).toBe("poor");
    });
  });

  describe("getRating other vitals", () => {
    it("applies LCP thresholds", () => {
      expect(getRating("LCP", 2000)).toBe("good");
      expect(getRating("LCP", 3000)).toBe("needs-improvement");
      expect(getRating("LCP", 5000)).toBe("poor");
    });

    it("applies FCP thresholds", () => {
      expect(getRating("FCP", 1500)).toBe("good");
      expect(getRating("FCP", 2500)).toBe("needs-improvement");
      expect(getRating("FCP", 4000)).toBe("poor");
    });
  });
});
