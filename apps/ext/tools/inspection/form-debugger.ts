import type { ToolDefinition } from "../types";
import {
  addOverlayElement,
  removeOverlayElement,
} from "@/content/overlay-manager";

const AUTOFILL_FIELDS = [
  "name",
  "given-name",
  "family-name",
  "email",
  "tel",
  "street-address",
  "address-line1",
  "address-line2",
  "address-level1",
  "address-level2",
  "postal-code",
  "country",
  "organization",
  "username",
  "new-password",
  "current-password",
  "one-time-code",
  "cc-name",
  "cc-number",
  "cc-exp",
];

type FormControlElement =
  | HTMLInputElement
  | HTMLTextAreaElement
  | HTMLSelectElement
  | HTMLOutputElement
  | HTMLProgressElement
  | HTMLMeterElement;

const FORM_CONTROL_SELECTOR =
  "input, select, textarea, output, progress, meter, button, datalist";

interface FormField {
  element: FormControlElement;
  selector: string;
  name: string;
  type: string;
  value: string;
  isValid: boolean;
  validationMessage: string;
  isRequired: boolean;
  hasLabel: boolean;
  labelText?: string;
  hasError: boolean;
  autofill?: string;
}

interface FormInfo {
  element: HTMLElement;
  selector: string;
  name: string;
  action: string;
  method: string;
  fields: FormField[];
  isValid: boolean;
  accessibilityIssues: string[];
}

function generateSelector(el: HTMLElement): string {
  if (el.id) return "#" + CSS.escape(el.id);
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList)
    .filter((c) => !c.startsWith("fdh-"))
    .join(".");
  if (classes) return tag + "." + classes;
  if ((el as HTMLInputElement).name)
    return tag + '[name="' + (el as HTMLInputElement).name + '"]';
  return tag;
}

function getLabelInfo(field: FormControlElement): {
  hasLabel: boolean;
  text?: string;
} {
  const el = field as HTMLElement;
  if (el.id) {
    // Use CSS.escape so IDs containing colons, dots, etc. don't break the
    // selector. Plain string interpolation would fail for id="foo:bar".
    let explicit: HTMLLabelElement | null = null;
    try {
      explicit = document.querySelector(
        `label[for="${CSS.escape(el.id)}"]`,
      ) as HTMLLabelElement | null;
    } catch {
      // CSS.escape may not handle all edge cases; fall back to scanning.
      explicit = null;
      const labels = document.getElementsByTagName("label");
      for (let i = 0; i < labels.length; i++) {
        if (labels[i].htmlFor === el.id) {
          explicit = labels[i];
          break;
        }
      }
    }
    if (explicit)
      return { hasLabel: true, text: explicit.textContent || undefined };
  }
  const parentLabel = el.closest("label");
  if (parentLabel)
    return { hasLabel: true, text: parentLabel.textContent || undefined };
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) return { hasLabel: true, text: ariaLabel };
  const ariaLabelledBy = el.getAttribute("aria-labelledby");
  if (ariaLabelledBy) {
    const labelEl = document.getElementById(ariaLabelledBy);
    if (labelEl)
      return { hasLabel: true, text: labelEl.textContent || undefined };
  }
  const title = el.getAttribute("title");
  if (title) return { hasLabel: true, text: title };
  const placeholder = el.getAttribute("placeholder");
  if (placeholder) return { hasLabel: true, text: placeholder };
  return { hasLabel: false };
}

function detectAutofill(field: FormControlElement): string | undefined {
  const autocomplete = field.getAttribute("autocomplete");
  if (autocomplete && AUTOFILL_FIELDS.includes(autocomplete))
    return autocomplete;
  const nameAttr = (field as HTMLInputElement).name;
  const name = nameAttr ? nameAttr.toLowerCase() : "";
  const type = (field as HTMLInputElement).type?.toLowerCase() || "";
  if (type === "email" || name.includes("email")) return "email";
  if (type === "tel" || name.includes("phone") || name.includes("tel"))
    return "tel";
  if (name.includes("password")) return "current-password";
  if (name.includes("name")) return "name";
  if (name.includes("address")) return "street-address";
  if (name.includes("zip") || name.includes("postal")) return "postal-code";
  return undefined;
}

