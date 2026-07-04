import { describe, expect, it } from "vitest";
import {
  exportAsCurl,
  exportAsFetch,
  exportAsHTML,
  exportAsJSON,
  exportAsJUnit,
  exportAsMarkdown,
  exportAsPostmanCollection,
  exportAsSARIF,
  type AuditResult,
  type CapturedRequestForExport,
} from "../../lib/export-service";

const sampleRequest: CapturedRequestForExport = {
  id: "r1",
  url: "https://api.example.com/v1/login",
  method: "POST",
  requestHeaders: {
    "Content-Type": "application/json",
    Authorization: "Bearer abc123",
    "X-API-Key": "sk-test-456",
    Cookie: "session=xyz",
    "X-Auth-Token": "tok-789",
  },
  requestBody: JSON.stringify({
    username: "alice",
    password: "hunter2",
    nested: { access_token: "deep-token", safe: "ok" },
  }),
  responseHeaders: { "Content-Type": "application/json" },
  responseBody: '{"ok":true}',
  statusCode: 200,
  statusText: "OK",
  contentType: "application/json",
  timing: { start: 0, end: 10, duration: 10 },
  resourceType: "xhr",
  size: 42,
  timestamp: 0,
};

const sampleResult: AuditResult = {
  url: "https://example.com",
  timestamp: 1717000000000,
  overallScore: 80,
  categories: {
    accessibility: { score: 90, issues: [] },
    performance: {
      score: 70,
      issues: [
        {
          severity: "critical",
          category: "performance",
          title: "Slow LCP",
          description: "LCP > 4s",
          selector: "main",
          suggestedFix: "Optimize hero image",
        },
      ],
    },
    seo: { score: 80, issues: [] },
    bestPractices: { score: 85, issues: [] },
    css: { score: 75, issues: [] },
  },
};

describe("export-service: report formats", () => {
  it("exportAsJSON returns valid JSON", () => {
    const out = exportAsJSON(sampleResult);
    expect(JSON.parse(out).overallScore).toBe(80);
  });

  it("exportAsHTML contains score and escaped url", () => {
    const out = exportAsHTML(sampleResult);
    expect(out).toContain("<!DOCTYPE html>");
    expect(out).toContain("https://example.com");
    expect(out).toContain("80</span>");
  });

  it("exportAsMarkdown has all categories", () => {
    const out = exportAsMarkdown(sampleResult);
    expect(out).toContain("# Full Audit Report");
    expect(out).toContain("## Accessibility — 90/100");
    expect(out).toContain("Slow LCP");
  });

  it("exportAsSARIF is valid JSON with sarif schema", () => {
    const out = exportAsSARIF(sampleResult);
    const parsed = JSON.parse(out);
    expect(parsed.$schema).toContain("sarif-schema-2.1.0");
    expect(parsed.runs[0].results).toHaveLength(1);
  });

  it("exportAsJUnit is well-formed xml", () => {
    const out = exportAsJUnit(sampleResult);
    expect(out).toContain('<?xml version="1.0"');
    expect(out).toContain("<testsuites");
    expect(out).toContain("Slow LCP");
  });
});

