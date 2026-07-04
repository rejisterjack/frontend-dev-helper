import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";
import {
  traceVariableDependencies,
  resolveVariableValue,
  type VariableNode,
} from "@/lib/css-analysis";

interface CSSVariable {
  name: string;
  value: string;
  computedValue: string;
  definedIn: string;
  scope: "global" | "element";
  usageCount: number;
  type: "color" | "size" | "font" | "shadow" | "other";
  references: Array<{ name: string; resolved: string }>;
  fallback?: string;
  registered?: { syntax?: string; initialValue?: string; inherits?: boolean };
}

function detectVariableType(value: string): CSSVariable["type"] {
  const v = value.toLowerCase();
  if (
    v.includes("rgb") ||
    v.includes("hsl") ||
    v.includes("#") ||
    /^(red|blue|green|yellow|purple|orange|black|white|gray|grey|transparent)$/.test(
      v,
    )
  )
    return "color";
  if (v.includes("px") && (v.includes("serif") || v.includes("sans")))
    return "font";
  if (v.includes("shadow") || /\d+px\s+\d+px\s+\d+px/.test(v)) return "shadow";
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|ch|ex)$/.test(v.trim())) return "size";
  return "other";
}

const VAR_REF_RE = /var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)/g;

function extractReferences(
  value: string,
): Array<{ name: string; fallback?: string }> {
  const refs: Array<{ name: string; fallback?: string }> = [];
  const re = new RegExp(VAR_REF_RE.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    refs.push({ name: m[1], fallback: m[2]?.trim() || undefined });
  }
  return refs;
}

interface PropertyRegistration {
  name: string;
  syntax?: string;
  initialValue?: string;
  inherits?: boolean;
}

function collectPropertyRegistrations(): Map<string, PropertyRegistration> {
  const registrations = new Map<string, PropertyRegistration>();
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList | null | undefined;
    try {
      rules = sheet.cssRules ?? sheet.rules;
    } catch {
      continue;
    }
    if (!rules) continue;
    walkForPropertyRules(rules, registrations);
  }
  return registrations;
}

function walkForPropertyRules(
  rules: CSSRuleList,
  registrations: Map<string, PropertyRegistration>,
): void {
  for (const rule of Array.from(rules)) {
    if (
      rule instanceof CSSMediaRule ||
      rule instanceof CSSSupportsRule ||
      rule instanceof CSSLayerBlockRule
    ) {
      try {
        walkForPropertyRules(rule.cssRules, registrations);
      } catch {
        /* nested cross-origin */
      }
      continue;
    }
    // CSSPropertyRule is the DOM interface for `@property` declarations.
    if (
      typeof CSSPropertyRule !== "undefined" &&
      rule instanceof CSSPropertyRule
    ) {
      const pr = rule as unknown as {
        name: string;
        syntax?: string;
        initialValue?: string;
        inherits?: boolean;
      };
      registrations.set(pr.name, {
        name: pr.name,
        syntax: pr.syntax,
        initialValue: pr.initialValue,
        inherits: pr.inherits,
      });
    }
  }
}

function walkStyleRules(
  rules: CSSRuleList,
  visitor: (rule: CSSStyleRule) => void,
): void {
  for (const rule of rules) {
    if (
      rule instanceof CSSMediaRule ||
      rule instanceof CSSSupportsRule ||
      rule instanceof CSSLayerBlockRule
    ) {
      try {
        walkStyleRules(rule.cssRules, visitor);
      } catch {
        /* cross-origin nested */
      }
      continue;
    }
    if (rule instanceof CSSStyleRule) visitor(rule);
  }
}

function getStylesheetVariables(): Map<
  string,
  { value: string; source: string; element: Element | null }
> {
  const vars = new Map<
    string,
    { value: string; source: string; element: Element | null }
  >();
  for (const sheet of document.styleSheets) {
    try {
      walkStyleRules(sheet.cssRules, (rule) => {
        const style = rule.style;
        for (let i = 0; i < style.length; i++) {
          const prop = style[i];
          if (prop.startsWith("--")) {
            const selector =
              rule.selectorText.split(",")[0]?.trim() || rule.selectorText;
            let element: Element | null = null;
            try {
              element = document.querySelector(selector);
            } catch {
              /* invalid selector */
            }
            vars.set(prop, {
              value: style.getPropertyValue(prop).trim(),
              source: rule.selectorText,
              element,
            });
          }
        }
      });
    } catch {
      /* cross-origin */
    }
  }
  return vars;
}

