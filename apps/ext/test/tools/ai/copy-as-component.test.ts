import { describe, it, expect } from "vitest";
import {
  escapeAttr,
  generateCode,
  type ExtractedElement,
} from "@/tools/ai/copy-as-component";

function makeElement(
  overrides: Partial<ExtractedElement> = {},
): ExtractedElement {
  return {
    tag: "button",
    id: "",
    classes: ["btn", "primary"],
    attributes: {},
    ariaAttributes: {},
    role: "",
    inlineStyles: "",
    computedStyles: {},
    textContent: "Click me",
    children: [],
    images: [],
    formInfo: null,
    rect: { width: 100, height: 40 },
    ...overrides,
  };
}

describe("copy-as-component codegen", () => {
  describe("escapeAttr", () => {
    it("escapes HTML-sensitive characters for attribute values", () => {
      expect(escapeAttr("plain")).toBe("plain");
      expect(escapeAttr("a & b")).toBe("a &amp; b");
      expect(escapeAttr('say "hello"')).toBe("say &quot;hello&quot;");
      expect(escapeAttr("it's fine")).toBe("it&#39;s fine");
      expect(escapeAttr("<script>")).toBe("&lt;script&gt;");
    });
  });

  describe("generateCode (react)", () => {
    it("includes bound className and real text child, not a JSX comment placeholder", () => {
      const code = generateCode(makeElement(), "react", {
        includeTypes: false,
        includeStyles: false,
        includeAccessibility: false,
      });

      expect(code).toContain("className={className}");
      expect(code).toContain('"Click me"');
      expect(code).not.toContain("<!-- content -->");
      expect(code).not.toMatch(/\{\/\* content \*\/\}/);
    });
  });
});