describe("export-service: header redaction", () => {
  it("redacts all sensitive header names", () => {
    const curl = exportAsCurl(sampleRequest);
    expect(curl).not.toContain("Bearer abc123");
    expect(curl).not.toContain("sk-test-456");
    expect(curl).not.toContain("session=xyz");
    expect(curl).not.toContain("tok-789");
    // Authorization, X-API-Key, Cookie, X-Auth-Token — and the body's nested
    // access_token also redacts to <redacted>, so total occurrences >= 4.
    const matches = curl.match(/<redacted>/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(4);
  });

  it("preserves non-sensitive headers", () => {
    const curl = exportAsCurl(sampleRequest);
    expect(curl).toContain("Content-Type: application/json");
  });

  it("matches *-token and *-secret suffixes", () => {
    const req: CapturedRequestForExport = {
      ...sampleRequest,
      requestHeaders: {
        "X-Bearer-Token": "tok",
        "Client-Secret": "sec",
        "Refresh-Token": "rt",
        "X-Safe-Header": "ok",
      },
    };
    const curl = exportAsCurl(req);
    expect(curl).not.toContain('"tok"');
    expect(curl).not.toContain('"sec"');
    expect(curl).not.toContain('"rt"');
    expect(curl).toContain("ok");
  });
});

describe("export-service: body redaction", () => {
  it("redacts JSON body sensitive fields at all depths", () => {
    const curl = exportAsCurl(sampleRequest);
    expect(curl).not.toContain("hunter2");
    expect(curl).not.toContain("deep-token");
    expect(curl).toContain("alice");
    expect(curl).toContain('"safe":"ok"');
  });

  it("redacts form-urlencoded bodies", () => {
    const req: CapturedRequestForExport = {
      ...sampleRequest,
      contentType: "application/x-www-form-urlencoded",
      requestBody: "username=alice&password=hunter2&token=secret",
    };
    const curl = exportAsCurl(req);
    expect(curl).not.toContain("hunter2");
    expect(curl).not.toContain("secret");
    expect(curl).toContain("username=alice");
  });

  it("leaves unknown content types untouched", () => {
    const req: CapturedRequestForExport = {
      ...sampleRequest,
      contentType: "text/plain",
      requestBody: "password=hunter2",
    };
    const curl = exportAsCurl(req);
    expect(curl).toContain("password=hunter2");
  });
});

describe("export-service: shell escaping", () => {
  const trickyUrl = "https://example.com/path?'q=it's";
  const req: CapturedRequestForExport = {
    ...sampleRequest,
    requestHeaders: {},
    requestBody: null,
    contentType: "",
    url: trickyUrl,
  };

  it("bash escaping uses single quotes with escaping", () => {
    const out = exportAsCurl(req, { shell: "bash" });
    // For input "?'q=it's", bash produces: '...?'\''q=it'\''s'
    expect(out).toContain("'https://example.com/path?'\\''q=it'\\''s'");
  });

  it("powershell escaping doubles single quotes", () => {
    const out = exportAsCurl(req, { shell: "powershell" });
    expect(out).toContain("'https://example.com/path?''q=it''s'");
  });

  it("cmd escaping escapes special chars", () => {
    const cmdReq: CapturedRequestForExport = {
      ...req,
      url: "https://example.com/p^ath|test",
    };
    const out = exportAsCurl(cmdReq, { shell: "cmd" });
    expect(out).toContain('"https://example.com/p^^ath^|test"');
  });
});

describe("export-service: fetch export", () => {
  it("adds credentials:include when original had cookies/auth", () => {
    const out = exportAsFetch(sampleRequest);
    expect(out).toContain('"credentials": "include"');
  });

  it("omits credentials when no auth/cookie headers", () => {
    const req: CapturedRequestForExport = {
      ...sampleRequest,
      requestHeaders: { "Content-Type": "application/json" },
    };
    const out = exportAsFetch(req);
    expect(out).not.toContain("credentials");
  });

  it("redacts body in fetch export", () => {
    const out = exportAsFetch(sampleRequest);
    expect(out).not.toContain("hunter2");
  });
});

describe("export-service: Postman v2.1 collection", () => {
  it("produces valid v2.1 schema", () => {
    const out = exportAsPostmanCollection([sampleRequest]);
    const parsed = JSON.parse(out);
    expect(parsed.info.schema).toContain("v2.1.0");
    expect(parsed.item).toHaveLength(1);
    expect(parsed.item[0].request.method).toBe("POST");
  });

  it("emits urlencoded mode for form bodies", () => {
    const req: CapturedRequestForExport = {
      ...sampleRequest,
      contentType: "application/x-www-form-urlencoded",
      requestBody: "name=alice&password=hunter2",
    };
    const out = exportAsPostmanCollection([req]);
    const parsed = JSON.parse(out);
    const body = parsed.item[0].request.body;
    expect(body.mode).toBe("urlencoded");
    expect(Array.isArray(body.urlencoded)).toBe(true);
    const pwd = body.urlencoded.find(
      (f: { key: string }) => f.key === "password",
    );
    expect(pwd.value).toBe("<redacted>");
  });

  it("emits raw mode with language hint for JSON", () => {
    const out = exportAsPostmanCollection([sampleRequest]);
    const parsed = JSON.parse(out);
    const body = parsed.item[0].request.body;
    expect(body.mode).toBe("raw");
    expect(body.options.raw.language).toBe("json");
    const raw = JSON.parse(body.raw);
    expect(raw.password).toBe("<redacted>");
  });

  it("redacts sensitive headers in collection", () => {
    const out = exportAsPostmanCollection([sampleRequest]);
    expect(out).not.toContain("Bearer abc123");
    expect(out).not.toContain("sk-test-456");
    expect(out).toContain("<redacted>");
  });
});