function analyzeFormFields(form: HTMLFormElement): FormField[] {
  const fields = Array.from(
    form.querySelectorAll<FormControlElement>(FORM_CONTROL_SELECTOR),
  );
  return fields.map((field) => {
    const inputEl = field as HTMLInputElement;
    const isValid = inputEl.checkValidity?.() ?? true;
    const validationMessage = inputEl.validationMessage || "";
    const labelInfo = getLabelInfo(field);
    const autofill = detectAutofill(field);
    return {
      element: field,
      selector: generateSelector(field as HTMLElement),
      name: (inputEl.name || inputEl.id || "").toString(),
      type: inputEl.type || field.tagName.toLowerCase(),
      value: (inputEl.value ?? "").toString(),
      isValid,
      validationMessage,
      isRequired: !!inputEl.required,
      hasLabel: labelInfo.hasLabel,
      labelText: labelInfo.text,
      hasError: !isValid || validationMessage !== "",
      autofill,
    };
  });
}

function checkAccessibilityIssues(
  form: HTMLFormElement,
  fields: FormField[],
): string[] {
  const issues: string[] = [];
  if (
    !form.getAttribute("aria-label") &&
    !form.getAttribute("aria-labelledby") &&
    !form.id
  ) {
    issues.push("Form lacks accessible name");
  }
  const unlabeled = fields.filter((f) => !f.hasLabel);
  if (unlabeled.length > 0)
    issues.push(unlabeled.length + " fields without proper labels");
  const fieldsWithErrors = fields.filter((f) => f.isRequired && !f.isValid);
  if (
    fieldsWithErrors.length > 0 &&
    !form.querySelector('[role="alert"], .error, [aria-live]')
  ) {
    issues.push("Form may lack error message announcement for screen readers");
  }
  return issues;
}

function analyzeForms(): FormInfo[] {
  const formElements = Array.from(document.querySelectorAll("form"));
  const forms: FormInfo[] = formElements.map((form, index) => {
    const fields = analyzeFormFields(form);
    return {
      element: form,
      selector: generateSelector(form),
      name: form.name || form.id || "Form " + (index + 1),
      action: form.action || window.location.href,
      method: form.method || "GET",
      fields,
      isValid: fields.every((f) => f.isValid),
      accessibilityIssues: checkAccessibilityIssues(form, fields),
    };
  });

  const orphanSelector = FORM_CONTROL_SELECTOR.split(", ")
    .map((sel) => `${sel}:not(form ${sel})`)
    .join(", ");
  const orphaned = Array.from(
    document.querySelectorAll<FormControlElement>(orphanSelector),
  );
  if (orphaned.length > 0) {
    const orphanFields: FormField[] = orphaned.map((el) => {
      const field = el as HTMLInputElement;
      const labelInfo = getLabelInfo(el);
      return {
        element: el,
        selector: generateSelector(el as HTMLElement),
        name: (field.name || field.id || "").toString(),
        type: field.type || el.tagName.toLowerCase(),
        value: (field.value ?? "").toString(),
        isValid: field.checkValidity?.() ?? true,
        validationMessage: field.validationMessage || "",
        isRequired: !!field.required,
        hasLabel: labelInfo.hasLabel,
        labelText: labelInfo.text,
        hasError: false,
        autofill: detectAutofill(el),
      };
    });
    forms.push({
      element: document.body,
      selector: "body",
      name: "Orphaned Fields (No Form)",
      action: "",
      method: "",
      fields: orphanFields,
      isValid: orphanFields.every((f) => f.isValid),
      accessibilityIssues: ["Fields exist outside of a form element"],
    });
  }
  return forms;
}

function createFieldOverlay(
  field: FormField,
  options: { showLabels: boolean; highlightRequired: boolean },
): HTMLDivElement | null {
  const rect = (field.element as HTMLElement).getBoundingClientRect();
  if (rect.bottom < 0 || rect.top > window.innerHeight || rect.width === 0)
    return null;

  let color = "#3b82f6";
  let label = "";
  if (field.hasError) {
    color = "#dc2626";
    label = field.validationMessage || "Invalid";
  } else if (options.showLabels && !field.hasLabel) {
    color = "#f59e0b";
    label = "No label";
  } else if (options.highlightRequired && field.isRequired) {
    color = "#7c3aed";
    label = "Required";
  }

  const overlay = document.createElement("div");
  overlay.style.cssText = `position:fixed;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:2147483645;border:2px solid ${color};border-radius:3px;background:${color}1a;`;

  if (label) {
    const badge = document.createElement("div");
    badge.style.cssText = `position:absolute;top:-12px;left:0;background:${color};color:white;font-size:10px;font-weight:bold;padding:2px 6px;border-radius:3px;white-space:nowrap;font-family:-apple-system,sans-serif;`;
    badge.textContent = label;
    overlay.appendChild(badge);
  }
  return overlay;
}

