import { describe, beforeEach, vi, it, expect } from "vitest";
import { sessionReplay } from "@/tools/utilities/session-replay";
import { runStandardToolTests } from "../../helpers";

describe("sessionReplay", () => {
  beforeEach(() => {
    document.body.textContent = "";
    vi.clearAllMocks();
  });

  runStandardToolTests(sessionReplay, {
    id: "session-replay",
    name: "Session Replay",
    category: "utility",
    icon: "Video",
  });

  it("exposes record / thumbnail configs", () => {
    const schema = sessionReplay.configSchema;
    expect(schema.recordTools).toBeDefined();
    expect(schema.recordElementSelection).toBeDefined();
    expect(schema.recordAIMessages).toBeDefined();
    expect(schema.maxThumbnailSize).toBeDefined();
  });
});
