import { expect, test } from "@playwright/test";

test.describe("404 handling", () => {
  test("unknown route renders the branded 404 page", async ({ page }) => {
    await page.goto("/this-route-does-not-exist");
    await expect(page.getByText("404")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /page not found/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /go home/i })).toBeVisible();
  });
});

test.describe("Health endpoint", () => {
  test("GET /api/health returns a JSON status", async ({ request }) => {
    const response = await request.get("/api/health");
    // In CI with no DB, this returns 503; locally with DB it returns 200.
    // Either way the endpoint should not 500/timeout.
    expect([200, 503]).toContain(response.status());
    const body = await response.json();
    expect(body).toHaveProperty("status");
  });
});