export const formDebugger: ToolDefinition = {
  id: "form-debugger",
  name: "Form Debugger",
  description: "Inspect form fields, validation, and submission behavior",
  category: "inspection",
  icon: "FileInput",
  configSchema: {
    showValidation: {
      type: "boolean",
      label: "Show Validation",
      default: true,
    },
    showConstraints: {
      type: "boolean",
      label: "Show Constraints",
      default: true,
    },
    showLabels: { type: "boolean", label: "Show Labels", default: true },
    showDefaultValues: {
      type: "boolean",
      label: "Show Default Values",
      default: false,
    },
    highlightRequired: {
      type: "boolean",
      label: "Highlight Required",
      default: true,
    },
  },
  run: (ctx, config) => {
    const showValidation = (config?.showValidation as boolean) ?? true;
    const showConstraints = (config?.showConstraints as boolean) ?? true;
    const showLabels = (config?.showLabels as boolean) ?? true;
    const showDefaultValues = (config?.showDefaultValues as boolean) ?? false;
    const highlightRequired = (config?.highlightRequired as boolean) ?? true;
    let forms: FormInfo[] = [];
    let highlightEnabled = true;
    const overlayEls: HTMLDivElement[] = [];
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const panelHost = document.createElement("div");
    panelHost.style.cssText =
      "position:fixed;top:20px;right:20px;width:550px;max-height:80vh;z-index:2147483646;";
    const shadow = panelHost.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
      .fdh-fg-panel{background:#0f172a;border-radius:12px;box-shadow:0 25px 50px -12px rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.1);overflow:hidden;display:flex;flex-direction:column;max-height:80vh;font-family:-apple-system,sans-serif;font-size:13px;color:#e2e8f0;}
      .fdh-fg-header{display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid #334155;background:#1e293b;}
      .fdh-fg-title{display:flex;align-items:center;gap:8px;font-weight:600;font-size:14px;}
      .fdh-fg-actions{display:flex;gap:4px;}
      .fdh-fg-actions button{background:transparent;border:none;color:#94a3b8;cursor:pointer;padding:4px 8px;border-radius:4px;font-size:14px;}
      .fdh-fg-actions button:hover{background:#334155;color:#f8fafc;}
      .fdh-fg-actions button.active{background:#4f46e5;color:white;}
      .fdh-fg-content{flex:1;overflow-y:auto;padding:12px;min-height:200px;}
      .fdh-fg-form-card{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155;margin-bottom:8px;}
      .fdh-fg-form-name{font-weight:600;color:#f8fafc;}
      .fdh-fg-form-meta{display:flex;gap:8px;font-size:11px;color:#64748b;margin-top:4px;}
      .fdh-fg-field{background:#1e293b;border-radius:8px;padding:12px;border:1px solid #334155;margin-bottom:8px;}
      .fdh-fg-field.error{border-color:#dc2626;}
      .fdh-fg-field.unlabeled{border-left:3px solid #f59e0b;}
      .fdh-fg-field-name{font-weight:600;color:#f8fafc;}
      .fdh-fg-field-type{background:#334155;padding:2px 6px;border-radius:4px;font-size:10px;text-transform:uppercase;}
      .fdh-fg-field-sel{font-family:monospace;font-size:11px;color:#64748b;margin-top:4px;}
      .fdh-fg-badge{padding:2px 6px;border-radius:4px;font-size:10px;}
      .fdh-fg-badge-req{background:#dc2626;color:white;}
      .fdh-fg-badge-autofill{background:#059669;color:white;}
      .fdh-fg-badge-warn{background:#f59e0b;color:#1e293b;}
      .fdh-fg-footer{display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-top:1px solid #334155;font-size:11px;color:#64748b;background:#1e293b;}
      .fdh-fg-empty{text-align:center;padding:40px;color:#64748b;}
      .fdh-fg-content::-webkit-scrollbar{width:8px;}
      .fdh-fg-content::-webkit-scrollbar-thumb{background:#334155;border-radius:4px;}
    `;
    shadow.appendChild(style);

    const panel = document.createElement("div");
    panel.className = "fdh-fg-panel";

    const header = document.createElement("div");
    header.className = "fdh-fg-header";
    const titleDiv = document.createElement("div");
    titleDiv.className = "fdh-fg-title";
    titleDiv.textContent = "📝 Form Debugger";
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "fdh-fg-actions";
    const btnRefresh = document.createElement("button");
    btnRefresh.dataset.action = "refresh";
    btnRefresh.textContent = "🔄";
    const btnToggle = document.createElement("button");
    btnToggle.dataset.action = "toggle";
    btnToggle.className = "active";
    btnToggle.textContent = "🔍";
    const btnClose = document.createElement("button");
    btnClose.dataset.action = "close";
    btnClose.textContent = "✕";
    actionsDiv.append(btnRefresh, btnToggle, btnClose);
    header.append(titleDiv, actionsDiv);

    const contentEl = document.createElement("div");
    contentEl.className = "fdh-fg-content";
    const emptyMsg = document.createElement("div");
    emptyMsg.className = "fdh-fg-empty";
    emptyMsg.textContent = "Scanning forms...";
    contentEl.appendChild(emptyMsg);

    const footer = document.createElement("div");
    footer.className = "fdh-fg-footer";
    const statsEl = document.createElement("span");
    statsEl.textContent = "0 forms";
    const statusEl = document.createElement("span");
    statusEl.textContent = "Ready";
    footer.append(statsEl, statusEl);

    panel.append(header, contentEl, footer);
    shadow.appendChild(panel);
    document.body.appendChild(panelHost);

    function updateOverlays(): void {
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      if (!highlightEnabled) return;
      for (const form of forms) {
        for (const field of form.fields) {
          if (!showValidation && field.hasError) continue;
          const overlay = createFieldOverlay(field, {
            showLabels,
            highlightRequired,
          });
          if (overlay) {
            addOverlayElement(overlay);
            overlayEls.push(overlay);
          }
        }
      }
    }

    function renderList(): void {
      while (contentEl.firstChild) contentEl.removeChild(contentEl.firstChild);
      if (forms.length === 0) {
        const msg = document.createElement("div");
        msg.className = "fdh-fg-empty";
        msg.textContent = "No forms found";
        contentEl.appendChild(msg);
        statsEl.textContent = "0 forms";
        return;
      }

      const totalFields = forms.reduce((s, f) => s + f.fields.length, 0);
      const validFields = forms.reduce(
        (s, f) => s + f.fields.filter((ff) => ff.isValid).length,
        0,
      );
      statsEl.textContent = validFields + "/" + totalFields + " valid";

      for (const form of forms) {
        const card = document.createElement("div");
        card.className = "fdh-fg-form-card";

        const nameEl = document.createElement("div");
        nameEl.className = "fdh-fg-form-name";
        nameEl.textContent = form.name;
        card.appendChild(nameEl);

        const meta = document.createElement("div");
        meta.className = "fdh-fg-form-meta";

        const methodSpan = document.createElement("span");
        methodSpan.style.cssText =
          "background:#334155;padding:2px 6px;border-radius:4px;font-size:10px;text-transform:uppercase;";
        methodSpan.textContent = form.method || "GET";
        meta.appendChild(methodSpan);

        const fieldsSpan = document.createElement("span");
        fieldsSpan.textContent = form.fields.length + " fields";
        meta.appendChild(fieldsSpan);

        const reqCount = form.fields.filter((f) => f.isRequired).length;
        if (reqCount > 0) {
          const reqSpan = document.createElement("span");
          reqSpan.textContent = reqCount + " required";
          meta.appendChild(reqSpan);
        }
        if (form.accessibilityIssues.length > 0) {
          const warn = document.createElement("span");
          warn.className = "fdh-fg-badge fdh-fg-badge-warn";
          warn.textContent = form.accessibilityIssues.length + " issues";
          meta.appendChild(warn);
        }
        card.appendChild(meta);

        for (const field of form.fields) {
          const fieldEl = document.createElement("div");
          fieldEl.className =
            "fdh-fg-field" +
            (field.hasError ? " error" : "") +
            (!field.hasLabel ? " unlabeled" : "");

          const row = document.createElement("div");
          row.style.cssText =
            "display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:4px;";
          const fieldName = document.createElement("span");
          fieldName.className = "fdh-fg-field-name";
          fieldName.textContent = field.name || "unnamed";
          row.appendChild(fieldName);

          const fieldType = document.createElement("span");
          fieldType.className = "fdh-fg-field-type";
          fieldType.textContent = field.type;
          row.appendChild(fieldType);

          if (field.isRequired && highlightRequired) {
            const reqBadge = document.createElement("span");
            reqBadge.className = "fdh-fg-badge fdh-fg-badge-req";
            reqBadge.textContent = "Required";
            row.appendChild(reqBadge);
          }
          if (field.autofill) {
            const afBadge = document.createElement("span");
            afBadge.className = "fdh-fg-badge fdh-fg-badge-autofill";
            afBadge.textContent = field.autofill;
            row.appendChild(afBadge);
          }
          fieldEl.appendChild(row);

          if (field.validationMessage) {
            const msg = document.createElement("div");
            msg.style.cssText = "color:#f87171;font-size:12px;margin-top:4px;";
            msg.textContent = field.validationMessage;
            fieldEl.appendChild(msg);
          }

          if (showConstraints) {
            const inputEl = field.element as HTMLInputElement;
            const constraintParts: string[] = [];
            for (const c of [
              "min",
              "max",
              "minlength",
              "maxlength",
              "pattern",
              "step",
            ] as const) {
              const v = (inputEl as unknown as Record<string, unknown>)[c];
              if (
                v !== null &&
                v !== undefined &&
                v !== "" &&
                !(typeof v === "number" && isNaN(v))
              ) {
                constraintParts.push(c + '="' + String(v) + '"');
              }
            }
            if (constraintParts.length > 0) {
              const cEl = document.createElement("div");
              cEl.style.cssText =
                "color:#94a3b8;font-size:11px;margin-top:2px;font-family:monospace;";
              cEl.textContent = constraintParts.join(" ");
              fieldEl.appendChild(cEl);
            }
          }

          if (showDefaultValues) {
            const inputEl = field.element as HTMLInputElement;
            const defaultVal =
              inputEl.defaultValue ?? inputEl.getAttribute("value");
            if (
              defaultVal !== null &&
              defaultVal !== undefined &&
              defaultVal !== ""
            ) {
              const dEl = document.createElement("div");
              dEl.style.cssText =
                "color:#a78bfa;font-size:11px;margin-top:2px;font-family:monospace;";
              dEl.textContent = 'default: "' + String(defaultVal) + '"';
              fieldEl.appendChild(dEl);
            }
          }

          const sel = document.createElement("div");
          sel.className = "fdh-fg-field-sel";
          sel.textContent = field.selector;
          fieldEl.appendChild(sel);

          card.appendChild(fieldEl);
        }
        contentEl.appendChild(card);
      }
    }

    function refresh(): void {
      forms = analyzeForms();
      updateOverlays();
      renderList();
    }

    function handleInput(e: Event): void {
      const target = e.target as HTMLInputElement;
      if (!target) return;
      for (const form of forms) {
        const field = form.fields.find((f) => f.element === target);
        if (field) {
          field.isValid = target.checkValidity?.() ?? true;
          field.validationMessage = target.validationMessage || "";
          field.hasError = !field.isValid || field.validationMessage !== "";
          field.value = target.value;
        }
      }
      updateOverlays();
    }

    document.addEventListener("input", handleInput, true);

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refresh, 100);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["name", "type", "required", "disabled"],
    });

    panel.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (action === "close") cleanup();
      else if (action === "refresh") {
        refresh();
        statusEl.textContent = "Refreshed";
        setTimeout(() => {
          statusEl.textContent = "Ready";
        }, 2000);
      } else if (action === "toggle") {
        highlightEnabled = !highlightEnabled;
        target.classList.toggle("active", highlightEnabled);
        updateOverlays();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanup();
    };
    document.addEventListener("keydown", handleKeyDown, true);

    refresh();

    function cleanup() {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
      document.removeEventListener("input", handleInput, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      for (const el of overlayEls) removeOverlayElement(el);
      overlayEls.length = 0;
      panelHost.remove();
    }

    ctx.onInvalidated(cleanup);
    return cleanup;
  },
};
