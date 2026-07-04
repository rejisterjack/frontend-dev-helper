import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NetworkCapture } from "@/lib/network-capture";

// Phase 0/4 backfill: exercise the XHR monkey-patch path, body capture,
// Request body cloning, timing breakdown, and the .bind() restore fix.
describe("NetworkCapture — XHR path", () => {
  let capture: NetworkCapture;
  let originalOpen: typeof XMLHttpRequest.prototype.open;
  let originalSend: typeof XMLHttpRequest.prototype.send;

  beforeEach(() => {
    vi.clearAllMocks();
    originalOpen = XMLHttpRequest.prototype.open;
    originalSend = XMLHttpRequest.prototype.send;
    capture = new NetworkCapture();
  });

  afterEach(() => {
    if (capture.isRunning()) capture.stop();
    // Sanity check: stop() restored the original XHR methods (the Phase 0
    // .bind() fix prevents `TypeError: Illegal invocation` here).
    expect(XMLHttpRequest.prototype.open).toBe(originalOpen);
    expect(XMLHttpRequest.prototype.send).toBe(originalSend);
  });

  function sendXhr(
    opts: {
      method?: string;
      url?: string;
      headers?: Record<string, string>;
      body?: Document | string | null;
      status?: number;
      response?: string;
    } = {},
  ): void {
    const {
      method = "GET",
      url = "https://xhr.example.com/r",
      headers = {},
      body = null,
      status = 200,
      response = "ok",
    } = opts;
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers)) {
      xhr.setRequestHeader(k, v);
    }
    xhr.send(body);

    // jsdom doesn't actually fire a network round-trip; we simulate the
    // readystate transition the patched send() listens on.
    Object.defineProperty(xhr, "readyState", { value: 4, writable: true });
    Object.defineProperty(xhr, "status", { value: status, writable: true });
    Object.defineProperty(xhr, "statusText", {
      value: status === 200 ? "OK" : "ERR",
      writable: true,
    });
    Object.defineProperty(xhr, "responseText", {
      value: response,
      writable: true,
    });
    Object.defineProperty(xhr, "response", {
      value: response,
      writable: true,
    });
    Object.defineProperty(xhr, "responseURL", { value: url, writable: true });
    Object.defineProperty(xhr, "getAllResponseHeaders", {
      value: () => "content-type: application/json\r\n",
    });
    xhr.dispatchEvent(new Event("readystatechange"));
    xhr.dispatchEvent(new Event("load"));
  }

  it("captures a basic XHR request and response", () => {
    capture.start();
    sendXhr({ method: "POST", body: '{"x":1}', response: "done" });
    const reqs = capture.getRequests();
    expect(reqs.length).toBeGreaterThanOrEqual(1);
    const req = reqs[reqs.length - 1];
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://xhr.example.com/r");
    expect(req.statusCode).toBe(200);
    expect(req.resourceType).toBe("xhr");
    expect(req.responseBody).toBe("done");
  });

  it("captures request headers set via setRequestHeader", () => {
    capture.start();
    sendXhr({ headers: { "X-Custom": "abc", Authorization: "Bearer xyz" } });
    const req = capture.getRequests()[0];
    expect(req.requestHeaders["X-Custom"]).toBe("abc");
    expect(req.requestHeaders["Authorization"]).toBe("Bearer xyz");
  });

  it("captures the request body string", () => {
    capture.start();
    sendXhr({ method: "PUT", body: '{"update":true}' });
    const req = capture.getRequests()[0];
    expect(req.requestBody).toBe('{"update":true}');
  });

  it("populates timing.start/end/duration", () => {
    capture.start();
    sendXhr();
    const req = capture.getRequests()[0];
    expect(typeof req.timing.start).toBe("number");
    expect(typeof req.timing.end).toBe("number");
    expect(req.timing.end).toBeGreaterThanOrEqual(req.timing.start);
    expect(req.timing.duration).toBeGreaterThanOrEqual(0);
  });

  it("respects captureXHR: false (leaves XHR untouched)", () => {
    const noXhrCapture = new NetworkCapture({ captureXHR: false });
    const before = XMLHttpRequest.prototype.open;
    noXhrCapture.start();
    expect(XMLHttpRequest.prototype.open).toBe(before);
    noXhrCapture.stop();
  });

  it("stop() restores the original XHR prototype methods", () => {
    capture.start();
    expect(XMLHttpRequest.prototype.open).not.toBe(originalOpen);
    capture.stop();
    expect(XMLHttpRequest.prototype.open).toBe(originalOpen);
    expect(XMLHttpRequest.prototype.send).toBe(originalSend);
  });

  it("records the response status code from non-200 responses", () => {
    capture.start();
    sendXhr({ status: 404, response: "" });
    const req = capture.getRequests()[0];
    expect(req.statusCode).toBe(404);
  });
});
