export interface CapturedRequest {
  id: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
  responseBodyB64: string | null;
  statusCode: number;
  statusText: string;
  contentType: string;
  timing: {
    start: number;
    end: number;
    duration: number;
    dns?: number;
    tcp?: number;
    ttfb?: number;
    download?: number;
  };
  resourceType:
    | "xhr"
    | "fetch"
    | "script"
    | "stylesheet"
    | "image"
    | "font"
    | "document"
    | "other";
  size: number;
  timestamp: number;
}

export interface RequestFilter {
  method?: string;
  url?: string;
  status?: number;
  statusClass?: "2xx" | "3xx" | "4xx" | "5xx";
  resourceType?: string;
  resourceTypes?: string[];
  excludeResourceTypes?: string[];
  type?: string;
}

function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function truncateBody(body: string | null, maxSize: number): string | null {
  if (body === null) return null;
  if (body.length <= maxSize) return body;
  return body.slice(0, maxSize) + `\n... [truncated at ${maxSize} bytes]`;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, Math.min(i + chunk, bytes.length));
    binary += String.fromCharCode.apply(null, slice as unknown as number[]);
  }
  return btoa(binary);
}

function isBinaryContentType(contentType: string): boolean {
  const ct = contentType.toLowerCase();
  return (
    ct.startsWith("image/") ||
    ct.startsWith("audio/") ||
    ct.startsWith("video/") ||
    ct.includes("font") ||
    ct.includes("octet-stream") ||
    ct.includes("application/pdf") ||
    ct.includes("application/zip")
  );
}

function classifyResourceType(
  contentType: string,
  url: string,
): CapturedRequest["resourceType"] {
  const ct = contentType.toLowerCase();
  const u = url.toLowerCase();

  if (
    ct.includes("javascript") ||
    ct.includes("ecmascript") ||
    u.match(/\.(js|mjs|cjs)(\?|$)/)
  )
    return "script";
  if (ct.includes("css") || u.match(/\.css(\?|$)/)) return "stylesheet";
  if (
    ct.includes("image/") ||
    u.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|avif)(\?|$)/)
  )
    return "image";
  if (ct.includes("font") || u.match(/\.(woff2?|ttf|otf|eot)(\?|$)/))
    return "font";
  if (ct.includes("html") || u.match(/\.(html|htm)(\?|$)/)) return "document";

  return "other";
}

export class NetworkCapture {
  private requests: CapturedRequest[] = [];
  private isCapturing = false;
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalXHRSend: typeof XMLHttpRequest.prototype.send | null = null;
  private originalXHRSetRequestHeader:
    | typeof XMLHttpRequest.prototype.setRequestHeader
    | null = null;
  private maxBodySize = 100 * 1024;
  private captureXHR = true;
  private captureFetch = true;
  private captureBinary = false;

  constructor(options?: {
    maxBodySize?: number;
    captureXHR?: boolean;
    captureFetch?: boolean;
    captureBinary?: boolean;
  }) {
    if (options?.maxBodySize !== undefined)
      this.maxBodySize = options.maxBodySize;
    if (options?.captureXHR !== undefined) this.captureXHR = options.captureXHR;
    if (options?.captureFetch !== undefined)
      this.captureFetch = options.captureFetch;
    if (options?.captureBinary !== undefined)
      this.captureBinary = options.captureBinary;
  }

  start(): void {
    if (this.isCapturing) return;
    this.isCapturing = true;

    if (this.captureFetch) {
      this.interceptFetch();
    }

    if (this.captureXHR) {
      this.interceptXHR();
    }
  }

  stop(): void {
    if (!this.isCapturing) return;
    this.isCapturing = false;

    if (this.originalFetch !== null) {
      window.fetch = this.originalFetch;
      this.originalFetch = null;
    }

    if (this.originalXHROpen !== null) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
      this.originalXHROpen = null;
    }

    if (this.originalXHRSend !== null) {
      XMLHttpRequest.prototype.send = this.originalXHRSend;
      this.originalXHRSend = null;
    }

