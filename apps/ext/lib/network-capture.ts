export interface CapturedRequest {
  id: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseHeaders: Record<string, string>;
  responseBody: string | null;
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

function generateId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function truncateBody(body: string | null, maxSize: number): string | null {
  if (body === null) return null;
  if (body.length <= maxSize) return body;
  return body.slice(0, maxSize) + `\n... [truncated at ${maxSize} bytes]`;
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

  constructor(options?: {
    maxBodySize?: number;
    captureXHR?: boolean;
    captureFetch?: boolean;
  }) {
    if (options?.maxBodySize !== undefined)
      this.maxBodySize = options.maxBodySize;
    if (options?.captureXHR !== undefined) this.captureXHR = options.captureXHR;
    if (options?.captureFetch !== undefined)
      this.captureFetch = options.captureFetch;
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

  getRequests(filter?: { type?: string; url?: string }): CapturedRequest[] {
    if (!filter) return [...this.requests];

    return this.requests.filter((req) => {
      if (filter.type && req.resourceType !== filter.type) return false;
      if (
        filter.url &&
        !req.url.toLowerCase().includes(filter.url.toLowerCase())
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
      } else if (input instanceof Request && input.body) {
        requestBody = "[Request body: unreadable without cloning]";
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
          let size = 0;

          const cloned = response.clone();
          try {
            const buf = await cloned.arrayBuffer();
            size = buf.byteLength;
          } catch {
            size = 0;
          }

          const cloned2 = response.clone();
          try {
            const text = await cloned2.text();
            if (size <= maxSize) {
              responseBody = truncateBody(text, maxSize);
            } else {
              responseBody = `[Response body: ${size} bytes, truncated at ${maxSize} bytes]`;
            }
          } catch {
            responseBody =
              size > 0
                ? `[Response body: ${size} bytes, truncated at ${maxSize} bytes]`
                : null;
          }

          const captured: CapturedRequest = {
            id: generateId(),
            url,
            method: method.toUpperCase(),
            requestHeaders,
            requestBody,
            responseHeaders,
            responseBody,
            statusCode: response.status,
            statusText: response.statusText,
            contentType,
            timing: {
              start: startTime,
              end: endTime,
              duration: endTime - startTime,
            },
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

    this.originalXHRSetRequestHeader =
      XMLHttpRequest.prototype.setRequestHeader.bind(XMLHttpRequest.prototype);
    const origSetHeader = this.originalXHRSetRequestHeader;

    this.originalXHROpen = XMLHttpRequest.prototype.open.bind(
      XMLHttpRequest.prototype,
    );
    const origOpen = this.originalXHROpen;

    this.originalXHRSend = XMLHttpRequest.prototype.send.bind(
      XMLHttpRequest.prototype,
    );
    const origSend = this.originalXHRSend;

    XMLHttpRequest.prototype.setRequestHeader = function (
      name: string,
      value: string,
    ): void {
      if (!(this as any).__fdh_headers) {
        (this as any).__fdh_headers = {};
      }
      (this as any).__fdh_headers[name] = value;
      return origSetHeader.call(this, name, value);
    };

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null,
    ): void {
      (this as any).__fdh_method = method;
      (this as any).__fdh_url = String(url);
      (this as any).__fdh_headers = (this as any).__fdh_headers || {};
      return origOpen.call(
        this,
        method,
        url,
        async !== false,
        username ?? null,
        password ?? null,
      );
    };

    XMLHttpRequest.prototype.send = function (
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const startTime = performance.now();
      const timestamp = Date.now();
      const xhr = this as any;

      let requestBody: string | null = null;
      if (body !== null && body !== undefined) {
        if (typeof body === "string") {
          requestBody = truncateBody(body, maxSize);
        } else if (body instanceof URLSearchParams) {
          requestBody = truncateBody(body.toString(), maxSize);
        } else if (body instanceof FormData) {
          requestBody = "[FormData]";
        } else if (body instanceof ArrayBuffer) {
          requestBody = `[ArrayBuffer: body.byteLength bytes]`;
        } else if (body instanceof Blob) {
          requestBody = `[Blob: ${body.size} bytes]`;
        } else if (body instanceof Document) {
          requestBody = "[Document]";
        }
      }

      xhr.addEventListener("load", () => {
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
        try {
          const raw = xhr.responseText;
          responseBody = truncateBody(raw, maxSize);
        } catch {
          responseBody = null;
        }

        const size =
          parseInt(responseHeaders["content-length"] || "0", 10) ||
          (responseBody?.length ?? 0);

        const captured: CapturedRequest = {
          id: generateId(),
          url: xhr.__fdh_url || "",
          method: (xhr.__fdh_method || "GET").toUpperCase(),
          requestHeaders: xhr.__fdh_headers || {},
          requestBody,
          responseHeaders,
          responseBody,
          statusCode: xhr.status,
          statusText: xhr.statusText,
          contentType,
          timing: {
            start: startTime,
            end: endTime,
            duration: endTime - startTime,
          },
          resourceType: classifyResourceType(contentType, xhr.__fdh_url || ""),
          size,
          timestamp,
        };

        self.addRequest(captured);
      });

      xhr.addEventListener("error", () => {
        const endTime = performance.now();
        const captured: CapturedRequest = {
          id: generateId(),
          url: xhr.__fdh_url || "",
          method: (xhr.__fdh_method || "GET").toUpperCase(),
          requestHeaders: xhr.__fdh_headers || {},
          requestBody,
          responseHeaders: {},
          responseBody: null,
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

      return origSend.call(
        this,
        body as XMLHttpRequestBodyInit | null | undefined,
      );
    };
  }
}
