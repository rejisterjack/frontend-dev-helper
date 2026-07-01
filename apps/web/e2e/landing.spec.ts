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