    if (this.originalXHRSetRequestHeader !== null) {
      XMLHttpRequest.prototype.setRequestHeader =
        this.originalXHRSetRequestHeader;
      this.originalXHRSetRequestHeader = null;
    }
  }

  getRequests(filter?: RequestFilter): CapturedRequest[] {
    if (!filter) return [...this.requests];

    return this.requests.filter((req) => {
      if (filter.method && req.method !== filter.method.toUpperCase())
        return false;
      if (
        filter.url &&
        !req.url.toLowerCase().includes(filter.url.toLowerCase())
      )
        return false;
      if (typeof filter.status === "number" && req.statusCode !== filter.status)
        return false;
      if (filter.statusClass) {
        const code = req.statusCode;
        const cls =
          code >= 200 && code < 300
            ? "2xx"
            : code >= 300 && code < 400
              ? "3xx"
              : code >= 400 && code < 500
                ? "4xx"
                : code >= 500
                  ? "5xx"
                  : null;
        if (cls !== filter.statusClass) return false;
      }
      const typeFilter = filter.type ?? filter.resourceType;
      if (typeFilter && req.resourceType !== typeFilter) return false;
      if (
        filter.resourceTypes &&
        !filter.resourceTypes.includes(req.resourceType)
      )
        return false;
      if (
        filter.excludeResourceTypes &&
        filter.excludeResourceTypes.includes(req.resourceType)
      )
        return false;
      return true;
    });
  }

  clear(): void {
    this.requests = [];
  }

  isRunning(): boolean {
    return this.isCapturing;
  }

  private addRequest(req: CapturedRequest): void {
    this.requests.push(req);
  }

  private interceptFetch(): void {
    this.originalFetch = window.fetch;
    const origFetch = this.originalFetch;
    const self = this;
    const maxSize = this.maxBodySize;
    const captureBinary = this.captureBinary;

    window.fetch = function (
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> {
      const startTime = performance.now();
      const timestamp = Date.now();

      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : String(input);

      const method =
        init?.method ||
        (input instanceof Request ? input.method : "GET") ||
        "GET";

      let requestBody: string | null = null;
      if (init?.body) {
        if (typeof init.body === "string") {
          requestBody = truncateBody(init.body, maxSize);
        } else if (init.body instanceof URLSearchParams) {
          requestBody = truncateBody(init.body.toString(), maxSize);
        } else if (init.body instanceof FormData) {
          requestBody = "[FormData]";
        } else if (init.body instanceof ArrayBuffer) {
          requestBody = `[ArrayBuffer: ${init.body.byteLength} bytes]`;
        } else if (init.body instanceof Blob) {
          requestBody = `[Blob: ${init.body.size} bytes]`;
        }
      } else if (input instanceof Request) {
        // The Request body may already be consumed by app code. Clone it
        // before reading so we don't break the downstream consumer.
        try {
          const cloned = input.clone();
          // body is a ReadableStream; reading it is async and would race with
          // the consumer, so we capture a marker instead of awaiting.
          // For GET/HEAD there is no body to capture anyway.
          if (
            method.toUpperCase() !== "GET" &&
            method.toUpperCase() !== "HEAD"
          ) {
            requestBody = "[Request body: see Headers/body stream]";
          }
          void cloned;
        } catch {
          // clone can throw if body is disturbed; leave requestBody null
        }
      }

      const requestHeaders: Record<string, string> = {};
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            requestHeaders[key] = value;
          });
        } else if (Array.isArray(init.headers)) {
          for (const [key, value] of init.headers) {
            requestHeaders[key] = value;
          }
        } else {
          for (const [key, value] of Object.entries(init.headers)) {
            requestHeaders[key] = value;
          }
        }
      }

      return origFetch(input, init)
        .then(async (response) => {
          const endTime = performance.now();

          const responseHeaders: Record<string, string> = {};
          response.headers.forEach((value, key) => {
            responseHeaders[key] = value;
          });

          const contentType = response.headers.get("content-type") || "";

          let responseBody: string | null = null;
          let responseBodyB64: string | null = null;
          let size = 0;

          const cloned = response.clone();
          try {
            if (captureBinary && isBinaryContentType(contentType)) {
              const buf = await cloned.arrayBuffer();
              size = buf.byteLength;
              if (size <= maxSize) {
                responseBodyB64 = arrayBufferToBase64(buf);
                responseBody = `[binary: ${size} bytes, ${contentType}]`;
              } else {
                responseBody = `[Response body: ${size} bytes, truncated at ${maxSize} bytes]`;
              }
            } else {
              const text = await cloned.text();
              size = text.length;
              if (size <= maxSize) {
                responseBody = truncateBody(text, maxSize);
              } else {
                responseBody = `[Response body: ${size} bytes, truncated at ${maxSize} bytes]`;
              }
            }
          } catch {
            responseBody = null;
            size = 0;
          }

          // Try to enrich timing from PerformanceResourceTiming if available.
          const timing = await resolveResourceTiming(url, startTime, endTime);

          const captured: CapturedRequest = {
            id: generateId(),
            url,
            method: method.toUpperCase(),
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody,
            responseBodyB64,
            statusCode: response.status,
            statusText: response.statusText,
            contentType,
            timing,
            resourceType: classifyResourceType(contentType, url),
            size,
            timestamp,
          };

          self.addRequest(captured);
          return response;
        })
        .catch((err) => {
          const endTime = performance.now();
          const captured: CapturedRequest = {
            id: generateId(),
            url,
            method: method.toUpperCase(),
            requestHeaders,
            requestBody,
            responseHeaders: {},
            responseBody: null,
            responseBodyB64: null,
            statusCode: 0,
            statusText: "Network Error",
            contentType: "",
            timing: {
              start: startTime,
              end: endTime,
              duration: endTime - startTime,
            },
            resourceType: "fetch",
            size: 0,
            timestamp,
          };
          self.addRequest(captured);
          throw err;
        });
    };
  }

  private interceptXHR(): void {
    const self = this;
    const maxSize = this.maxBodySize;

    // IMPORTANT: store raw unbound references. The previous implementation
    // stored `.bind(XMLHttpRequest.prototype)` which produces a NEW function
    // object on every start(), breaking identity for any caller that captured
    // the original reference (e.g. `const orig = XMLHttpRequest.prototype.open`).
    this.originalXHRSetRequestHeader =
      XMLHttpRequest.prototype.setRequestHeader;
    const origSetHeader = this.originalXHRSetRequestHeader;
    const captureBinary = this.captureBinary;

    this.originalXHROpen = XMLHttpRequest.prototype.open;
    const origOpen = this.originalXHROpen;

    this.originalXHRSend = XMLHttpRequest.prototype.send;
    const origSend = this.originalXHRSend;

    XMLHttpRequest.prototype.setRequestHeader = function (
      this: XMLHttpRequest,
      name: string,
      value: string,
    ): void {
      if (!(this as any).__fdh_headers) {
        (this as any).__fdh_headers = {};
      }
      (this as any).__fdh_headers[name] = value;
      return origSetHeader!.call(this, name, value);
    };

    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      (this as any).__fdh_method = method;
      (this as any).__fdh_url = String(url);
      (this as any).__fdh_headers = (this as any).__fdh_headers || {};
      return origOpen!.call(
        this,
        method,
        url,
        async !== false,
        username ?? null,
        password ?? null,
      );
    };

    XMLHttpRequest.prototype.send = function (
      this: XMLHttpRequest,
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const startTime = performance.now();
      const timestamp = Date.now();
      const xhr = this as any;
      const xhrUrl: string = xhr.__fdh_url || "";

      let requestBody: string | null = null;
      if (body !== null && body !== undefined) {
        if (typeof body === "string") {
          requestBody = truncateBody(body, maxSize);
        } else if (body instanceof URLSearchParams) {
          requestBody = truncateBody(body.toString(), maxSize);
        } else if (body instanceof FormData) {
          requestBody = "[FormData]";
        } else if (body instanceof ArrayBuffer) {
          requestBody = `[ArrayBuffer: ${body.byteLength} bytes]`;
        } else if (body instanceof Blob) {
          requestBody = `[Blob: ${body.size} bytes]`;
        } else if (body instanceof Document) {
          requestBody = "[Document]";
        }
      }

      xhr.addEventListener("load", async () => {
        const endTime = performance.now();

        const responseHeaders: Record<string, string> = {};
        const rawHeaders = xhr.getAllResponseHeaders();
        if (rawHeaders) {
          const lines = rawHeaders.trim().split(/\r?\n/);
          for (const line of lines) {
            const idx = line.indexOf(":");
            if (idx > 0) {
              const key = line.slice(0, idx).trim().toLowerCase();
              const value = line.slice(idx + 1).trim();
              responseHeaders[key] = value;
            }
          }
        }

        const contentType = responseHeaders["content-type"] || "";
        let responseBody: string | null = null;
        let responseBodyB64: string | null = null;
        try {
          if (captureBinary && isBinaryContentType(contentType)) {
            if (xhr.responseType === "arraybuffer" && xhr.response) {
              const buf = xhr.response as ArrayBuffer;
              const size = buf.byteLength;
              if (size <= maxSize) {
                responseBodyB64 = arrayBufferToBase64(buf);
                responseBody = `[binary: ${size} bytes, ${contentType}]`;
              } else {
                responseBody = `[Response body: ${size} bytes, truncated at ${maxSize} bytes]`;
              }
            } else if (xhr.responseType === "blob" && xhr.response) {
              const blob = xhr.response as Blob;
              const buf = await blob.arrayBuffer();
              const size = buf.byteLength;
              if (size <= maxSize) {
                responseBodyB64 = arrayBufferToBase64(buf);
                responseBody = `[binary: ${size} bytes, ${contentType}]`;
              } else {
                responseBody = `[Response body: ${size} bytes, truncated at ${maxSize} bytes]`;
              }
            } else {
              responseBody = "[binary: not captured]";
            }
          } else {
            const raw = xhr.responseText;
            responseBody = truncateBody(raw, maxSize);
          }
        } catch {
          responseBody = null;
        }

        const size =
          parseInt(responseHeaders["content-length"] || "0", 10) ||
          (responseBodyB64
            ? Math.floor((responseBodyB64.length * 3) / 4)
            : (responseBody?.length ?? 0));

        // XHR can't expose PerformanceResourceTiming breakdown reliably;
        // capture what we have. resolveResourceTiming is a no-op for XHR
        // (no reliable URL match across CORS), but we still compute base timing.
        const timing = {
          start: startTime,
          end: endTime,
          duration: endTime - startTime,
        };

        const captured: CapturedRequest = {
          id: generateId(),
          url: xhrUrl,
          method: (xhr.__fdh_method || "GET").toUpperCase(),
          requestHeaders: xhr.__fdh_headers || {},
          requestBody,
          responseHeaders,
          responseBody,
          responseBodyB64,
          statusCode: xhr.status,
          statusText: xhr.statusText,
          contentType,
          timing,
          // XHR-originated requests are always typed "xhr" regardless of the
          // response content-type — the transport is what DevTools surfaces
          // here, not the payload kind. Running them through the content-type
          // classifier mislabels JSON/HTML API responses as "other".
          resourceType: "xhr",
          size,
          timestamp,
        };

        self.addRequest(captured);
      });

      xhr.addEventListener("error", () => {
        const endTime = performance.now();
        const captured: CapturedRequest = {
          id: generateId(),
          url: xhrUrl,
          method: (xhr.__fdh_method || "GET").toUpperCase(),
          requestHeaders: xhr.__fdh_headers || {},
          requestBody,
          responseHeaders: {},
          responseBody: null,
          responseBodyB64: null,
          statusCode: 0,
          statusText: "Network Error",
          contentType: "",
          timing: {
            start: startTime,
            end: endTime,
            duration: endTime - startTime,
          },
          resourceType: "xhr",
          size: 0,
          timestamp,
        };
        self.addRequest(captured);
      });

      return origSend!.call(
        this,
        body as XMLHttpRequestBodyInit | null | undefined,
      );
    };
  }
}

