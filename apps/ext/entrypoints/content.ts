import { ToolRunner } from "@/content/tool-runner";
import type { PageContextData } from "@/lib/messaging/types";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  main(ctx) {
    // Notify background that content script is ready
    browser.runtime
      .sendMessage({
        type: "CONTENT_READY",
        supportedTools: [],
      })
      .catch(() => {});

    // Initialize the tool runner
    const runner = new ToolRunner({
      onInvalidated: ctx.onInvalidated,
    });

    // Right-click element tracking
    let lastRightClickedElement: HTMLElement | null = null;
    document.addEventListener(
      "contextmenu",
      (e: MouseEvent) => {
        lastRightClickedElement =
          e.target instanceof HTMLElement ? e.target : null;
      },
      true,
    );

    // Capture console errors for AI context
    const consoleErrors: string[] = [];
    const originalError = console.error;
    console.error = (...args: unknown[]) => {
      consoleErrors.push(args.map(String).join(" "));
      if (consoleErrors.length > 50) consoleErrors.shift();
      originalError.apply(console, args);
    };
    window.addEventListener(
      "error",
      (e) => {
        consoleErrors.push(
          `${e.message} at ${e.filename}:${e.lineno}:${e.colno}`,
        );
        if (consoleErrors.length > 50) consoleErrors.shift();
      },
      true,
    );

    // Message listener
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      const msg = message as {
        type: string;
        toolId?: string;
        config?: Record<string, unknown>;
      };

      switch (msg.type) {
        case "BG_ACTIVATE_TOOL":
          if (msg.toolId) {
            runner.activate(msg.toolId, msg.config);
          }
          sendResponse({ success: true });
          return false;

        case "BG_DEACTIVATE_TOOL":
          if (msg.toolId) {
            runner.deactivate(msg.toolId);
          }
          sendResponse({ success: true });
          return false;

        case "BG_DEACTIVATE_ALL":
          runner.deactivateAll();
          sendResponse({ success: true });
          return false;

        case "BG_PING":
          sendResponse({ pong: true, activeTools: runner.getActiveToolIds() });
          return false;

        case "BG_TOOL_STATE_CHANGED":
          sendResponse({ acknowledged: true });
          return false;

        case "BG_COLLECT_PAGE_CONTEXT": {
          const data = collectPageContext(consoleErrors);
          sendResponse({ data });
          return false;
        }

        case "BG_COPY_CSS_SELECTOR": {
          const el = lastRightClickedElement;
          // Clear the captured element immediately so a stale reference is
          // never reused on a subsequent invocation (e.g. if the element was
          // since removed from the DOM).
          lastRightClickedElement = null;
          if (!el) {
            sendResponse({ success: false, error: "No element right-clicked" });
            return false;
          }
          if (!document.body.contains(el)) {
            sendResponse({
              success: false,
              error: "Right-clicked element is no longer in the DOM",
            });
            return false;
          }

          const selector = generateCssSelector(el);
          navigator.clipboard.writeText(selector).then(
            () => sendResponse({ success: true, selector }),
            (err) => sendResponse({ success: false, error: String(err) }),
          );
          return true;
        }

        case "BG_VSCODE_REQUEST": {
          const req = message as {
            method: string;
            params: Record<string, unknown>;
          };
          handleVSCodeRequest(req.method, req.params)
            .then((result) => sendResponse({ result }))
            .catch((err) =>
              sendResponse({
                error: err instanceof Error ? err.message : String(err),
              }),
            );
          return true;
        }

        default:
          return false;
      }
    });

    // Cleanup on invalidation
    ctx.onInvalidated(() => {
      runner.deactivateAll();
    });

    console.log("[FDH] Content script initialized");
  },
});

