import { expect, test } from "@playwright/test";

/**
 * Landing page smoke tests.
 *
 * Verifies the marketing page renders its critical sections without
 * throwing. Does not assert exact copy (copy changes frequently); instead
 * asserts that key landmarks exist and respond.
 */
test.describe("Landing page", () => {
  test("loads and renders hero", async ({ page }) => {
    await page.goto("/");
    // The hero is the first big text. We just want the page to render
    // SOMETHING meaningful, not 404 or a stack trace.
    await expect(page).toHaveTitle(/Frontend/i);
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("renders navigation", async ({ page }) => {
    await page.goto("/");
    // At least one anchor pointing at an auth route should be visible.
    const authLink = page
      .locator('a[href*="login"], a[href*="signup"]')
      .first();
    await expect(authLink).toBeVisible();
  });

  test("does not leak server errors to the client", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors, `Unexpected page errors: ${errors.join(", ")}`).toEqual([]);
  });
});

test.describe("SEO surface", () => {
  test("tool page ships JSON-LD structured data in static HTML", async ({
    page,
  }) => {
    // Request the raw HTML (no JS execution) — mirrors what crawlers see.
    const res = await page.request.get("/tools/css-inspector");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain('type="application/ld+json"');
    // The graph should describe the tool as a free software application.
    expect(html).toContain("SoftwareApplication");
    expect(html).toContain("FAQPage");
    expect(html).toContain("HowTo");
    expect(html).toContain("BreadcrumbList");
  });

  test("homepage ships Organization/WebSite/FAQ schema", async ({ page }) => {
    const res = await page.request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("Organization");
    expect(html).toContain("WebSite");
    expect(html).toContain("FAQPage");
  });

  test("tool page emits a canonical URL", async ({ page }) => {
    const res = await page.request.get("/tools/css-inspector");
    const html = await res.text();
    expect(html).toMatch(
      /<link[^>]+rel="canonical"[^>]+href="[^"]*\/tools\/css-inspector"/,
    );
  });

  test("llms.txt and llms-full.txt are served as text", async ({ page }) => {
    const llms = await page.request.get("/llms.txt");
    expect(llms.ok()).toBeTruthy();
    expect(llms.headers()["content-type"]).toContain("text/plain");
    expect(await llms.text()).toContain("# FrontendDevHelper");

    const full = await page.request.get("/llms-full.txt");
    expect(full.ok()).toBeTruthy();
    expect(await full.text()).toContain("## CSS Debugger");

    const wellKnown = await page.request.get("/.well-known/llms.txt");
    expect(wellKnown.ok()).toBeTruthy();
  });

  test("robots.txt allows AI crawlers and links the sitemap", async ({
    page,
  }) => {
    const res = await page.request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const txt = (await res.text()).toLowerCase();
    expect(txt).toContain("user-agent: gptbot");
    expect(txt).toContain("user-agent: perplexitybot");
    expect(txt).toContain("disallow: /api/");
    expect(txt).toContain("sitemap:");
  });

  test("sitemap.xml includes tools, blog, and comparisons", async ({
    page,
  }) => {
    const res = await page.request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const xml = await res.text();
    expect(xml).toContain("/tools/css-debugger");
    expect(xml).toContain("/blog/");
    expect(xml).toContain("/compare/");
  });

  test("blog index and post render", async ({ page }) => {
    await page.goto("/blog");
    await expect(page).toHaveTitle(/Blog/i);

    const res = await page.request.get("/blog/debug-flexbox-alignment-issues");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BlogPosting");
    expect(html).toContain("flexbox");
  });

  test("comparison pages render with table and schema", async ({ page }) => {
    const res = await page.request.get("/compare/pesticide-alternative");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("Pesticide");
    expect(html).toContain("BreadcrumbList");
    expect(html).toContain("The honest verdict");
  });
});