/**
 * Look up the most recent PerformanceResourceTiming entry for a URL and
 * return its DNS/TCP/TTFB/download breakdown. If unavailable (cross-origin
 * without Timing-Allow, or observer not supported), returns the start/end
 * pair supplied by the caller.
 */
async function resolveResourceTiming(
  url: string,
  startTime: number,
  endTime: number,
): Promise<{
  start: number;
  end: number;
  duration: number;
  dns?: number;
  tcp?: number;
  ttfb?: number;
  download?: number;
}> {
  const base = {
    start: startTime,
    end: endTime,
    duration: endTime - startTime,
  };
  try {
    // Yield to the microtask queue so the ResourceTiming entry is registered.
    await Promise.resolve();
    const entries = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    // Find the most recent entry whose name matches the URL and which
    // started within a small window of startTime.
    for (let i = entries.length - 1; i >= 0; i--) {
      const e = entries[i];
      if (e.name !== url) continue;
      if (Math.abs(e.fetchStart - startTime) > 5000) continue;
      return {
        start: e.fetchStart || startTime,
        end: e.responseEnd || endTime,
        duration: e.duration || endTime - startTime,
        dns: e.domainLookupEnd - e.domainLookupStart || undefined,
        tcp: e.connectEnd - e.connectStart || undefined,
        ttfb: e.responseStart - e.requestStart || undefined,
        download: e.responseEnd - e.responseStart || undefined,
      };
    }
  } catch {
    // Performance API unsupported or entries not available.
  }
  return base;
}