function collectPageContext(consoleErrors: string[]): PageContextData {
  const allElements = document.querySelectorAll("*");
  const images = document.querySelectorAll("img");
  const links = document.querySelectorAll("a[href]");
  const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const scripts = document.querySelectorAll("script");
  const stylesheets = document.querySelectorAll(
    'link[rel="stylesheet"], style',
  );
  const forms = document.querySelectorAll("form");
  const inputs = document.querySelectorAll("input, select, textarea");

  let imagesWithoutAlt = 0;
  images.forEach((img) => {
    if (!img.hasAttribute("alt")) imagesWithoutAlt++;
  });

  let inputsWithoutLabel = 0;
  inputs.forEach((input) => {
    const id = input.getAttribute("id");
    const hasAriaLabel =
      input.hasAttribute("aria-label") || input.hasAttribute("aria-labelledby");
    const hasLabel = id
      ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
      : false;
    const isWrappedInLabel = input.closest("label");
    if (!hasAriaLabel && !hasLabel && !isWrappedInLabel) inputsWithoutLabel++;
  });

  const headingHierarchy: { level: number; text: string }[] = [];
  headings.forEach((h) => {
    headingHierarchy.push({
      level: parseInt(h.tagName[1]),
      text: h.textContent?.trim().slice(0, 80) || "",
    });
  });

  const navEntries = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  const perf = navEntries[0];
  const performanceData = perf
    ? {
        domContentLoaded: Math.round(
          perf.domContentLoadedEventEnd - perf.startTime,
        ),
        loadComplete: Math.round(perf.loadEventEnd - perf.startTime),
        domInteractive: Math.round(perf.domInteractive - perf.startTime),
        transferSize: perf.transferSize || 0,
      }
    : {
        domContentLoaded: 0,
        loadComplete: 0,
        domInteractive: 0,
        transferSize: 0,
      };

  const customPropertyCount = Array.from(document.styleSheets).reduce(
    (count: number, sheet) => {
      try {
        const rules = sheet.cssRules || [];
        for (const rule of rules) {
          if (rule instanceof CSSStyleRule && rule.selectorText === ":root") {
            const matches = rule.cssText.match(/--[\w-]+/g);
            count += matches?.length ?? 0;
          }
        }
      } catch {
        /* cross-origin stylesheet */
      }
      return count;
    },
    0,
  );

  let inlineStyles = 0;
  allElements.forEach((el) => {
    if ((el as HTMLElement).style?.cssText) inlineStyles++;
  });

  let localStorageKeys = 0;
  let sessionStorageKeys = 0;
  try {
    localStorageKeys = localStorage.length;
  } catch {
    /* blocked */
  }
  try {
    sessionStorageKeys = sessionStorage.length;
  } catch {
    /* blocked */
  }

  let cookieCount = 0;
  try {
    cookieCount = document.cookie.split(";").filter(Boolean).length;
  } catch {
    /* blocked */
  }

  const meta: Record<string, string> = {};
  document.querySelectorAll("meta").forEach((m) => {
    const name =
      m.getAttribute("name") ||
      m.getAttribute("property") ||
      m.getAttribute("http-equiv");
    if (name) meta[name] = m.getAttribute("content") || "";
  });

  const techStack: string[] = [];
  if (document.querySelector("[data-reactroot], [data-reactid], #__next"))
    techStack.push("React");
  if (document.querySelector("[data-v-], [data-server-rendered]"))
    techStack.push("Vue");
  if (document.querySelector("[ng-version], [data-ng-app]"))
    techStack.push("Angular");
  if (document.querySelector("[data-svelte]")) techStack.push("Svelte");
  if (
    document.querySelector('script[src*="jquery"]') ||
    (window as unknown as Record<string, unknown>).jQuery
  )
    techStack.push("jQuery");
  if (
    document.querySelector('script[src*="next"]') ||
    document.querySelector("#__next")
  )
    techStack.push("Next.js");
  if (document.querySelector('meta[name="generator"][content*="WordPress"]'))
    techStack.push("WordPress");
  if (document.querySelector('link[href*="wp-content"]'))
    techStack.push("WordPress");
  if (document.querySelector('script[src*="shopify"]'))
    techStack.push("Shopify");
  if (techStack.length === 0) techStack.push("Unknown");

  return {
    url: location.href,
    title: document.title,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    domStats: {
      totalElements: allElements.length,
      images: images.length,
      links: links.length,
      headings: headings.length,
      scripts: scripts.length,
      stylesheets: stylesheets.length,
      forms: forms.length,
      inputs: inputs.length,
      imagesWithoutAlt,
      inputsWithoutLabel,
    },
    headingHierarchy: headingHierarchy.slice(0, 30),
    performance: performanceData,
    css: {
      stylesheetCount: stylesheets.length,
      customPropertyCount,
      inlineStyles,
    },
    storage: { localStorageKeys, sessionStorageKeys, cookieCount },
    meta,
    techStack,
    consoleErrors: consoleErrors.slice(-20),
  };
}

