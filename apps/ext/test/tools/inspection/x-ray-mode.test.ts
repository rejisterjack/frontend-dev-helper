import { describe, it, expect } from "vitest";
import {
  parseColour,
  relativeLuminance,
  contrastRatio,
} from "@/tools/inspection/x-ray-mode";

describe("parseColour", () => {
  it("parses rgb()", () => {
    expect(parseColour("rgb(255, 0, 0)")).toEqual([255, 0, 0]);
  });

  it("parses rgba()", () => {
    expect(parseColour("rgba(10, 20, 30, 0.5)")).toEqual([10, 20, 30]);
  });

  it("returns null for non-rgb formats", () => {
    expect(parseColour("#ff0000")).toBeNull();
    expect(parseColour("red")).toBeNull();
    expect(parseColour("")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("white = 1.0", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1.0, 5);
  });

  it("black = 0.0", () => {
    expect(relativeLuminance([0, 0, 0])).toBeCloseTo(0.0, 5);
  });

  it("mid-grey is between 0 and 1", () => {
    const lum = relativeLuminance([128, 128, 128]);
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });

  it("green is brighter than red, red brighter than blue", () => {
    const g = relativeLuminance([0, 255, 0]);
    const r = relativeLuminance([255, 0, 0]);
    const b = relativeLuminance([0, 0, 255]);
    expect(g).toBeGreaterThan(r);
    expect(r).toBeGreaterThan(b);
  });
});

describe("contrastRatio", () => {
  it("identical luminance = 1.0", () => {
    expect(contrastRatio(0.5, 0.5)).toBeCloseTo(1.0, 5);
  });

  it("white-on-black = 21.0 (the max)", () => {
    const ratio = contrastRatio(1.0, 0.0);
    expect(ratio).toBeCloseTo(21.0, 1);
  });

  it("is symmetric", () => {
    const a = contrastRatio(0.8, 0.2);
    const b = contrastRatio(0.2, 0.8);
    expect(a).toBeCloseTo(b, 5);
  });

  it("WCAG AA white-on-black exceeds 7", () => {
    const ratio = contrastRatio(1.0, 0.0);
    expect(ratio).toBeGreaterThan(7);
  });
});
