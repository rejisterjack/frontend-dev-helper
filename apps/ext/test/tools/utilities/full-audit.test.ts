import { describe, beforeEach, vi, it, expect } from "vitest";
import { fullAudit } from "@/tools/utilities/full-audit";
import { runStandardToolTests } from "../../helpers";

describe("fullAudit", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(fullAudit, {
    id: "full-audit",
    name: "Full Audit",
    category: "utility",
    icon: "clipboard-check",
  });
});
