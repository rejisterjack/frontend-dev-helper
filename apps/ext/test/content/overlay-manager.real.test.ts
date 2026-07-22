import { describe, it, expect, beforeEach } from "vitest";
import {
  addOverlayElement,
  destroyOverlayContainer,
} from "../../content/overlay-manager";

describe("overlay-manager (real implementation)", () => {
  beforeEach(() => {
    // eslint-disable-next-line no-restricted-syntax -- test reset of document shell
    document.documentElement.innerHTML = "";
    document.body.textContent = "";
    destroyOverlayContainer();
  });

  it("defaults pointer-events to none when unset", () => {
    const el = document.createElement("div");
    expect(el.style.pointerEvents).toBe("");

    addOverlayElement(el);

    expect(el.style.pointerEvents).toBe("none");
  });

  it("preserves caller-set pointer-events:auto", () => {
    const el = document.createElement("div");
    el.style.pointerEvents = "auto";

    addOverlayElement(el);

    expect(el.style.pointerEvents).toBe("auto");
  });

  it("preserves pointer-events:auto set via cssText", () => {
    const el = document.createElement("div");
    el.style.cssText = "pointer-events: auto; position: fixed;";

    addOverlayElement(el);

    expect(el.style.pointerEvents).toBe("auto");
  });
});