function generateCssSelector(element: HTMLElement): string {
  if (element.id) return `#${CSS.escape(element.id)}`;

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (
    current &&
    current !== document.body &&
    current !== document.documentElement
  ) {
    let selector = current.tagName.toLowerCase();

    if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/).filter(Boolean);
      // Dedupe in deterministic order so the generated selector is stable
      // across re-renders that reorder class attributes.
      const unique = Array.from(new Set(classes));
      if (unique.length > 0) {
        selector += "." + unique.map((c) => CSS.escape(c)).join(".");
      }
    }

    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (el: Element) => el.tagName === current!.tagName,
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }

    path.unshift(selector);
    current = parent;
  }

  return path.join(" > ");
}

async function handleVSCodeRequest(
  method: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  switch (method) {
    case "inspectElement": {
      const selector = params.selector as string;
      const el = document.querySelector(selector);
      if (!el || !(el instanceof HTMLElement))
        throw new Error(`Element not found: ${selector}`);
      const computed = getComputedStyle(el);
      const styles: Record<string, string> = {};
      for (let i = 0; i < Math.min(computed.length, 50); i++) {
        const prop = computed[i];
        styles[prop] = computed.getPropertyValue(prop);
      }
      return {
        selector,
        tagName: el.tagName.toLowerCase(),
        id: el.id || undefined,
        className: el.className || undefined,
        textContent: el.textContent?.slice(0, 200) || "",
        innerHTML: el.innerHTML.slice(0, 1000),
        computedStyles: styles,
        boundingRect: el.getBoundingClientRect(),
        attributes: Array.from(el.attributes).map((a) => ({
          name: a.name,
          value: a.value,
        })),
        childCount: el.children.length,
        role: el.getAttribute("role"),
        ariaLabel: el.getAttribute("aria-label"),
        tabIndex: el.tabIndex,
      };
    }

    case "getCssRules": {
      const selector = params.selector as string;
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Element not found: ${selector}`);
      const rules: Array<{
        selectorText: string;
        cssText: string;
        href: string | null;
      }> = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules)) {
            if (rule instanceof CSSStyleRule && el.matches(rule.selectorText)) {
              rules.push({
                selectorText: rule.selectorText,
                cssText: rule.cssText,
                href: sheet.href,
              });
            }
          }
        } catch {
          /* cross-origin */
        }
      }
      return { selector, matchedRules: rules };
    }

    case "scanAccessibility": {
      const issues: Array<{
        severity: string;
        rule: string;
        message: string;
        selector: string;
      }> = [];
      document.querySelectorAll("img").forEach((img) => {
        if (!img.hasAttribute("alt")) {
          issues.push({
            severity: "error",
            rule: "img-alt",
            message: "Image missing alt text",
            selector: generateCssSelector(img as HTMLElement),
          });
        }
      });
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      let lastLevel = 0;
      headings.forEach((h) => {
        const level = parseInt(h.tagName[1]);
        if (lastLevel > 0 && level > lastLevel + 1) {
          issues.push({
            severity: "warning",
            rule: "heading-order",
            message: `Heading level skipped: h${lastLevel} to h${level}`,
            selector: generateCssSelector(h as HTMLElement),
          });
        }
        lastLevel = level;
      });
      document.querySelectorAll("input, select, textarea").forEach((input) => {
        const id = input.getAttribute("id");
        const hasLabel = id
          ? document.querySelector(`label[for="${CSS.escape(id)}"]`)
          : false;
        const hasAria =
          input.hasAttribute("aria-label") ||
          input.hasAttribute("aria-labelledby");
        const inLabel = input.closest("label");
        const isHidden =
          (input as HTMLInputElement).type === "hidden" ||
          input.hasAttribute("aria-hidden");
        if (!hasLabel && !hasAria && !inLabel && !isHidden) {
          issues.push({
            severity: "error",
            rule: "label",
            message: "Form input missing label",
            selector: generateCssSelector(input as HTMLElement),
          });
        }
      });
      document.querySelectorAll("a[href]").forEach((link) => {
        const text = link.textContent?.trim();
        if (!text && !link.querySelector("img[alt]")) {
          issues.push({
            severity: "warning",
            rule: "link-text",
            message: "Link missing accessible text",
            selector: generateCssSelector(link as HTMLElement),
          });
        }
      });
      return { issues, totalElements: document.querySelectorAll("*").length };
    }

    case "getComponentTree": {
      const components: Array<{
        name: string;
        file?: string;
        selector: string;
      }> = [];
      const reactRoot = document.querySelector("#root, #__next");
      if (reactRoot) {
        const fiberKey = Object.keys(reactRoot).find(
          (k) =>
            k.startsWith("__reactFiber$") ||
            k.startsWith("__reactInternalInstance$"),
        );
        if (fiberKey) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const walkFiber = (fiber: any, depth = 0) => {
            if (depth > 20 || !fiber) return;
            const name = fiber.type?.displayName || fiber.type?.name;
            const src = fiber._debugSource;
            if (
              name &&
              typeof name === "string" &&
              name[0] === name[0].toUpperCase()
            ) {
              components.push({
                name,
                file: src ? `${src.fileName}:${src.lineNumber}` : undefined,
                selector: `[data-component="${name}"]`,
              });
            }
            if (fiber.child) walkFiber(fiber.child, depth + 1);
            if (fiber.sibling) walkFiber(fiber.sibling, depth + 1);
          };
          walkFiber(
            (reactRoot as unknown as Record<string, unknown>)[fiberKey],
          );
        }
      }
      return {
        framework: components.length > 0 ? "React" : "Unknown",
        components: components.slice(0, 100),
      };
    }

    case "jumpToSource": {
      const selector = params.selector as string;
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Element not found: ${selector}`);
      // Try to resolve via React fiber
      const fiberKey = Object.keys(el).find(
        (k) =>
          k.startsWith("__reactFiber$") ||
          k.startsWith("__reactInternalInstance$"),
      );
      if (fiberKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fiber = (el as any)[fiberKey];
        const src = fiber?._debugSource;
        if (src) {
          return {
            file: src.fileName,
            line: src.lineNumber,
            column: src.columnNumber,
          };
        }
      }
      // Try to resolve via Vue instance
      const vueKey = Object.keys(el).find(
        (k) => k.startsWith("__vue__") || k.startsWith("__vue_app__"),
      );
      if (vueKey) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance = (el as any)[vueKey];
        const file =
          instance?.$options?.__file || instance?._instance?.type?.__file;
        if (file) return { file, line: 1, column: 1 };
      }
      throw new Error(
        "Could not resolve source location — no React/Vue fiber found",
      );
    }

    case "getDiagnostics": {
      return handleVSCodeRequest("scanAccessibility", {});
    }

    case "getSuggestions": {
      const imagesNoAlt = document.querySelectorAll("img:not([alt])").length;
      const inputsNoLabel = document.querySelectorAll(
        "input,select,textarea",
      ).length;
      const totalElements = document.querySelectorAll("*").length;
      const inlineStyles = Array.from(
        document.querySelectorAll("[style]"),
      ).length;
      const navEntries = performance.getEntriesByType(
        "navigation",
      ) as PerformanceNavigationTiming[];
      const perf = navEntries[0];

      const a11yResult = (await handleVSCodeRequest(
        "scanAccessibility",
        {},
      )) as {
        issues: Array<{ severity: string; rule: string; message: string }>;
      };
      const suggestions: Array<{
        area: string;
        priority: string;
        message: string;
      }> = [];

      if (imagesNoAlt > 0) {
        suggestions.push({
          area: "accessibility",
          priority: "high",
          message: `${imagesNoAlt} image(s) missing alt text`,
        });
      }
      if (inputsNoLabel > 0) {
        suggestions.push({
          area: "accessibility",
          priority: "high",
          message:
            "Form inputs may be missing labels — run scanAccessibility for details",
        });
      }
      if (perf && perf.domContentLoadedEventEnd - perf.startTime > 3000) {
        suggestions.push({
          area: "performance",
          priority: "medium",
          message: `DOMContentLoaded is ${Math.round(perf.domContentLoadedEventEnd - perf.startTime)}ms — consider lazy loading or code splitting`,
        });
      }
      if (totalElements > 1500) {
        suggestions.push({
          area: "performance",
          priority: "medium",
          message: `${totalElements} DOM elements — consider virtualizing long lists`,
        });
      }
      if (inlineStyles > 50) {
        suggestions.push({
          area: "layout",
          priority: "low",
          message: `${inlineStyles} inline styles detected — consider extracting to CSS classes`,
        });
      }
      for (const issue of a11yResult.issues) {
        suggestions.push({
          area: "accessibility",
          priority: issue.severity === "error" ? "high" : "medium",
          message: issue.message,
        });
      }

      const focusArea = (params.focusArea as string) ?? "all";
      const filtered =
        focusArea === "all"
          ? suggestions
          : suggestions.filter((s) => s.area === focusArea);
      return { suggestions: filtered };
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}