function collectAllVariables(
  propertyRegistrations: Map<string, PropertyRegistration>,
): CSSVariable[] {
  const variables: CSSVariable[] = [];
  const seen = new Set<string>();
  const stylesheetVars = getStylesheetVariables();

  function enrich(
    name: string,
    rawValue: string,
    computed: CSSStyleDeclaration,
  ): {
    references: Array<{ name: string; resolved: string }>;
    fallback: string | undefined;
  } {
    const refs = extractReferences(rawValue);
    const references = refs.map((r) => ({
      name: r.name,
      resolved: resolveVariableValue(r.name, computed),
    }));
    // Surface the FIRST fallback declared in the value, if any. We pick the
    // outer-most var() with a fallback so users can see what the cascade
    // falls back to (e.g. `var(--accent, #ccc)` → "#ccc").
    const fallback = refs.find((r) => r.fallback)?.fallback;
    return { references, fallback };
  }

  for (const [name, data] of stylesheetVars) {
    seen.add(name);
    const scopeEl = data.element ?? document.documentElement;
    const computed = getComputedStyle(scopeEl);
    const resolved = resolveVariableValue(name, computed);
    const { references, fallback } = enrich(name, data.value, computed);
    variables.push({
      name,
      value: data.value,
      computedValue:
        resolved || computed.getPropertyValue(name).trim() || data.value,
      definedIn: data.source,
      scope:
        data.source === ":root" ||
        data.source === "html" ||
        data.source === "body"
          ? "global"
          : "element",
      usageCount: 0,
      type: detectVariableType(resolved || data.value),
      references,
      fallback,
      registered: propertyRegistrations.get(name),
    });
  }

  // Inline style variables on any element
  const inlineEls = document.querySelectorAll('[style*="--"]');
  for (const el of inlineEls) {
    const htmlEl = el as HTMLElement;
    const matches = htmlEl.style.cssText.match(/--[\w-]+\s*:\s*[^;]+/g);
    if (matches) {
      for (const match of matches) {
        const parts = match.split(":").map((s) => s.trim());
        if (parts[0] && parts[1] && !seen.has(parts[0])) {
          seen.add(parts[0]);
          const computed = getComputedStyle(htmlEl);
          const resolved = resolveVariableValue(parts[0], computed);
          const { references, fallback } = enrich(parts[0], parts[1], computed);
          variables.push({
            name: parts[0],
            value: parts[1],
            computedValue:
              resolved ||
              computed.getPropertyValue(parts[0]).trim() ||
              parts[1],
            definedIn: "inline",
            scope: "element",
            usageCount: 0,
            type: detectVariableType(resolved || parts[1]),
            references,
            fallback,
            registered: propertyRegistrations.get(parts[0]),
          });
        }
      }
    }
  }

  return variables;
}

function groupVariablesByCategory(
  vars: CSSVariable[],
): Map<string, CSSVariable[]> {
  const groups = new Map<string, CSSVariable[]>();
  for (const v of vars) {
    let cat = "Other";
    const n = v.name.toLowerCase();
    if (
      n.includes("color") ||
      n.includes("bg") ||
      n.includes("background") ||
      n.includes("border")
    )
      cat = "Colors";
    else if (
      n.includes("size") ||
      n.includes("width") ||
      n.includes("height") ||
      n.includes("space") ||
      n.includes("padding") ||
      n.includes("margin")
    )
      cat = "Sizing";
    else if (
      n.includes("font") ||
      n.includes("text") ||
      n.includes("line") ||
      n.includes("letter")
    )
      cat = "Typography";
    else if (
      n.includes("shadow") ||
      n.includes("radius") ||
      n.includes("transition") ||
      n.includes("animation")
    )
      cat = "Effects";
    else if (
      n.includes("breakpoint") ||
      n.includes("screen") ||
      n.includes("media")
    )
      cat = "Responsive";
    else if (n.includes("z-") || n.includes("index")) cat = "Z-Index";
    const list = groups.get(cat) || [];
    list.push(v);
    groups.set(cat, list);
  }
  return groups;
}

function groupByScopeFn(vars: CSSVariable[]): Map<string, CSSVariable[]> {
  const groups = new Map<string, CSSVariable[]>();
  for (const v of vars) {
    const key = v.scope === "global" ? "Global" : "Element-scoped";
    const list = groups.get(key) || [];
    list.push(v);
    groups.set(key, list);
  }
  return groups;
}

export const cssVariableInspector: ToolDefinition = {
  id: "css-variable-inspector",
  name: "CSS Variable Inspector",
  description: "Browse and inspect CSS custom properties and their values",
  category: "css",
  icon: "Variable",
  configSchema: {
    groupByScope: { type: "boolean", label: "Group by Scope", default: true },
    showComputed: {
      type: "boolean",
      label: "Show Computed Values",
      default: true,
    },
    showFallbacks: { type: "boolean", label: "Show Fallbacks", default: false },
    filterPrefix: { type: "string", label: "Filter Prefix", default: "" },
  },
  run: (ctx, config = {}) => {
    const groupByScope = config.groupByScope !== false;
    const showComputed = config.showComputed !== false;
    const showFallbacks = config.showFallbacks === true;
    const filterPrefix =
      typeof config.filterPrefix === "string" ? config.filterPrefix.trim() : "";
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .fdh-cvi-overlay { position:fixed;top:20px;right:20px;width:400px;max-height:80vh;background:#1e1e2e;border:1px solid #313244;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,0.5);z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#cdd6f4;display:flex;flex-direction:column;overflow:hidden;pointer-events:auto }
      .fdh-cvi-header { display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #313244;background:#181825 }
      .fdh-cvi-header h3 { margin:0;font-size:14px;font-weight:600 }
      .fdh-cvi-close { background:none;border:none;color:#6c7086;font-size:20px;cursor:pointer;padding:0 4px }
      .fdh-cvi-close:hover { color:#f38ba8 }
      .fdh-cvi-content { flex:1;overflow-y:auto;padding:12px }
      .fdh-cvi-category { margin-bottom:16px }
      .fdh-cvi-category-title { font-weight:600;color:#89b4fa;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #313244 }
      .fdh-cvi-variable { display:flex;align-items:center;gap:8px;padding:8px;border-radius:6px;margin-bottom:4px;background:#313244 }
      .fdh-cvi-variable:hover { background:#45475a }
      .fdh-cvi-var-name { font-family:'Monaco','Consolas',monospace;font-size:11px;color:#f5c2e7;min-width:120px }
      .fdh-cvi-scope { font-size:9px;padding:2px 6px;border-radius:10px;background:#585b70;color:#cdd6f4 }
      .fdh-cvi-scope.global { background:#a6e3a1;color:#1e1e2e }
      .fdh-cvi-var-value { flex:1;display:flex;align-items:center;gap:8px }
      .fdh-cvi-color-preview { width:20px;height:20px;border-radius:4px;border:1px solid #6c7086;flex-shrink:0 }
      .fdh-cvi-var-input { flex:1;background:#1e1e2e;border:1px solid #45475a;border-radius:4px;padding:4px 8px;color:#cdd6f4;font-family:'Monaco','Consolas',monospace;font-size:11px }
      .fdh-cvi-var-input:focus { outline:none;border-color:#89b4fa }
      .fdh-cvi-footer { display:flex;gap:8px;padding:12px 16px;border-top:1px solid #313244;background:#181825 }
      .fdh-cvi-export { flex:1;padding:8px;background:#45475a;border:none;border-radius:6px;color:#cdd6f4;font-size:12px;cursor:pointer }
      .fdh-cvi-export:hover { background:#585b70 }
    `;
    document.head.appendChild(styleEl);

    const overlay = document.createElement("div");
    overlay.className = "fdh-cvi-overlay";
    overlay.setAttribute("data-fdh-overlay", "css-variable-inspector");
    addOverlayElement(overlay);

    const propertyRegistrations = collectPropertyRegistrations();

    function buildOverlay() {
      overlay.textContent = "";

      // Collect dependency data for the root element
      const depNodes = traceVariableDependencies(document.documentElement);
      const depMap = new Map<string, VariableNode>();
      for (const node of depNodes) {
        depMap.set(node.name, node);
      }

      // Header
      const header = document.createElement("div");
      header.className = "fdh-cvi-header";
      const title = document.createElement("h3");
      title.textContent = "CSS Variables";
      const closeBtn = document.createElement("button");
      closeBtn.className = "fdh-cvi-close";
      closeBtn.textContent = "×";
      header.appendChild(title);
      header.appendChild(closeBtn);
      overlay.appendChild(header);

      // Content
      const content = document.createElement("div");
      content.className = "fdh-cvi-content";

      const variables = collectAllVariables(propertyRegistrations);
      const filtered =
        filterPrefix.length > 0
          ? variables.filter((v) =>
              v.name.toLowerCase().includes(filterPrefix.toLowerCase()),
            )
          : variables;

      // Decide grouping: by scope (when groupByScope), else by semantic
      // category (color/typography/sizing/etc.) which is the more useful
      // browse mode for understanding a token system.
      const groups = groupByScope
        ? groupByScopeFn(filtered)
        : groupVariablesByCategory(filtered);

      for (const [category, vars] of groups) {
        const catDiv = document.createElement("div");
        catDiv.className = "fdh-cvi-category";
        const catTitle = document.createElement("div");
        catTitle.className = "fdh-cvi-category-title";
        catTitle.textContent = `${category} (${vars.length})`;
        catDiv.appendChild(catTitle);

        for (const v of vars) {
          const row = document.createElement("div");
          row.className = "fdh-cvi-variable";

          const nameSpan = document.createElement("span");
          nameSpan.className = "fdh-cvi-var-name";
          nameSpan.textContent = v.name;

          const scopeSpan = document.createElement("span");
          scopeSpan.className = `fdh-cvi-scope ${v.scope}`;
          scopeSpan.textContent = v.scope;

          const valueDiv = document.createElement("div");
          valueDiv.className = "fdh-cvi-var-value";

          if (v.type === "color") {
            const preview = document.createElement("span");
            preview.className = "fdh-cvi-color-preview";
            preview.style.background = v.computedValue;
            valueDiv.appendChild(preview);
          }

          const input = document.createElement("input");
          input.type = "text";
          input.className = "fdh-cvi-var-input";
          // When showComputed is on, show the resolved value (more useful for
          // debugging). Otherwise show the raw declared value.
          input.value = showComputed ? v.computedValue : v.value;
          input.dataset.var = v.name;
          valueDiv.appendChild(input);

          // Show the raw declared value below when computed differs, so users
          // can see both representations side by side.
          if (showComputed && v.computedValue !== v.value) {
            const raw = document.createElement("div");
            raw.style.cssText =
              "font-size:10px;color:#6c7086;font-family:monospace;margin-top:2px;";
            raw.textContent = `raw: ${v.value}`;
            valueDiv.appendChild(raw);
          }

          // Fallbacks: parsed from the declared value (e.g.
          // `var(--foo, #fff)` → fallback="#fff"). Always compute the
          // fallback so it's available; gate its visibility on showFallbacks.
          if (showFallbacks && v.fallback) {
            const fb = document.createElement("div");
            fb.className = "fdh-cvi-fallback";
            fb.textContent = `fallback: ${v.fallback}`;
            valueDiv.appendChild(fb);
          }

          // @property registration: show registered syntax + initial value
          // when the variable has been declared via `@property`.
          if (v.registered) {
            const reg = document.createElement("div");
            reg.className = "fdh-cvi-registered";
            const parts: string[] = [];
            if (v.registered.syntax)
              parts.push(`syntax: ${v.registered.syntax}`);
            if (v.registered.initialValue)
              parts.push(`initial: ${v.registered.initialValue}`);
            if (typeof v.registered.inherits === "boolean")
              parts.push(`inherits: ${v.registered.inherits}`);
            reg.textContent = `@property · ${parts.join(" | ")}`;
            valueDiv.appendChild(reg);
          }

          // Var() references in the declared value, with their resolved
          // chain values. This is the "walk the chain" view.
          if (v.references.length > 0) {
            const refs = document.createElement("div");
            refs.className = "fdh-cvi-refs";
            for (const ref of v.references) {
              const refRow = document.createElement("div");
              refRow.className = "fdh-cvi-ref-row";
              const refName = document.createElement("span");
              refName.className = "fdh-cvi-ref-name";
              refName.textContent = `↳ ${ref.name}`;
              const refVal = document.createElement("span");
              refVal.className = "fdh-cvi-ref-value";
              refVal.textContent = ref.resolved || "<empty>";
              refRow.appendChild(refName);
              refRow.appendChild(refVal);
              refs.appendChild(refRow);
            }
            valueDiv.appendChild(refs);
          }

          row.appendChild(nameSpan);
          row.appendChild(scopeSpan);
          row.appendChild(valueDiv);

          // Dependency chain visualization
          const depNode = depMap.get(v.name);
          if (depNode && depNode.dependencies.length > 0) {
            const chainDiv = document.createElement("div");
            chainDiv.style.cssText =
              "margin-top: 4px; padding-left: 4px; font-size: 10px; color: #6c7086; font-family: monospace;";

            // Build chain: var-name → dep1 → dep2 → terminal
            const chainParts: string[] = [v.name];
            let current: VariableNode | null = depNode;
            const visited = new Set<string>();
            while (
              current &&
              current.dependencies.length > 0 &&
              !visited.has(current.name)
            ) {
              visited.add(current.name);
              for (const dep of current.dependencies) {
                chainParts.push(dep);
                current = depMap.get(dep) || null;
                if (current) break;
              }
            }

            const chainText = chainParts.join(" → ");
            const chainLine = document.createElement("span");
            chainLine.style.color = "#6c7086";
            chainLine.textContent = chainText;
            chainDiv.appendChild(chainLine);

            // Show resolved value
            if (depNode.resolvedValue && depNode.resolvedValue !== v.value) {
              const resolved = document.createElement("span");
              resolved.style.cssText = "color: #a6e3a1; margin-left: 8px;";
              resolved.textContent = `= ${depNode.resolvedValue}`;
              chainDiv.appendChild(resolved);
            }

            row.appendChild(chainDiv);
          }

          catDiv.appendChild(row);
        }

        content.appendChild(catDiv);
      }

      overlay.appendChild(content);

      // Footer
      const footer = document.createElement("div");
      footer.className = "fdh-cvi-footer";
      for (const fmt of ["json", "css", "figma"] as const) {
        const btn = document.createElement("button");
        btn.className = "fdh-cvi-export";
        btn.dataset.format = fmt;
        btn.textContent = `Export ${fmt.toUpperCase()}`;
        footer.appendChild(btn);
      }
      overlay.appendChild(footer);

      attachListeners();
    }

    function attachListeners() {
      overlay
        .querySelector(".fdh-cvi-close")
        ?.addEventListener("click", cleanup);

      overlay.querySelectorAll(".fdh-cvi-var-input").forEach((input) => {
        input.addEventListener("change", (e) => {
          const t = e.target as HTMLInputElement;
          const varName = t.dataset.var;
          if (varName) {
            document.documentElement.style.setProperty(varName, t.value);
            const preview = t.parentElement?.querySelector(
              ".fdh-cvi-color-preview",
            ) as HTMLElement;
            if (preview) preview.style.background = t.value;
          }
        });
      });

      overlay.querySelectorAll(".fdh-cvi-export").forEach((btn) => {
        btn.addEventListener("click", () => {
          const format = (btn as HTMLElement).dataset.format as
            | "json"
            | "css"
            | "figma";
          const variables = collectAllVariables(propertyRegistrations);
          let data: string;
          if (format === "json") {
            data = JSON.stringify(
              Object.fromEntries(
                variables.map((v) => [
                  v.name.replace("--", ""),
                  { value: v.value, type: v.type, scope: v.scope },
                ]),
              ),
              null,
              2,
            );
          } else if (format === "css") {
            data = `:root {\n${variables
              .filter((v) => v.scope === "global")
              .map((v) => `  ${v.name}: ${v.value};`)
              .join("\n")}\n}`;
          } else {
            data = JSON.stringify(
              {
                version: "1.0",
                tokens: variables.map((v) => ({
                  name: v.name.replace("--", "").replace(/-/g, "/"),
                  value: v.value,
                  type: v.type === "color" ? "color" : "string",
                })),
              },
              null,
              2,
            );
          }
          const blob = new Blob([data], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `design-tokens.${format === "figma" ? "json" : format}`;
          a.click();
          URL.revokeObjectURL(url);
        });
      });
    }

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(buildOverlay, 500);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    buildOverlay();

    function cleanup() {
      if (debounceTimer) clearTimeout(debounceTimer);
      observer.disconnect();
      removeOverlayElement(overlay);
      styleEl.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
